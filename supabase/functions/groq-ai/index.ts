/**
 * Supabase Edge Function: groq-ai
 *
 * A secure proxy that forwards requests from the HealthPilot AI frontend
 * to the Groq API. The GROQ_API_KEY is stored as a Supabase secret and
 * NEVER exposed in the browser bundle.
 *
 * Endpoint (after deploy):
 *   POST https://<project-ref>.supabase.co/functions/v1/groq-ai
 *
 * Request body (JSON):
 *   {
 *     messages: GroqMessage[],   // OpenAI-compatible chat messages
 *     stream?: boolean,          // true for streaming (SSE)
 *     json_mode?: boolean        // true to force JSON output
 *   }
 *
 * The function adds:
 *   - Authorization header with the Groq API key (from Supabase secret)
 *   - CORS headers so the browser can call it
 *   - Rate-limit / error normalisation
 *
 * Deploy:
 *   supabase functions deploy groq-ai --no-verify-jwt
 *
 * Set secret:
 *   supabase secrets set GROQ_API_KEY=gsk_...yourkey...
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// ─── Config ───────────────────────────────────────────────────────────────────

const GROQ_MODEL    = 'llama-3.1-8b-instant';
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Allowed origins — add your production domain here
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://healthpilot.ai',          // ← replace with your real domain
];

// ─── CORS helpers ─────────────────────────────────────────────────────────────

function corsHeaders(origin: string): Record<string, string> {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin':  allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age':       '86400',
  };
}

// ─── Request validation ────────────────────────────────────────────────────────

interface RequestBody {
  messages:  { role: string; content: string }[];
  stream?:   boolean;
  json_mode?: boolean;
}

function validateBody(body: unknown): body is RequestBody {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  if (!Array.isArray(b.messages) || b.messages.length === 0) return false;
  for (const msg of b.messages as unknown[]) {
    if (
      typeof msg !== 'object' ||
      msg === null ||
      typeof (msg as Record<string, unknown>).role !== 'string' ||
      typeof (msg as Record<string, unknown>).content !== 'string'
    ) return false;
  }
  return true;
}

// ─── Error response helper ────────────────────────────────────────────────────

function errorResponse(
  status: number,
  message: string,
  origin: string,
): Response {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(origin),
      },
    },
  );
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  const origin = req.headers.get('origin') ?? '';

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(origin),
    });
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return errorResponse(405, 'Method not allowed. Use POST.', origin);
  }

  // Read API key from Supabase secret
  const apiKey = Deno.env.get('GROQ_API_KEY');
  if (!apiKey) {
    console.error('[groq-ai] GROQ_API_KEY secret is not set.');
    return errorResponse(500, 'AI service is not configured. Please contact support.', origin);
  }

  // Parse and validate request body
  let body: RequestBody;
  try {
    const raw = await req.json();
    if (!validateBody(raw)) {
      return errorResponse(400, 'Invalid request body. "messages" array is required.', origin);
    }
    body = raw;
  } catch {
    return errorResponse(400, 'Invalid JSON in request body.', origin);
  }

  // Build Groq request payload
  const groqPayload: Record<string, unknown> = {
    model:       GROQ_MODEL,
    messages:    body.messages,
    temperature: 0.4,
    max_tokens:  2048,
    top_p:       0.95,
    stream:      body.stream ?? false,
  };

  // Enable JSON object mode when requested (for report analysis)
  if (body.json_mode) {
    groqPayload.response_format = { type: 'json_object' };
  }

  // Forward request to Groq
  let groqRes: Response;
  try {
    groqRes = await fetch(GROQ_BASE_URL, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(groqPayload),
    });
  } catch (err) {
    console.error('[groq-ai] Network error reaching Groq:', err);
    return errorResponse(502, 'Could not reach Groq API. Please try again.', origin);
  }

  // Handle Groq error responses
  if (!groqRes.ok) {
    const errText = await groqRes.text().catch(() => groqRes.statusText);
    console.error(`[groq-ai] Groq error ${groqRes.status}:`, errText);

    let userMessage = `AI service error (${groqRes.status}).`;
    if (groqRes.status === 429) {
      const retryMatch = errText.match(/retry in ([\d\w\s]+)\./i);
      userMessage = `AI rate limit reached.${retryMatch ? ` Retry in ${retryMatch[1]}.` : ' Please wait a moment.'}`;
    } else if (groqRes.status === 401 || groqRes.status === 403) {
      userMessage = 'AI service authentication failed. Please contact support.';
    } else if (groqRes.status >= 500) {
      userMessage = 'Groq server error. Please try again shortly.';
    }

    return errorResponse(groqRes.status, userMessage, origin);
  }

  // ── Streaming response ──────────────────────────────────────────────────────
  if (body.stream) {
    // Pipe the SSE stream directly back to the client
    return new Response(groqRes.body, {
      status: 200,
      headers: {
        'Content-Type':      'text/event-stream',
        'Cache-Control':     'no-cache',
        'X-Accel-Buffering': 'no',
        ...corsHeaders(origin),
      },
    });
  }

  // ── Non-streaming response ──────────────────────────────────────────────────
  const data = await groqRes.json();
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin),
    },
  });
});

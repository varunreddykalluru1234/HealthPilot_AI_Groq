# HealthPilot AI

HealthPilot AI is a React + TypeScript + Vite application.

## Continue development in Antigravity

1. Open this folder (the folder containing `package.json`) in Antigravity.
2. Open a terminal in that folder.
3. Install dependencies with `npm.cmd install` on Windows PowerShell, or `npm install` in a terminal where npm is available.
4. Start the local development server with `npm.cmd run dev` (Windows PowerShell) or `npm run dev`.
5. To check the production build, run `npm.cmd run build` / `npm run build`.

## Supabase configuration

Authentication is implemented using Supabase. The client expects these Vite environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Create a local `.env` file in this folder if you want to connect your existing Supabase project. Do not commit `.env` or place a Supabase service-role key in frontend code. The app can be opened without Supabase configuration, but real sign-in and password-reset features will remain unavailable until configured.

## Important notes

- User data is currently handled by the app's client-side state/storage layer; review persistence and privacy behavior before using real medical records.
- AI/report features should be tested with real input before presenting their output as reliable. Treat health summaries as informational, not as diagnosis or medical advice.


## Groq AI setup

The app uses Groq for AI-powered chat, report analysis, and insights. The chat copilot, report analysis, and insights use the Groq-compatible chat completions API.

### Recommended for a live website (keeps the API key private)

1. Create a Groq API key at https://console.groq.com/keys.
2. In the Supabase project configured in `supabase/config.toml`, set the server-side secret:
   `supabase secrets set GROQ_API_KEY=your_groq_api_key`
3. Deploy the edge function from this project root:
   `supabase functions deploy groq-ai --no-verify-jwt`
4. In `supabase/functions/groq-ai/index.ts`, add your deployed website's exact origin to `ALLOWED_ORIGINS`.
5. Keep `VITE_GROQ_API_KEY` empty in the deployed website environment. The frontend will use the Supabase `groq-ai` function when `VITE_SUPABASE_URL` is configured.

### Local-only direct API testing

You can put `VITE_GROQ_API_KEY=your_groq_api_key` in your local `.env` for quick testing. **Do not deploy a `VITE_GROQ_API_KEY` value to a public website**: Vite embeds `VITE_` variables in browser code, making the key visible to visitors.

Copy `.env.example` to `.env` and fill in your Supabase URL and anon key. The `.env` file is intentionally not included in this package.

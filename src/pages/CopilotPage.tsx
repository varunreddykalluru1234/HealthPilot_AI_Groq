import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Brain, Send, Sparkles, MessageSquare, Info, Lightbulb,
  ChevronRight, Trash2, Zap, AlertCircle,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Badge } from '@/components/ui/Badge';
import { uid, formatDateTime } from '@/utils/helpers';
import { askHealthCopilot, type AIContext } from '@/services/aiService';
import {
  askGroqCopilotStream,
  isGroqAvailable,
  type GroqContext,
  type GroqHistoryMessage,
} from '@/services/groqService';
import type { ChatMessage } from '@/types';

const suggestedQuestions = [
  'Explain my latest report.',
  'What changed from my previous report?',
  'Summarize my health records.',
  'What should I discuss with my doctor?',
  'What reminders do I have?',
  'Summarize my recent health journey.',
];

function loadAiPrefs() {
  try {
    const stored = localStorage.getItem('hp-aiPrefs');
    return stored
      ? JSON.parse(stored)
      : { detailedExplanations: true, suggestedQuestions: true, generalInfo: true };
  } catch {
    return { detailedExplanations: true, suggestedQuestions: true, generalInfo: true };
  }
}

/** Convert stored ChatMessages to the Groq history format. */
function toGroqHistory(messages: ChatMessage[]): GroqHistoryMessage[] {
  return messages
    .filter((m) => m.content.trim())
    .map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));
}

export function CopilotPage() {
  const { state, dispatch, isDemo } = useApp();
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [groqError, setGroqError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const aiPrefs = loadAiPrefs();

  const groqEnabled = isGroqAvailable();
  const messages = state.conversations;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, streamingText]);

  // Cleanup on unmount
  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const handleSend = useCallback((question?: string) => {
    const q = question ?? input.trim();
    if (!q || isTyping) return;

    const userMsg: ChatMessage = {
      id: uid('msg-'),
      role: 'user',
      content: q,
      timestamp: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_CHAT_MESSAGE', message: userMsg });
    setInput('');
    setIsTyping(true);
    setStreamingText('');
    setGroqError(null);

    if (groqEnabled) {
      // ── Groq streaming path ──────────────────────────────────────────────
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      const groqCtx: GroqContext = {
        profile: state.profile,
        measurements: state.measurements,
        reports: state.reports,
        medications: state.medications,
        reminders: state.reminders,
        goals: state.goals,
      };

      // Build history from previous messages (exclude the one we just added)
      const history = toGroqHistory(messages);

      askGroqCopilotStream(
        q,
        history,
        groqCtx,
        // onChunk — update the temporary streaming display
        (chunk) => setStreamingText((prev) => prev + chunk),
        // onDone — commit the full message to state
        (full) => {
          const assistantMsg: ChatMessage = {
            id: uid('msg-'),
            role: 'assistant',
            content: full,
            basedOnData: ['Groq Llama 3.1 8B', 'Your health data'],
            timestamp: new Date().toISOString(),
          };
          dispatch({ type: 'ADD_CHAT_MESSAGE', message: assistantMsg });
          setStreamingText('');
          setIsTyping(false);
        },
        // onError — fall back to rule-based response
        (err) => {
          console.error('[Groq]', err);
          setGroqError(err.message);
          setStreamingText('');

          // Graceful fallback to local AI
          const context: AIContext = {
            profile: state.profile,
            measurements: state.measurements,
            reports: state.reports,
            medications: state.medications,
            reminders: state.reminders,
            goals: state.goals,
            isDemo,
          };
          const fallback = askHealthCopilot(q, context);
          const assistantMsg: ChatMessage = {
            id: uid('msg-'),
            role: 'assistant',
            content: fallback.content,
            basedOnData: fallback.basedOnData,
            generalInfo: fallback.generalInfo,
            suggestedQuestions: fallback.suggestedQuestions,
            timestamp: new Date().toISOString(),
          };
          dispatch({ type: 'ADD_CHAT_MESSAGE', message: assistantMsg });
          setIsTyping(false);
        },
        ctrl.signal,
      );
    } else {
      // ── Rule-based fallback (no API key) ───────────────────────────────────
      setTimeout(() => {
        const context: AIContext = {
          profile: state.profile,
          measurements: state.measurements,
          reports: state.reports,
          medications: state.medications,
          reminders: state.reminders,
          goals: state.goals,
          isDemo,
        };
        const response = askHealthCopilot(q, context);
        const assistantMsg: ChatMessage = {
          id: uid('msg-'),
          role: 'assistant',
          content: response.content,
          basedOnData: response.basedOnData,
          generalInfo: response.generalInfo,
          suggestedQuestions: response.suggestedQuestions,
          timestamp: new Date().toISOString(),
        };
        dispatch({ type: 'ADD_CHAT_MESSAGE', message: assistantMsg });
        setIsTyping(false);
      }, 800 + Math.random() * 600);
    }
  }, [input, isTyping, groqEnabled, messages, state, dispatch, isDemo]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    abortRef.current?.abort();
    setStreamingText('');
    setIsTyping(false);
    dispatch({ type: 'CLEAR_CONVERSATIONS' });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] lg:h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-navy-800">Your Health Copilot</h1>
            {groqEnabled ? (
              <Badge variant="teal" icon={<Zap className="w-3 h-3" />}>Groq AI</Badge>
            ) : (
              isDemo && <Badge variant="amber" icon={<Sparkles className="w-3 h-3" />}>Demo AI Mode</Badge>
            )}
          </div>
          {messages.length > 0 && (
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 text-xs text-navy-400 hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear conversation
            </button>
          )}
        </div>
        <p className="text-navy-400">
          {groqEnabled
            ? 'Powered by Groq (Llama 3.3 70B) — ask anything about your health information.'
            : 'Ask questions about your health information, understand your records, and stay organized.'}
        </p>
      </div>

      {/* Groq error notice */}
      {groqError && (
        <div className="flex items-start gap-2 p-3 mb-3 bg-amber-50 rounded-xl border border-amber-200">
          <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-amber-700">Groq AI unavailable — using local AI</p>
            <p className="text-xs text-amber-600 mt-0.5">{groqError}</p>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-card border border-slate-100 overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.length === 0 && !isTyping && (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mb-4">
                <Brain className="w-8 h-8" />
              </div>
              <h3 className="font-semibold text-navy-800 mb-2">
                {groqEnabled ? 'Groq AI — Ask me anything about your health' : 'Ask me anything about your health'}
              </h3>
              <p className="text-sm text-navy-400 max-w-md mb-6">
                {groqEnabled
                  ? 'I\'m powered by Groq (Llama 3.3 70B) and grounded in your actual health data. I can explain reports, spot trends, and suggest questions for your doctor.'
                  : 'I can explain your reports, summarize your records, track changes, and suggest questions for your doctor — all based on your actual data.'}
              </p>
              <div className="grid sm:grid-cols-2 gap-2 w-full max-w-lg">
                {suggestedQuestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSend(q)}
                    className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 text-sm text-navy-600 hover:border-teal-400 hover:bg-teal-50 hover:text-teal-700 transition-all text-left"
                  >
                    <MessageSquare className="w-4 h-4 text-teal-400 flex-shrink-0" />
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
            >
              <div className="max-w-[85%] sm:max-w-[75%]">
                {msg.role === 'user' ? (
                  <div className="bg-teal-600 text-white rounded-2xl rounded-tr-md px-4 py-3">
                    <p className="text-sm leading-relaxed whitespace-pre-line">{msg.content}</p>
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-2xl rounded-tl-md px-4 py-3 space-y-3">
                    <p className="text-sm text-navy-700 leading-relaxed whitespace-pre-line">{msg.content}</p>

                    {msg.basedOnData && msg.basedOnData.length > 0 && (
                      <div className="pt-2 border-t border-slate-200">
                        <p className="text-xs font-medium text-navy-400 mb-1.5">Based on your data:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.basedOnData.map((s, i) => <Badge key={i} variant="teal">{s}</Badge>)}
                        </div>
                      </div>
                    )}

                    {aiPrefs.generalInfo && msg.generalInfo && (
                      <div className="pt-2 border-t border-slate-200">
                        <p className="text-xs font-medium text-blue-600 mb-1 flex items-center gap-1">
                          <Info className="w-3 h-3" /> General information
                        </p>
                        <p className="text-xs text-navy-500 leading-relaxed">{msg.generalInfo}</p>
                      </div>
                    )}

                    {aiPrefs.suggestedQuestions && msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && (
                      <div className="pt-2 border-t border-slate-200">
                        <p className="text-xs font-medium text-amber-600 mb-1.5 flex items-center gap-1">
                          <Lightbulb className="w-3 h-3" /> Questions to discuss with your doctor
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.suggestedQuestions.map((q, i) => (
                            <button
                              key={i}
                              onClick={() => handleSend(q)}
                              disabled={isTyping}
                              className="flex items-start gap-1 text-xs text-navy-600 bg-white border border-slate-200 rounded-lg px-2 py-1 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 transition-all disabled:opacity-50 text-left"
                            >
                              <ChevronRight className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-navy-300">{formatDateTime(msg.timestamp)}</p>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Live streaming text */}
          {isTyping && streamingText && (
            <div className="flex justify-start animate-fade-in">
              <div className="max-w-[85%] sm:max-w-[75%] bg-slate-50 rounded-2xl rounded-tl-md px-4 py-3">
                <p className="text-sm text-navy-700 leading-relaxed whitespace-pre-line">{streamingText}</p>
                <span className="inline-block w-1.5 h-4 bg-teal-500 animate-pulse rounded-sm ml-0.5 align-middle" />
              </div>
            </div>
          )}

          {/* Typing indicator (before streaming starts) */}
          {isTyping && !streamingText && (
            <div className="flex justify-start animate-fade-in">
              <div className="bg-slate-50 rounded-2xl rounded-tl-md px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-teal-400 rounded-full animate-typing" style={{ animationDelay: '0s' }} />
                  <div className="w-2 h-2 bg-teal-400 rounded-full animate-typing" style={{ animationDelay: '0.2s' }} />
                  <div className="w-2 h-2 bg-teal-400 rounded-full animate-typing" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-slate-100 p-4">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={groqEnabled ? 'Ask Groq AI about your health...' : 'Ask about your health information...'}
              rows={1}
              className="flex-1 resize-none input-base max-h-32"
              style={{ minHeight: '44px' }}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isTyping}
              className="w-11 h-11 rounded-xl bg-teal-600 text-white flex items-center justify-center hover:bg-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-navy-300 mt-2 text-center">
            {groqEnabled
              ? 'HealthPilot AI (Groq) provides information based on your data. It does not replace professional medical advice.'
              : 'HealthPilot AI provides information based on your data. It does not replace professional medical advice.'}
          </p>
        </div>
      </div>
    </div>
  );
}

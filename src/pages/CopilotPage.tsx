import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Brain, Send, Sparkles, MessageSquare, Info, Lightbulb,
  ChevronRight, Trash2, Zap, AlertCircle, Copy, Check, User,
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
import { ChatMessageContent } from '@/components/chat/ChatMessageContent';

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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const aiPrefs = loadAiPrefs();

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

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
    <div className="flex flex-col h-[calc(100dvh-12rem)] sm:h-[calc(100dvh-9.5rem)] lg:h-[calc(100dvh-4.5rem)]">
      {/* Header */}
      <div className="mb-3 sm:mb-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-navy-800">Your Health Copilot</h1>
            {groqEnabled ? (
              <Badge variant="teal" icon={<Zap className="w-3 h-3" />}>Groq AI</Badge>
            ) : (
              isDemo && <Badge variant="amber" icon={<Sparkles className="w-3 h-3" />}>Demo AI Mode</Badge>
            )}
          </div>
          {messages.length > 0 && (
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 text-xs text-navy-400 hover:text-red-500 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear conversation
            </button>
          )}
        </div>
        <p className="text-xs sm:text-sm text-navy-400 line-clamp-2 sm:line-clamp-none">
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

      <div className="flex-1 min-h-0 flex flex-col bg-white rounded-2xl shadow-card border border-slate-100 overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-3 sm:space-y-4">
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
              className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center shadow-sm flex-shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </div>
              )}

              <div className="max-w-[88%] sm:max-w-[80%]">
                {msg.role === 'user' ? (
                  <div className="bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm">
                    <p className="text-[14.5px] leading-relaxed whitespace-pre-line font-medium">{msg.content}</p>
                    <p className="text-[10px] text-teal-200 mt-1 text-right">{formatDateTime(msg.timestamp)}</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl rounded-tl-sm p-4 sm:p-5 border border-slate-200/90 shadow-card space-y-3">
                    {/* Assistant Header & Copy */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <span className="font-heading font-semibold text-xs text-navy-900 tracking-tight">HealthPilot Copilot</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200/60 font-medium">
                          AI
                        </span>
                      </div>
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="flex items-center gap-1 text-[11px] font-medium text-navy-400 hover:text-teal-700 transition-colors px-2 py-0.5 rounded-md hover:bg-slate-50"
                        title="Copy response"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3 h-3 text-teal-600" />
                            <span className="text-teal-600">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Rich formatted message content */}
                    <ChatMessageContent content={msg.content} />

                    {msg.basedOnData && msg.basedOnData.length > 0 && (
                      <div className="pt-2.5 border-t border-slate-100">
                        <p className="text-xs font-semibold text-navy-500 mb-1.5">Based on your records:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.basedOnData.map((s, i) => <Badge key={i} variant="teal">{s}</Badge>)}
                        </div>
                      </div>
                    )}

                    {aiPrefs.generalInfo && msg.generalInfo && (
                      <div className="pt-2.5 border-t border-slate-100">
                        <p className="text-xs font-semibold text-blue-600 mb-1 flex items-center gap-1">
                          <Info className="w-3.5 h-3.5" /> General health information
                        </p>
                        <p className="text-xs text-navy-600 leading-relaxed bg-blue-50/60 p-2.5 rounded-xl border border-blue-100">
                          {msg.generalInfo}
                        </p>
                      </div>
                    )}

                    {aiPrefs.suggestedQuestions && msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && (
                      <div className="pt-2.5 border-t border-slate-100">
                        <p className="text-xs font-semibold text-amber-700 mb-1.5 flex items-center gap-1">
                          <Lightbulb className="w-3.5 h-3.5 text-amber-500" /> Questions to discuss with your doctor
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.suggestedQuestions.map((q, i) => (
                            <button
                              key={i}
                              onClick={() => handleSend(q)}
                              disabled={isTyping}
                              className="flex items-start gap-1.5 text-xs text-navy-700 bg-amber-50/40 border border-amber-200/80 rounded-xl px-2.5 py-1.5 hover:border-amber-400 hover:bg-amber-100/60 hover:text-amber-900 transition-all disabled:opacity-50 text-left"
                            >
                              <ChevronRight className="w-3 h-3 text-amber-600 flex-shrink-0 mt-0.5" />
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <p className="text-[11px] text-navy-400 pt-1">{formatDateTime(msg.timestamp)}</p>
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-slate-200 text-navy-700 flex items-center justify-center shadow-sm flex-shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {/* Live streaming text */}
          {isTyping && streamingText && (
            <div className="flex items-start gap-3 justify-start animate-fade-in">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center shadow-sm flex-shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="max-w-[88%] sm:max-w-[80%] bg-white rounded-2xl rounded-tl-sm p-4 sm:p-5 border border-teal-200 shadow-card space-y-2">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <span className="font-heading font-semibold text-xs text-navy-900">HealthPilot Copilot</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-teal-100 text-teal-800 font-medium animate-pulse">
                    Typing...
                  </span>
                </div>
                <div>
                  <ChatMessageContent content={streamingText} />
                  <span className="inline-block w-2 h-4 bg-teal-500 animate-pulse rounded-sm ml-1 align-middle" />
                </div>
              </div>
            </div>
          )}

          {/* Typing indicator (before streaming starts) */}
          {isTyping && !streamingText && (
            <div className="flex items-start gap-3 justify-start animate-fade-in">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center shadow-sm flex-shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 border border-slate-200/90 shadow-card">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                  <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                  <span className="text-xs text-navy-400 ml-2">Consulting your records...</span>
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

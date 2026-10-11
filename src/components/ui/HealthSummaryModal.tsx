import { useEffect } from 'react';
import {
  X,
  Brain,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  XCircle,
  Lightbulb,
  ListChecks,
  FileHeart,
  Info,
  Loader2,
  Sparkles,
} from 'lucide-react';
import type { PlainLanguageSummary } from '@/services/groqService';
import type { HealthRecord } from '@/types';
import { useLanguage } from '@/context/LanguageContext';

/* ─── Status helpers ─────────────────────────────────────────────────── */

type FindingStatus = PlainLanguageSummary['findings'][number]['status'];

function statusConfig(status: FindingStatus, T: (k: Parameters<typeof import('@/i18n/translations').t>[0]) => string) {
  switch (status) {
    case 'normal':
      return {
        icon: <CheckCircle2 className="w-4 h-4" />,
        bg: 'bg-emerald-50', border: 'border-emerald-200',
        icon_color: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700',
        label: T('status.normal'),
      };
    case 'slightly_off':
      return {
        icon: <AlertCircle className="w-4 h-4" />,
        bg: 'bg-amber-50', border: 'border-amber-200',
        icon_color: 'text-amber-500', badge: 'bg-amber-100 text-amber-700',
        label: T('status.slightly_off'),
      };
    case 'needs_attention':
      return {
        icon: <AlertTriangle className="w-4 h-4" />,
        bg: 'bg-orange-50', border: 'border-orange-200',
        icon_color: 'text-orange-500', badge: 'bg-orange-100 text-orange-700',
        label: T('status.needs_attention'),
      };
    case 'critical':
      return {
        icon: <XCircle className="w-4 h-4" />,
        bg: 'bg-red-50', border: 'border-red-200',
        icon_color: 'text-red-500', badge: 'bg-red-100 text-red-700',
        label: T('status.critical'),
      };
  }
}

/* ─── Skeleton loader ────────────────────────────────────────────────── */

function SkeletonLoader() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-100">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-teal-200 flex-shrink-0" />
          <div className="h-4 bg-teal-200 rounded-full w-2/3" />
        </div>
        <div className="h-3 bg-teal-100 rounded-full w-full mb-2" />
        <div className="h-3 bg-teal-100 rounded-full w-4/5" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 rounded-xl border border-slate-100 bg-slate-50">
            <div className="flex items-center justify-between mb-2">
              <div className="h-3.5 bg-slate-200 rounded-full w-1/3" />
              <div className="h-5 w-20 bg-slate-200 rounded-full" />
            </div>
            <div className="h-3 bg-slate-200 rounded-full w-full mb-1.5" />
            <div className="h-3 bg-slate-200 rounded-full w-3/4" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <div className="h-3.5 bg-slate-200 rounded-full w-1/4" />
        <div className="h-3 bg-slate-100 rounded-full w-full" />
        <div className="h-3 bg-slate-100 rounded-full w-5/6" />
        <div className="h-3 bg-slate-100 rounded-full w-4/5" />
      </div>
    </div>
  );
}

/* ─── Main Modal ─────────────────────────────────────────────────────── */

interface HealthSummaryModalProps {
  open: boolean;
  onClose: () => void;
  record: HealthRecord | null;
  summary: PlainLanguageSummary | null;
  loading: boolean;
  error: string | null;
}

export function HealthSummaryModal({
  open,
  onClose,
  record,
  summary,
  loading,
  error,
}: HealthSummaryModalProps) {
  const { T } = useLanguage();

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="AI Health Summary"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-navy-900/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative bg-white rounded-2xl shadow-card-lg w-full max-w-2xl max-h-[92vh] flex flex-col animate-slide-up overflow-hidden">

        {/* Header */}
        <div className="relative flex-shrink-0 px-5 pt-5 pb-4 border-b border-slate-100 bg-gradient-to-r from-teal-50 via-white to-cyan-50">
          <div className="flex items-start gap-3">
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-md">
                {loading
                  ? <Loader2 className="w-5 h-5 text-white animate-spin" />
                  : <Brain className="w-5 h-5 text-white" />
                }
              </div>
              {!loading && summary && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-white flex items-center justify-center">
                  <span className="w-1.5 h-1.5 bg-white rounded-full" />
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-navy-800">{T('ai.summaryTitle')}</h2>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-teal-600 bg-teal-100 px-2 py-0.5 rounded-full">
                  <Sparkles className="w-2.5 h-2.5" /> {T('ai.plainLanguage')}
                </span>
              </div>
              {record && (
                <p className="text-xs text-navy-400 mt-0.5 truncate">{record.title}</p>
              )}
            </div>

            <button
              onClick={onClose}
              className="flex-shrink-0 text-navy-300 hover:text-navy-600 hover:bg-slate-100 rounded-lg p-1.5 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {loading && (
            <p className="mt-2 text-xs text-teal-600 flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" />
              {T('ai.generating')}
            </p>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {loading && <SkeletonLoader />}

          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
                <AlertCircle className="w-7 h-7 text-red-400" />
              </div>
              <p className="font-semibold text-navy-700">{T('ai.failedSummary')}</p>
              <p className="text-sm text-navy-400 max-w-sm">{error}</p>
            </div>
          )}

          {!loading && summary && (
            <div className="space-y-5">

              {/* Headline card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-100">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FileHeart className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-teal-800 leading-snug">{summary.headline}</p>
                    {summary.whatIsThis && (
                      <p className="text-xs text-teal-600 mt-1">{summary.whatIsThis}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Findings */}
              {summary.findings.length > 0 && (
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-navy-400 mb-3 flex items-center gap-1.5">
                    <ListChecks className="w-3.5 h-3.5" /> {T('ai.yourResults')}
                  </h3>
                  <div className="space-y-3">
                    {summary.findings.map((f, i) => {
                      const cfg = statusConfig(f.status, T);
                      return (
                        <div
                          key={i}
                          className={`p-4 rounded-xl border ${cfg.bg} ${cfg.border} transition-all`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`flex-shrink-0 ${cfg.icon_color}`}>{cfg.icon}</span>
                              <span className="font-semibold text-navy-800 text-sm truncate">{f.name}</span>
                              <span className="text-xs text-navy-500 font-mono flex-shrink-0">{f.value}</span>
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full flex-shrink-0 ${cfg.badge}`}>
                              {cfg.label}
                            </span>
                          </div>

                          <p className="text-sm text-navy-700 leading-relaxed">{f.plainExplanation}</p>

                          {f.tip && (
                            <div className="mt-2.5 flex items-start gap-2 p-2.5 rounded-lg bg-white/70 border border-white">
                              <Lightbulb className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                              <p className="text-xs text-navy-600">{f.tip}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Overall summary */}
              {summary.overallSummary && (
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-navy-400 mb-2 flex items-center gap-1.5">
                    <Brain className="w-3.5 h-3.5" /> {T('ai.overallPicture')}
                  </h3>
                  <p className="text-sm text-navy-700 leading-relaxed bg-slate-50 rounded-xl p-4 border border-slate-100">
                    {summary.overallSummary}
                  </p>
                </section>
              )}

              {/* Next steps */}
              {summary.nextSteps.length > 0 && (
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-navy-400 mb-2 flex items-center gap-1.5">
                    <ListChecks className="w-3.5 h-3.5" /> {T('ai.nextSteps')}
                  </h3>
                  <ol className="space-y-2">
                    {summary.nextSteps.map((step, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-teal-100 text-teal-700 text-[10px] font-bold flex items-center justify-center mt-0.5">
                          {i + 1}
                        </span>
                        <p className="text-sm text-navy-700 leading-relaxed">{step}</p>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              {/* Disclaimer */}
              <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 border border-blue-100">
                <Info className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 leading-relaxed">{summary.disclaimer}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-5 py-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3">
          <p className="text-[10px] text-navy-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-teal-400" />
            {T('ai.poweredBy')} · {T('ai.notMedicalAdvice')}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 rounded-xl transition-all shadow-sm hover:shadow-md active:scale-95"
          >
            {T('ai.gotIt')}
          </button>
        </div>
      </div>
    </div>
  );
}

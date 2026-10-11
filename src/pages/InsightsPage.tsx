import { useMemo, useState } from 'react';
import { Lightbulb, TrendingUp, FileText, Target, Bell, Stethoscope, AlertCircle, ChevronRight, Sparkles, Info } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useRouter } from '@/context/RouterContext';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate } from '@/utils/helpers';
import type { InsightCategory, InsightPriority, AIInsight } from '@/types';

const categoryConfig: Record<InsightCategory, { icon: typeof TrendingUp; label: string; variant: 'teal' | 'blue' | 'amber' | 'red' | 'navy' | 'slate' }> = {
  trend: { icon: TrendingUp, label: 'Trend', variant: 'teal' },
  record: { icon: FileText, label: 'Record', variant: 'blue' },
  goal: { icon: Target, label: 'Goal', variant: 'navy' },
  reminder: { icon: Bell, label: 'Reminder', variant: 'amber' },
  doctor_question: { icon: Stethoscope, label: 'Doctor Question', variant: 'slate' },
  missing_info: { icon: AlertCircle, label: 'Missing Info', variant: 'slate' },
};

const priorityConfig: Record<InsightPriority, { label: string; variant: 'red' | 'amber' | 'slate' }> = {
  high: { label: 'High Priority', variant: 'red' },
  medium: { label: 'Medium Priority', variant: 'amber' },
  low: { label: 'Low Priority', variant: 'slate' },
};

const filterOptions: { key: InsightCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'All Insights' },
  { key: 'trend', label: 'Trends' },
  { key: 'record', label: 'Records' },
  { key: 'goal', label: 'Goals' },
  { key: 'reminder', label: 'Reminders' },
  { key: 'doctor_question', label: 'Questions for Doctor' },
  { key: 'missing_info', label: 'Missing Information' },
];

export function InsightsPage() {
  const { state, isDemo } = useApp();
  const { navigate, navigateWithParams } = useRouter();
  const [activeFilter, setActiveFilter] = useState<InsightCategory | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const insights = useMemo(() => {
    let items = [...state.insights].sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
    if (activeFilter !== 'all') items = items.filter((i) => i.category === activeFilter);
    return items;
  }, [state.insights, activeFilter]);

  const handleInsightClick = (insight: AIInsight) => {
    setExpandedId(expandedId === insight.id ? null : insight.id);
  };

  const handleViewRecord = (insight: AIInsight) => {
    if (insight.relatedRecordId) {
      const isReport = state.reports.some((r) => r.id === insight.relatedRecordId);
      if (isReport) {
        navigateWithParams('report-analysis', { reportId: insight.relatedRecordId });
      } else {
        navigate('records');
      }
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Health Insights"
        subtitle="AI-generated insights based on your actual health data"
        icon={<Lightbulb className="w-5 h-5" />}
      />

      {isDemo && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <p className="text-sm text-amber-700">These insights are generated from demo data. When you add your own health information, insights will be based on your actual data.</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {filterOptions.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setActiveFilter(opt.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${activeFilter === opt.key ? 'bg-teal-600 text-white' : 'bg-white border border-slate-200 text-navy-500 hover:border-teal-300'}`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {insights.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Lightbulb className="w-8 h-8" />}
            title="No insights yet"
            description="Add health information, upload reports, and record measurements to receive personalized AI insights based on your data."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {insights.map((insight) => {
            const config = categoryConfig[insight.category];
            const prioConfig = priorityConfig[insight.priority];
            const Icon = config.icon;
            const isExpanded = expandedId === insight.id;
            return (
              <Card key={insight.id} hover onClick={() => handleInsightClick(insight)} className="p-5">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    insight.priority === 'high' ? 'bg-red-50 text-red-600' : insight.priority === 'medium' ? 'bg-amber-50 text-amber-600' : 'bg-teal-50 text-teal-600'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-navy-800 text-sm">{insight.title}</h3>
                    </div>
                    <p className={`text-sm text-navy-600 leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>{insight.explanation}</p>

                    {isExpanded && (
                      <div className="mt-4 space-y-3 animate-fade-in">
                        {/* Data sources */}
                        <div className="pt-3 border-t border-slate-100">
                          <p className="text-xs font-medium text-navy-400 mb-1.5 flex items-center gap-1"><Info className="w-3 h-3" /> Based on:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {insight.sourceData.map((s, i) => <Badge key={i} variant="teal">{s}</Badge>)}
                          </div>
                        </div>

                        {/* Date */}
                        <p className="text-xs text-navy-300">Generated on {formatDate(insight.date)}</p>

                        {/* View related record */}
                        {insight.relatedRecordId && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleViewRecord(insight); }}
                            className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium"
                          >
                            <ChevronRight className="w-3.5 h-3.5" /> View underlying record
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <Badge variant={config.variant}>{config.label}</Badge>
                    <Badge variant={prioConfig.variant}>{prioConfig.label}</Badge>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

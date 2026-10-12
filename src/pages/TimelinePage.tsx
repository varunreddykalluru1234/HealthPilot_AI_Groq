import { useState, useMemo } from 'react';
import { Clock, FileText, Pill, Calendar, Activity, Target, FolderOpen, Filter, X, Sparkles } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDateTime } from '@/utils/helpers';
import type { TimelineCategory } from '@/types';

const categoryConfig: Record<TimelineCategory, { icon: typeof Clock; color: string; bg: string; label: string }> = {
  report: { icon: FileText, color: 'text-teal-600', bg: 'bg-teal-50', label: 'Report' },
  medication: { icon: Pill, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Medication' },
  appointment: { icon: Calendar, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Appointment' },
  measurement: { icon: Activity, color: 'text-teal-600', bg: 'bg-teal-50', label: 'Measurement' },
  goal: { icon: Target, color: 'text-purple-600', bg: 'bg-purple-50', label: 'Goal' },
  record: { icon: FolderOpen, color: 'text-navy-600', bg: 'bg-navy-50', label: 'Record' },
};

const filterOptions: { key: TimelineCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'All Events' },
  { key: 'report', label: 'Reports' },
  { key: 'medication', label: 'Medications' },
  { key: 'appointment', label: 'Appointments' },
  { key: 'measurement', label: 'Measurements' },
  { key: 'goal', label: 'Goals' },
  { key: 'record', label: 'Records' },
];

export function TimelinePage() {
  const { state } = useApp();
  const [activeFilter, setActiveFilter] = useState<TimelineCategory | 'all'>('all');

  const filteredTimeline = useMemo(() => {
    let events = [...state.timeline].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (activeFilter !== 'all') events = events.filter((e) => e.category === activeFilter);
    return events;
  }, [state.timeline, activeFilter]);

  // Group by date
  const grouped = useMemo(() => {
    const groups: Record<string, typeof filteredTimeline> = {};
    for (const event of filteredTimeline) {
      const dateKey = new Date(event.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(event);
    }
    return groups;
  }, [filteredTimeline]);

  return (
    <div className="space-y-6">
      <PageHeader title="Health Timeline" subtitle="Your complete healthcare journey in chronological order" icon={<Clock className="w-5 h-5" />} />

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-navy-400 flex-shrink-0" />
        {filterOptions.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setActiveFilter(opt.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${activeFilter === opt.key ? 'bg-teal-600 text-white' : 'bg-white border border-slate-200 text-navy-500 hover:border-teal-300'}`}
          >
            {opt.label}
          </button>
        ))}
        {activeFilter !== 'all' && (
          <button onClick={() => setActiveFilter('all')} className="flex items-center gap-1 text-xs text-navy-400 hover:text-navy-600 ml-1">
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {filteredTimeline.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Clock className="w-8 h-8" />}
            title="No timeline events yet"
            description="Your healthcare journey will appear here as you add health information, upload reports, record measurements, and create goals."
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([dateLabel, events]) => (
            <div key={dateLabel}>
              <h3 className="text-sm font-semibold text-navy-400 uppercase tracking-wider mb-3 sticky top-0 bg-slate-50 py-1">{dateLabel}</h3>
              <Card>
                <CardBody className="space-y-1">
                  {events.map((event) => {
                    const config = categoryConfig[event.category];
                    const Icon = config.icon;
                    return (
                      <div key={event.id} className="flex items-start gap-4 py-3 border-b border-slate-50 last:border-0">
                        <div className={`w-10 h-10 rounded-xl ${config.bg} ${config.color} flex items-center justify-center flex-shrink-0`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-navy-700">{event.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="slate">{config.label}</Badge>
                            <span className="text-xs text-navy-300">{formatDateTime(event.date)}</span>
                            {event.source === 'demo' && <Badge variant="amber" icon={<Sparkles className="w-3 h-3" />}>Demo</Badge>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardBody>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

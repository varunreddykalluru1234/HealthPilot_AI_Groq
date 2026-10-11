import { type ReactNode } from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-navy-300 mb-4">
        {icon || <Inbox className="w-8 h-8" />}
      </div>
      <h3 className="font-semibold text-navy-700 mb-1">{title}</h3>
      {description && <p className="text-sm text-navy-400 max-w-sm mb-4">{description}</p>}
      {action}
    </div>
  );
}

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`animate-pulse-soft bg-slate-200 rounded ${className}`} />;
}

import { type ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function PageHeader({ title, subtitle, icon, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-navy-800 tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-navy-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}

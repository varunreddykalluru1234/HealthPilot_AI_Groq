import { type ReactNode } from 'react';

type BadgeVariant = 'teal' | 'blue' | 'amber' | 'red' | 'navy' | 'slate' | 'purple' | 'indigo' | 'green' | 'rose';

const variants: Record<BadgeVariant, string> = {
  teal:   'bg-teal-50 text-teal-700 border-teal-100',
  blue:   'bg-blue-50 text-blue-700 border-blue-100',
  amber:  'bg-amber-50 text-amber-700 border-amber-100',
  red:    'bg-red-50 text-red-700 border-red-100',
  navy:   'bg-navy-50 text-navy-600 border-navy-100',
  slate:  'bg-slate-100 text-slate-600 border-slate-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-100',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  green:  'bg-green-50 text-green-700 border-green-100',
  rose:   'bg-rose-50 text-rose-700 border-rose-100',
};

export function Badge({ variant = 'slate', children, icon }: { variant?: BadgeVariant; children: ReactNode; icon?: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${variants[variant]}`}>
      {icon}
      {children}
    </span>
  );
}

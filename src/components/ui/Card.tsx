import { type ReactNode, type HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function Card({ children, className = '', hover, onClick, ...rest }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`card ${hover ? 'card-hover' : ''} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, icon, action }: { title: string; subtitle?: string; icon?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between p-5 border-b border-slate-100">
      <div className="flex items-center gap-3">
        {icon && <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">{icon}</div>}
        <div>
          <h3 className="font-semibold text-navy-800">{title}</h3>
          {subtitle && <p className="text-sm text-navy-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function CardBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`p-5 ${className}`}>{children}</div>;
}

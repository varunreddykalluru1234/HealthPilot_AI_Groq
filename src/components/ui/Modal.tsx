import { type ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: ReactNode;
}

const sizes = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function Modal({ open, onClose, title, subtitle, children, size = 'md', footer }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-navy-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-card-lg w-full ${sizes[size]} max-h-[92dvh] flex flex-col animate-slide-up`}>
        <div className="flex items-start justify-between p-4 sm:p-5 border-b border-slate-100 flex-shrink-0">
          <div className="min-w-0 pr-2">
            <h2 className="text-base sm:text-lg font-semibold text-navy-800">{title}</h2>
            {subtitle && <p className="text-xs sm:text-sm text-navy-400 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="text-navy-300 hover:text-navy-500 hover:bg-slate-100 rounded-lg p-1.5 transition-colors cursor-pointer flex-shrink-0" aria-label="Close dialog">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-4 sm:p-5">{children}</div>
        {footer && <div className="p-4 sm:p-5 border-t border-slate-100 flex flex-wrap justify-end gap-2 sm:gap-3 flex-shrink-0">{footer}</div>}
      </div>
    </div>
  );
}

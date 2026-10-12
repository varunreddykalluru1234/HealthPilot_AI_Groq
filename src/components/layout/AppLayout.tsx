import { useState, type ReactNode } from 'react';
import { Sidebar, MobileSidebar, MobileTopBar, MobileBottomNav } from '@/components/layout/Sidebar';

interface AppLayoutProps {
  children: ReactNode;
  onGoHome?: () => void;
}

export function AppLayout({ children, onGoHome }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen h-[100dvh] overflow-hidden bg-slate-50">
      <div className="hidden lg:block flex-shrink-0">
        <Sidebar onGoHome={onGoHome} />
      </div>
      <MobileSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onGoHome={onGoHome} />
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <MobileTopBar onMenuClick={() => setSidebarOpen(true)} onGoHome={onGoHome} />
        <main className="flex-1 overflow-y-auto pb-24 lg:pb-0">
          <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 animate-fade-in">
            {children}
          </div>
        </main>
        <MobileBottomNav onOpenMenu={() => setSidebarOpen(true)} />
      </div>
    </div>
  );
}

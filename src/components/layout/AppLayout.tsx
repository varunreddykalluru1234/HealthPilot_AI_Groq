import { useState, type ReactNode } from 'react';
import { Sidebar, MobileSidebar, MobileTopBar } from '@/components/layout/Sidebar';

interface AppLayoutProps {
  children: ReactNode;
  onGoHome?: () => void;
}

export function AppLayout({ children, onGoHome }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <div className="hidden lg:block flex-shrink-0">
        <Sidebar onGoHome={onGoHome} />
      </div>
      <MobileSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onGoHome={onGoHome} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <MobileTopBar onMenuClick={() => setSidebarOpen(true)} onGoHome={onGoHome} />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

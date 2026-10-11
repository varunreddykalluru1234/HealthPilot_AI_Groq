import { createContext, useContext, useState, type ReactNode } from 'react';
import type { PageKey } from '@/config/navigation';

interface RouterContextValue {
  page: PageKey;
  navigate: (page: PageKey) => void;
  params: Record<string, string>;
  navigateWithParams: (page: PageKey, params?: Record<string, string>) => void;
}

const RouterContext = createContext<RouterContextValue | null>(null);

export function RouterProvider({ children }: { children: ReactNode }) {
  const [page, setPage] = useState<PageKey>('dashboard');
  const [params, setParams] = useState<Record<string, string>>({});

  const navigate = (p: PageKey) => {
    setPage(p);
    setParams({});
    window.scrollTo(0, 0);
  };

  const navigateWithParams = (p: PageKey, prm: Record<string, string> = {}) => {
    setPage(p);
    setParams(prm);
    window.scrollTo(0, 0);
  };

  return <RouterContext.Provider value={{ page, navigate, params, navigateWithParams }}>{children}</RouterContext.Provider>;
}

export function useRouter(): RouterContextValue {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used within RouterProvider');
  return ctx;
}

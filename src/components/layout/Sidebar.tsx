import { useState } from 'react';
import { Activity, Menu, X, LogOut, Sparkles, Globe, ChevronDown } from 'lucide-react';
import { navItems, type PageKey } from '@/config/navigation';
import { useRouter } from '@/context/RouterContext';
import { useApp } from '@/context/AppContext';
import { NavIcon } from '@/components/NavIcon';
import { Badge } from '@/components/ui/Badge';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/context/LanguageContext';
import { LANGUAGES, type TranslationKey } from '@/i18n/translations';

interface SidebarProps {
  onNavigate?: () => void;
  onGoHome?: () => void;
}

export function Sidebar({ onNavigate, onGoHome }: SidebarProps) {
  const { page, navigate } = useRouter();
  const { state, dispatch, isDemo } = useApp();
  const { uiLang, setUiLang, T } = useLanguage();
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const currentLang = LANGUAGES.find((l) => l.code === uiLang) ?? LANGUAGES[0];

  const getNavLabel = (item: (typeof navItems)[number]) => {
    const map: Record<string, TranslationKey> = {
      dashboard: 'nav.dashboard',
      copilot: 'nav.copilot',
      profile: 'nav.profile',
      records: 'nav.records',
      abha: 'nav.abha',
      reports: 'nav.reports',
      'report-analysis': 'nav.reportAnalysis',
      'report-comparison': 'nav.reportComparison',
      timeline: 'nav.timeline',
      medications: 'nav.medications',
      reminders: 'nav.reminders',
      goals: 'nav.goals',
      insights: 'nav.insights',
      settings: 'nav.settings',
      privacy: 'nav.privacy',
    };
    return map[item.key] ? T(map[item.key]) : item.label;
  };

  const handleNav = (key: PageKey) => {
    navigate(key);
    onNavigate?.();
  };

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    dispatch({ type: 'LOGOUT' });
    onGoHome?.();
  };

  return (
    <div className="flex flex-col h-full w-64 bg-white border-r border-slate-200/80 flex-shrink-0 shadow-sm">
      <button
        onClick={onGoHome}
        className="flex items-center gap-3 px-5 py-5 border-b border-slate-100 text-left hover:bg-slate-50/70 transition-colors w-full group cursor-pointer"
        title="Go to Homepage"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-teal-600/20 group-hover:scale-105 transition-transform">
          <Activity className="w-5 h-5 text-white stroke-[2.5]" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="font-heading font-extrabold text-navy-900 text-base leading-tight">HealthPilot</h1>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200/60">AI</span>
          </div>
          <p className="text-[11px] text-navy-400 font-medium">Personal Health Copilot</p>
        </div>
      </button>

      <div className="px-3 pt-3 flex items-center gap-2">
        {/* Demo Mode Badge */}
        {isDemo && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              <Sparkles className="w-3 h-3 text-amber-500" />
              Demo
            </span>
            {onGoHome && (
              <button
                onClick={onGoHome}
                className="text-[11px] text-teal-700 hover:text-teal-800 font-medium bg-teal-50 hover:bg-teal-100 px-2.5 py-0.5 rounded-full transition-colors whitespace-nowrap cursor-pointer"
                title="Return to Homepage"
              >
                Homepage
              </button>
            )}
          </div>
        )}

        {/* Quick Language Switcher Dropdown */}
        <div className="relative flex-1">
          <button
            onClick={() => setLangMenuOpen(!langMenuOpen)}
            className="w-full flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200/80 text-xs text-navy-700 hover:bg-slate-50 transition-all cursor-pointer"
            title={T('common.language')}
          >
            <span className="flex items-center gap-1.5 truncate">
              <span>{currentLang.flag}</span>
              <span className="font-medium truncate">{currentLang.nativeName}</span>
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-navy-400 transition-transform ${langMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {langMenuOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setLangMenuOpen(false)} />
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1 overflow-hidden animate-fade-in">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => {
                      setUiLang(l.code);
                      setLangMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors cursor-pointer ${
                      uiLang === l.code
                        ? 'bg-teal-50 text-teal-700 font-semibold'
                        : 'text-navy-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{l.flag}</span>
                    <span className="flex-1 truncate">{l.nativeName}</span>
                    <span className="text-[10px] text-navy-400">{l.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = page === item.key;
          return (
            <button
              key={item.key}
              onClick={() => handleNav(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-teal-50 to-teal-50/40 text-teal-800 font-semibold shadow-sm border border-teal-100'
                  : 'text-navy-600 hover:bg-slate-50 hover:text-navy-900'
              }`}
            >
              <NavIcon name={item.icon} className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${isActive ? 'text-teal-600' : 'text-navy-400'}`} />
              <span className="truncate flex-1 text-left">{getNavLabel(item)}</span>
              {isActive && <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shadow-sm shadow-teal-500/50" />}
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-100 bg-slate-50/40">
        <button
          onClick={() => handleNav('profile')}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-teal-300 hover:shadow-sm transition-all mb-2 text-left group cursor-pointer"
          title="View & Edit Profile"
        >
          <UserAvatar
            name={state.profile?.fullName ?? 'User'}
            avatarUrl={state.profile?.avatarUrl}
            size="sm"
            showStatus={true}
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-navy-900 group-hover:text-teal-700 transition-colors truncate">
              {state.profile?.fullName ?? 'User'}
            </p>
            <p className="text-[10px] text-navy-400 truncate">{state.profile?.email ?? 'health@user.com'}</p>
          </div>
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-navy-500 hover:bg-rose-50 hover:text-rose-600 transition-all duration-200 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          {T('nav.signOut')}
        </button>
      </div>
    </div>
  );
}

export function MobileSidebar({ open, onClose, onGoHome }: { open: boolean; onClose: () => void; onGoHome?: () => void }) {
  if (!open) return null;
  return (
    <div className="lg:hidden fixed inset-0 z-40">
      <div className="absolute inset-0 bg-navy-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute left-0 top-0 bottom-0 animate-slide-in-right">
        <Sidebar onNavigate={onClose} onGoHome={() => { onClose(); onGoHome?.(); }} />
      </div>
    </div>
  );
}

export function MobileTopBar({ onMenuClick, onGoHome }: { onMenuClick: () => void; onGoHome?: () => void }) {
  const { uiLang, setUiLang } = useLanguage();
  const currentLang = LANGUAGES.find((l) => l.code === uiLang) ?? LANGUAGES[0];
  const [langOpen, setLangOpen] = useState(false);

  return (
    <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 sticky top-0 z-30">
      <button onClick={onGoHome} className="flex items-center gap-2 text-left cursor-pointer hover:opacity-80 transition-opacity">
        <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
          <Activity className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-navy-800">HealthPilot</span>
      </button>
      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            onClick={() => setLangOpen(!langOpen)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 text-xs text-navy-700 bg-slate-50"
          >
            <span>{currentLang.flag}</span>
            <span className="text-[11px] font-medium">{currentLang.name.substring(0, 3)}</span>
          </button>
          {langOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setLangOpen(false)} />
              <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-40 py-1 min-w-[140px]">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => {
                      setUiLang(l.code);
                      setLangOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left ${
                      uiLang === l.code ? 'bg-teal-50 text-teal-700 font-semibold' : 'text-navy-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{l.flag}</span>
                    <span>{l.nativeName}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <button onClick={onMenuClick} className="p-2 rounded-lg hover:bg-slate-100">
          <Menu className="w-5 h-5 text-navy-600" />
        </button>
      </div>
    </div>
  );
}

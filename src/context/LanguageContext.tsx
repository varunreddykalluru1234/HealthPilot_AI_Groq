/**
 * LanguageContext.tsx
 *
 * Provides three language settings across the whole app:
 *   - uiLang       : the language used for the interface (labels, buttons, etc.)
 *   - summaryLang  : the language AI summaries are generated in
 *   - ocrLang      : Tesseract language code used when scanning prescriptions
 *
 * All three are persisted to localStorage independently so the user's
 * choices survive page reloads.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import {
  type LangCode,
  type TranslationKey,
  t as rawT,
  getLangMeta,
  LANGUAGES,
} from '@/i18n/translations';

// ─── Storage keys ─────────────────────────────────────────────────────────────

const KEY_UI_LANG      = 'hp-ui-lang';
const KEY_SUMMARY_LANG = 'hp-summary-lang';
const KEY_OCR_LANG     = 'hp-ocr-lang';

function loadLang(key: string, fallback: LangCode): LangCode {
  try {
    const stored = localStorage.getItem(key) as LangCode | null;
    return stored && LANGUAGES.some((l) => l.code === stored) ? stored : fallback;
  } catch {
    return fallback;
  }
}

// ─── Context shape ────────────────────────────────────────────────────────────

interface LanguageContextValue {
  /** Currently active interface language */
  uiLang: LangCode;
  /** Language in which AI summaries are generated */
  summaryLang: LangCode;
  /** Tesseract OCR language string (e.g. "eng+hin") */
  ocrLangCode: string;
  /** Change the interface language */
  setUiLang: (lang: LangCode) => void;
  /** Change the AI summary language */
  setSummaryLang: (lang: LangCode) => void;
  /** Change the OCR language (full LangCode) */
  setOcrLang: (lang: LangCode) => void;
  /** Shorthand translation function pre-bound to the current uiLang */
  T: (key: TranslationKey) => string;
  /** The currently stored OCR language code as a LangCode */
  ocrLang: LangCode;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function applyFullPageTranslation(lang: LangCode) {
  try {
    const val = lang === 'en' ? '/en/en' : `/en/${lang}`;
    document.cookie = `googtrans=${val}; path=/;`;
    if (window.location.hostname) {
      document.cookie = `googtrans=${val}; path=/; domain=${window.location.hostname};`;
      document.cookie = `googtrans=${val}; path=/; domain=.${window.location.hostname};`;
    }

    const triggerSelect = () => {
      const select = document.querySelector('.goog-te-combo') as HTMLSelectElement | null;
      if (select) {
        select.value = lang;
        select.dispatchEvent(new Event('change'));
        return true;
      }
      return false;
    };

    if (!triggerSelect()) {
      setTimeout(triggerSelect, 300);
      setTimeout(triggerSelect, 800);
      setTimeout(triggerSelect, 1500);
    }
  } catch (err) {
    console.warn('[LanguageContext] Full page translation trigger:', err);
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [uiLang, setUiLangState] = useState<LangCode>(() => loadLang(KEY_UI_LANG, 'en'));
  const [summaryLang, setSummaryLangState] = useState<LangCode>(() => loadLang(KEY_SUMMARY_LANG, 'en'));
  const [ocrLang, setOcrLangState] = useState<LangCode>(() => loadLang(KEY_OCR_LANG, 'en'));

  useEffect(() => {
    if (uiLang !== 'en') {
      applyFullPageTranslation(uiLang);
    }
  }, [uiLang]);

  const setUiLang = useCallback((lang: LangCode) => {
    setUiLangState(lang);
    try {
      localStorage.setItem(KEY_UI_LANG, lang);
    } catch {
      // ignore
    }
    // Update <html lang> attribute for accessibility
    document.documentElement.lang = lang;
    applyFullPageTranslation(lang);
  }, []);

  const setSummaryLang = useCallback((lang: LangCode) => {
    setSummaryLangState(lang);
    localStorage.setItem(KEY_SUMMARY_LANG, lang);
  }, []);

  const setOcrLang = useCallback((lang: LangCode) => {
    setOcrLangState(lang);
    localStorage.setItem(KEY_OCR_LANG, lang);
  }, []);

  const T = useCallback(
    (key: TranslationKey) => rawT(key, uiLang),
    [uiLang],
  );

  const ocrLangCode = getLangMeta(ocrLang).tesseractLang;

  return (
    <LanguageContext.Provider value={{
      uiLang, summaryLang, ocrLang, ocrLangCode,
      setUiLang, setSummaryLang, setOcrLang, T,
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}

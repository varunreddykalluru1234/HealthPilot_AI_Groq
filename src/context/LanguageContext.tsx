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
  useEffect,
  type ReactNode,
} from 'react';
import {
  type LangCode,
  type TranslationKey,
  t as rawT,
  getLangMeta,
  LANGUAGES,
} from '@/i18n/translations';
import { PHRASE_DICTIONARY } from '@/i18n/phraseDictionary';

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

// WeakMap to preserve original English text of text nodes so they can be restored or re-translated
const originalTextMap = new WeakMap<Text, string>();

function translateDOM(targetLang: LangCode) {
  if (typeof document === 'undefined') return;
  const root = document.getElementById('root');
  if (!root) return;

  const dict = targetLang !== 'en' ? PHRASE_DICTIONARY[targetLang] : null;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      const tag = parent.tagName.toLowerCase();
      if (tag === 'script' || tag === 'style' || tag === 'noscript' || tag === 'textarea' || tag === 'input') {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let currentNode = walker.nextNode() as Text | null;
  while (currentNode) {
    let original = originalTextMap.get(currentNode);
    if (original === undefined) {
      original = currentNode.nodeValue ?? '';
      originalTextMap.set(currentNode, original);
    }

    const trimmed = original.trim();
    if (trimmed.length > 0) {
      if (targetLang === 'en') {
        if (currentNode.nodeValue !== original) {
          currentNode.nodeValue = original;
        }
      } else if (dict) {
        if (dict[trimmed]) {
          const leadingWs = original.match(/^\s*/)?.[0] ?? '';
          const trailingWs = original.match(/\s*$/)?.[0] ?? '';
          const translated = dict[trimmed];
          if (currentNode.nodeValue !== `${leadingWs}${translated}${trailingWs}`) {
            currentNode.nodeValue = `${leadingWs}${translated}${trailingWs}`;
          }
        }
      }
    }

    currentNode = walker.nextNode() as Text | null;
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
  /** Translate any raw English phrase */
  tText: (englishText: string) => string;
  /** The currently stored OCR language code as a LangCode */
  ocrLang: LangCode;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [uiLang, setUiLangState] = useState<LangCode>(() => loadLang(KEY_UI_LANG, 'en'));
  const [summaryLang, setSummaryLangState] = useState<LangCode>(() => loadLang(KEY_SUMMARY_LANG, 'en'));
  const [ocrLang, setOcrLangState] = useState<LangCode>(() => loadLang(KEY_OCR_LANG, 'en'));

  useEffect(() => {
    translateDOM(uiLang);

    // Watch for dynamic route transitions and DOM changes to translate whole page
    let observer: MutationObserver | null = null;
    if (uiLang !== 'en') {
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      observer = new MutationObserver(() => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          translateDOM(uiLang);
        }, 80);
      });
      const root = document.getElementById('root');
      if (root) {
        observer.observe(root, { childList: true, subtree: true });
      }
    }

    return () => {
      observer?.disconnect();
    };
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
    translateDOM(lang);
  }, []);

  const setSummaryLang = useCallback((lang: LangCode) => {
    setSummaryLangState(lang);
    try {
      localStorage.setItem(KEY_SUMMARY_LANG, lang);
    } catch {
      // ignore
    }
  }, []);

  const setOcrLang = useCallback((lang: LangCode) => {
    setOcrLangState(lang);
    try {
      localStorage.setItem(KEY_OCR_LANG, lang);
    } catch {
      // ignore
    }
  }, []);

  const T = useCallback(
    (key: TranslationKey) => rawT(key, uiLang),
    [uiLang],
  );

  const tText = useCallback(
    (englishText: string) => {
      if (uiLang === 'en') return englishText;
      return PHRASE_DICTIONARY[uiLang]?.[englishText] ?? englishText;
    },
    [uiLang],
  );

  const ocrLangCode = getLangMeta(ocrLang).tesseractLang;

  return (
    <LanguageContext.Provider value={{
      uiLang, summaryLang, ocrLang, ocrLangCode,
      setUiLang, setSummaryLang, setOcrLang, T, tText,
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
}

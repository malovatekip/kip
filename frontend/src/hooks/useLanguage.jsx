import { useState, useEffect, useCallback } from 'react'

/**
 * useLanguage — KIP language preference hook.
 *
 * Stores preference in localStorage under 'kip_language' ('en' | 'bem').
 * Dispatches a custom 'kip-language-change' event so all components
 * using this hook stay in sync when the toggle is used anywhere.
 *
 * The active language is automatically attached to every API request
 * via the axios interceptor in lib/api.js (see setup instructions).
 */

const STORAGE_KEY = 'kip_language'
const EVENT_NAME  = 'kip-language-change'

export const LANGUAGES = {
  en:  { code: 'en',  label: 'English', short: 'EN', flag: '🇬🇧' },
  bem: { code: 'bem', label: 'Bemba',   short: 'BEM', flag: '🇿🇲' },
}

export function getLanguage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'bem' ? 'bem' : 'en'
  } catch {
    return 'en'
  }
}

export function setLanguage(lang) {
  try {
    localStorage.setItem(STORAGE_KEY, lang)
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { language: lang } }))
  } catch {}
}

export function useLanguage() {
  const [language, setLang] = useState(getLanguage)

  useEffect(() => {
    const handler = (e) => setLang(e.detail?.language || getLanguage())
    window.addEventListener(EVENT_NAME, handler)
    return () => window.removeEventListener(EVENT_NAME, handler)
  }, [])

  const toggle = useCallback(() => {
    const next = language === 'en' ? 'bem' : 'en'
    setLanguage(next)
  }, [language])

  const set = useCallback((lang) => setLanguage(lang), [])

  return {
    language,
    languageInfo: LANGUAGES[language],
    toggle,
    setLanguage: set,
    isEnglish: language === 'en',
    isBemba:   language === 'bem',
  }
}

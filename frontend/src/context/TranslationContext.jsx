/**
 * KIP Translation Context
 * =======================
 * Loads UI strings for the active language and provides them
 * to every component in the app via the useT() hook.
 *
 * How it works:
 *  1. On mount, reads language from localStorage (set by LanguageToggle)
 *  2. Fetches /api/i18n/strings/<lang> — which serves the pre-built JSON
 *  3. All components call useT() to get the t() function
 *  4. t('nav.dashboard') returns the right string in the active language
 *  5. When language changes, strings reload automatically
 *
 * Usage in any component:
 *   import { useT } from '../context/TranslationContext'
 *   const { t, lang, setLang } = useT()
 *   <button>{t('common.save')}</button>
 *   <h1>{t('dashboard.title')}</h1>
 */

import React, {
  createContext, useContext, useState, useEffect, useCallback, useRef
} from 'react'
import api from '../lib/api'

const TranslationContext = createContext(null)

const STORAGE_KEY  = 'kip_language'
const CHANGE_EVENT = 'kip-language-change'

// Resolve a dot-notation key against a nested object.
// Returns the raw value (string or array) — callers decide what shape they need.
function resolve(obj, key) {
  if (!obj || !key) return null
  const parts = key.split('.')
  let current  = obj
  for (const part of parts) {
    if (current == null) return null
    current = current[part]
  }
  return (typeof current === 'string' || Array.isArray(current)) ? current : null
}

export function TranslationProvider({ children }) {
  const [lang,    setLangState] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || 'en' }
    catch { return 'en' }
  })
  const [strings, setStrings]   = useState({})
  const [loading, setLoading]   = useState(false)
  const cache = useRef({})  // in-memory cache per language

  const loadStrings = useCallback(async (targetLang) => {
    // Use memory cache if available
    if (cache.current[targetLang]) {
      setStrings(cache.current[targetLang])
      return
    }

    // Try loading from /src/i18n/<lang>.json (pre-built, no network needed)
    try {
      const mod = await import(`../i18n/${targetLang}.json`)
      cache.current[targetLang] = mod.default || mod
      setStrings(cache.current[targetLang])
      return
    } catch {
      // File not pre-built — fall through to API
    }

    // Fall back to backend API
    setLoading(true)
    try {
      const { data } = await api.get(`/i18n/strings/${targetLang}`)
      const s = data.strings || {}
      cache.current[targetLang] = s
      setStrings(s)
    } catch {
      // If all else fails, load English
      if (targetLang !== 'en') {
        try {
          const { data } = await api.get('/i18n/strings/en')
          setStrings(data.strings || {})
        } catch {
          setStrings({})
        }
      }
    } finally {
      setLoading(false)
    }
  }, [])

  // Load strings on mount and when language changes
  useEffect(() => {
    loadStrings(lang)
  }, [lang, loadStrings])

  // Listen for language change events from the toggle
  useEffect(() => {
    const handler = (e) => {
      const newLang = e.detail?.language || 'en'
      setLangState(newLang)
      try { localStorage.setItem(STORAGE_KEY, newLang) } catch {}
    }
    window.addEventListener(CHANGE_EVENT, handler)
    return () => window.removeEventListener(CHANGE_EVENT, handler)
  }, [])

  const setLang = useCallback((newLang) => {
    setLangState(newLang)
    try { localStorage.setItem(STORAGE_KEY, newLang) } catch {}
    // Dispatch event so LanguageToggle stays in sync
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { language: newLang } }))
  }, [])

  /**
   * t(key, params) — translate a string key
   *
   * Examples:
   *   t('common.save')                    → "Save" or "Busungisha"
   *   t('dashboard.welcome', {name:'Paul'}) → "Welcome back, Paul"
   *   t('missing.key')                    → "missing.key" (key shown as fallback)
   */
  const t = useCallback((key, params = {}) => {
    const value = resolve(strings, key)
    // Only fall back to showing the raw key when the value is genuinely missing (or the wrong
    // shape) — an explicit empty string is a valid translation (e.g. a suffix some languages
    // don't need) and must render as nothing, not as the literal key.
    if (typeof value !== 'string') return key

    // Simple parameter substitution: t('welcome', {name: 'Paul'}) → "Welcome Paul"
    if (Object.keys(params).length === 0) return value
    return value.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? `{${k}}`)
  }, [strings])

  /**
   * tList(key) — translate a list-valued key (JSON array of strings), e.g. for
   * page-header taglines that rotate through a few items instead of one fixed string.
   *   tList('templates.subtitle_items') → ["Government forms", "AI letters", ...]
   * Returns [] if the key is missing or not an array.
   */
  const tList = useCallback((key) => {
    const value = resolve(strings, key)
    return Array.isArray(value) ? value : []
  }, [strings])

  return (
    <TranslationContext.Provider value={{ t, tList, lang, setLang, loading, strings }}>
      {children}
    </TranslationContext.Provider>
  )
}

/** Hook to access translations in any component */
export function useT() {
  const ctx = useContext(TranslationContext)
  if (!ctx) throw new Error('useT() must be used inside <TranslationProvider>')
  return ctx
}

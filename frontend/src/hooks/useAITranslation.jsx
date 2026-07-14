/**
 * useAITranslation
 * ================
 * Hook for translating AI-generated content (Claude responses) through
 * ZedTranslate after they're received from the backend.
 *
 * When to use this vs t():
 *   t()               → for static UI strings (buttons, labels, headings)
 *   useAITranslation  → for dynamic content Claude generates (coaching,
 *                        business ideas, BizSim events, KIP Learn explanations)
 *
 * Usage:
 *   const { translateAI, translating } = useAITranslation()
 *
 *   // After receiving Claude's response:
 *   const localised = await translateAI(claudeResponse)
 *   setCoaching(localised)
 */

import { useState, useCallback } from 'react'
import { useT } from '../context/TranslationContext'
import api from '../lib/api'

export function useAITranslation() {
  const { lang } = useT()
  const [translating, setTranslating] = useState(false)

  /**
   * translateAI(text) — translate AI-generated text to current language.
   * Returns original text if language is English or translation fails.
   */
  const translateAI = useCallback(async (text) => {
    if (!text || lang === 'en') return text

    setTranslating(true)
    try {
      const { data } = await api.post('/i18n/translate-ai', {
        text,
        target: lang,
        source: 'en',
      })
      return data.translated || text
    } catch {
      // Graceful degradation — return English on failure
      return text
    } finally {
      setTranslating(false)
    }
  }, [lang])

  /**
   * translateMany(texts) — translate an array of strings in parallel.
   * Returns array of translated strings in same order.
   */
  const translateMany = useCallback(async (texts) => {
    if (!texts?.length || lang === 'en') return texts
    const results = await Promise.all(texts.map(t => translateAI(t)))
    return results
  }, [lang, translateAI])

  return { translateAI, translateMany, translating, lang }
}

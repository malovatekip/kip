import React from 'react'
import { useLanguage, LANGUAGES } from '../hooks/useLanguage'
import { Globe } from 'lucide-react'
import toast from 'react-hot-toast'

/**
 * LanguageToggle — sidebar control to switch between English and Bemba.
 * Affects AI-generated content across K-BIG-1 chat, BizSim, and KIP Learn.
 *
 * Usage in Layout.jsx / Sidebar:
 *   import LanguageToggle from './LanguageToggle'
 *   <LanguageToggle />
 */
export default function LanguageToggle({ compact = false }) {
  const { language, toggle } = useLanguage()

  const handleToggle = () => {
    toggle()
    const next = language === 'en' ? LANGUAGES.bem : LANGUAGES.en
    toast.success(
      next.code === 'bem'
        ? 'KIP will now respond in Bemba 🇿🇲'
        : 'KIP will now respond in English',
      { duration: 2500 }
    )
  }

  if (compact) {
    // Tiny pill version for collapsed sidebar
    return (
      <button onClick={handleToggle} title="Switch language" style={{
        width: 36, height: 36, borderRadius: 10, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--input-bg)', border: '1px solid var(--border)',
        color: 'var(--muted)', fontFamily: 'Syne', fontWeight: 700, fontSize: 11,
      }}>
        {LANGUAGES[language].short}
      </button>
    )
  }

  return (
    <button onClick={handleToggle} style={{
      display: 'flex', alignItems: 'center', gap: 10, width: '100%',
      padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
      background: 'var(--input-bg)', border: '1px solid var(--border)',
      transition: 'border-color 0.2s ease',
    }}
    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--blue)'}
    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 9, flexShrink: 0,
        background: 'var(--blue-dim)', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Globe size={15} style={{ color: 'var(--blue-bright)' }} />
      </div>
      <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
        <div style={{ fontSize: 10, color: 'var(--faint)', fontFamily: 'Syne', fontWeight: 600, letterSpacing: '0.06em' }}>
          KIP SPEAKS
        </div>
        <div style={{ fontSize: 13, fontFamily: 'Syne', fontWeight: 700, color: 'var(--text)' }}>
          {LANGUAGES[language].label}
        </div>
      </div>
      {/* Switch visual */}
      <div style={{
        width: 44, height: 24, borderRadius: 12, position: 'relative', flexShrink: 0,
        background: language === 'bem' ? 'var(--teal)' : 'var(--border)',
        transition: 'background 0.2s ease',
      }}>
        <div style={{
          position: 'absolute', top: 2, left: language === 'bem' ? 22 : 2,
          width: 20, height: 20, borderRadius: '50%', background: '#fff',
          transition: 'left 0.2s ease',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, fontWeight: 700, color: 'var(--navy)', fontFamily: 'Syne',
        }}>
          {LANGUAGES[language].short.slice(0, 2)}
        </div>
      </div>
    </button>
  )
}

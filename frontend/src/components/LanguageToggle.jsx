/**
 * LanguageToggle
 * ==============
 * Sidebar control to switch KIP between English and Bemba.
 * Saves the preference to the user's account so it persists across devices.
 *
 * Place in Layout.jsx sidebar:
 *   import LanguageToggle from './LanguageToggle'
 *   <LanguageToggle />
 *
 * Collapsed sidebar version:
 *   <LanguageToggle compact />
 */
import React, { useState } from 'react'
import { Globe } from 'lucide-react'
import { useT } from '../context/TranslationContext'
import api from '../lib/api'
import toast from 'react-hot-toast'

const LANGUAGES = [
  { code: 'en',  label: 'English',  native: 'English',   flag: '🇬🇧' },
  { code: 'bem', label: 'Bemba',    native: 'Icibemba',  flag: '🇿🇲' },
]

export default function LanguageToggle({ compact = false }) {
  const { lang, setLang, loading } = useT()
  const [saving, setSaving] = useState(false)
  const [open,   setOpen]   = useState(false)

  const current = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0]

  const handleSelect = async (code) => {
    if (code === lang) { setOpen(false); return }
    setSaving(true)
    setOpen(false)

    // Optimistic update — switch UI immediately
    setLang(code)

    // Save to backend (fire and forget — UI already switched)
    try {
      await api.put('/i18n/language', { language: code })
      const selected = LANGUAGES.find(l => l.code === code)
      toast.success(
        code === 'en'
          ? 'KIP will now respond in English'
          : `KIP will now respond in ${selected?.label} ${selected?.flag}`,
        { duration: 2500 }
      )
    } catch {
      // Saving to backend failed — preference is still saved to localStorage
      // so the user will still see their language. Non-critical.
      toast.error('Could not save language preference to your account.', { duration: 2000 })
    } finally {
      setSaving(false)
    }
  }

  // ── Compact version (collapsed sidebar — just a flag pill) ──────────────
  if (compact) {
    return (
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setOpen(o => !o)}
          title="Switch language"
          style={{
            width: 36, height: 36, borderRadius: 10, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--input-bg)', border: '1px solid var(--border)',
            color: 'var(--muted)', fontFamily: 'Syne', fontWeight: 700, fontSize: 10,
          }}
        >
          {loading || saving ? '…' : current.flag}
        </button>

        {open && (
          <div style={{
            position: 'absolute', left: 44, top: 0, zIndex: 100,
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 12, padding: 6, minWidth: 140,
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
          }}>
            {LANGUAGES.map(l => (
              <button key={l.code} onClick={() => handleSelect(l.code)} style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                background: lang === l.code ? 'var(--blue-dim)' : 'transparent',
                border: 'none', textAlign: 'left',
              }}>
                <span style={{ fontSize: 16 }}>{l.flag}</span>
                <div>
                  <div style={{ fontSize: 12, fontFamily: 'Syne', fontWeight: 700, color: lang === l.code ? 'var(--blue-bright)' : 'var(--text)' }}>
                    {l.label}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--faint)' }}>{l.native}</div>
                </div>
                {lang === l.code && (
                  <div style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: 'var(--blue)' }} />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Full version (expanded sidebar) ─────────────────────────────────────
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, width: '100%',
          padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
          background: open ? 'var(--blue-dim)' : 'var(--input-bg)',
          border: `1px solid ${open ? 'rgba(43,127,255,0.4)' : 'var(--border)'}`,
          transition: 'all 0.15s ease',
        }}
      >
        <div style={{
          width: 32, height: 32, borderRadius: 9, flexShrink: 0,
          background: 'var(--blue-dim)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Globe size={15} style={{ color: 'var(--blue-bright)' }} />
        </div>
        <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
          <div style={{ fontSize: 10, color: 'var(--faint)', fontFamily: 'Syne', fontWeight: 600, letterSpacing: '0.06em' }}>
            KIP SPEAKS
          </div>
          <div style={{ fontSize: 13, fontFamily: 'Syne', fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
            {loading || saving ? (
              <span style={{ color: 'var(--muted)' }}>Loading…</span>
            ) : (
              <>{current.flag} {current.label}</>
            )}
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          ▾
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 99 }}
          />
          <div style={{
            position: 'absolute', bottom: '110%', left: 0, right: 0, zIndex: 100,
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 14, padding: 6,
            boxShadow: '0 -8px 32px rgba(0,0,0,0.4)',
          }}>
            <div style={{ fontSize: 10, fontFamily: 'Syne', fontWeight: 700, color: 'var(--faint)', letterSpacing: '0.08em', padding: '4px 10px 6px' }}>
              SELECT LANGUAGE
            </div>
            {LANGUAGES.map(l => (
              <button key={l.code} onClick={() => handleSelect(l.code)} style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                background: lang === l.code ? 'var(--blue-dim)' : 'transparent',
                border: `1px solid ${lang === l.code ? 'rgba(43,127,255,0.3)' : 'transparent'}`,
                marginBottom: 3,
              }}>
                <span style={{ fontSize: 20, lineHeight: 1 }}>{l.flag}</span>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13, color: lang === l.code ? 'var(--blue-bright)' : 'var(--text)' }}>
                    {l.label}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--faint)' }}>{l.native}</div>
                </div>
                {lang === l.code && (
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--blue)', flexShrink: 0 }} />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

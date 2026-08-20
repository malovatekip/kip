import React, { useState, useEffect } from 'react'
import { ChevronRight, ChevronLeft, Loader2, Swords, AlertTriangle } from 'lucide-react'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { C } from './theme'
import GameAudio from './GameAudio'
import { useT } from '../../context/TranslationContext'

const fmt = n => `K${(n || 0).toLocaleString('en-ZM', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

function debtSummary(biz, t) {
  switch (biz.debt_type) {
    case 'compounding_loan':
      return t('bizsim.debt_compounding', { amount: fmt(biz.debt_original), lender: biz.debt_lender, rate: biz.debt_rate, day: biz.debt_due_day })
    case 'installment_loan':
      return t('bizsim.debt_installment', { amount: fmt(biz.debt_original), lender: biz.debt_lender, day: biz.debt_due_day })
    case 'profit_target':
      return t('bizsim.debt_profit_target', { amount: fmt(biz.debt_original), lender: biz.debt_lender, day: biz.debt_due_day })
    case 'inventory_credit':
      return t('bizsim.debt_inventory_credit', { amount: fmt(biz.debt_original), lender: biz.debt_lender, day: biz.debt_due_day })
    case 'rent_recurring':
      return t('bizsim.debt_rent_recurring', { amount: fmt(biz.debt_original), lender: biz.debt_lender })
    default:
      return t('bizsim.debt_default', { amount: fmt(biz.debt_original), lender: biz.debt_lender, day: biz.debt_due_day })
  }
}

const PERSONALITY_LABEL_KEYS = {
  aggressive: 'bizsim.personality_aggressive',
  premium:    'bizsim.personality_premium',
  consistent: 'bizsim.personality_consistent',
  reactive:   'bizsim.personality_reactive',
}

// ── Story reveal ─────────────────────────────────────────────────────────────
function StoryReveal({ biz, onBack, onConfirm, starting }) {
  const { t } = useT()
  const [bizName, setBizName] = useState('')

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 16px' }}>
      <button onClick={onBack} style={{
        display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
        color: C.muted, fontSize: 12, fontFamily: 'Syne', fontWeight: 600, cursor: 'pointer',
        padding: '8px 0 16px', marginLeft: -2,
      }}>
        <ChevronLeft size={14} /> {t('bizsim.back_to_businesses')}
      </button>

      {/* Business header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <div style={{ fontSize: 40 }}>{biz.emoji}</div>
        <div>
          <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 20, color: C.white }}>{biz.name}</div>
          <div style={{ fontSize: 12, color: biz.colour, fontFamily: 'Syne', fontWeight: 600 }}>{biz.location}</div>
        </div>
      </div>

      {/* Narrative */}
      <div style={{
        background: C.card, border: `1px solid ${C.border}`, borderRadius: 16,
        padding: '18px 20px', marginBottom: 14,
      }}>
        <div style={{ fontSize: 11, fontFamily: 'Syne', fontWeight: 700, color: C.muted, letterSpacing: '0.1em', marginBottom: 10 }}>
          {t('bizsim.your_story_header')}
        </div>
        <p style={{ fontSize: 14, color: C.white, lineHeight: 1.75, margin: 0 }}>{biz.story}</p>
      </div>

      {/* Debt callout */}
      <div style={{
        background: `${C.purple}12`, border: `1px solid ${C.purple}40`, borderRadius: 16,
        padding: '16px 18px', marginBottom: 14, display: 'flex', gap: 12, alignItems: 'flex-start',
      }}>
        <AlertTriangle size={20} style={{ color: C.purple, flexShrink: 0, marginTop: 2 }} />
        <div>
          <div style={{ fontSize: 11, fontFamily: 'Syne', fontWeight: 700, color: C.purple, letterSpacing: '0.08em', marginBottom: 4 }}>
            {t('bizsim.debt_header')}
          </div>
          <div style={{ fontSize: 13, color: C.white, lineHeight: 1.6 }}>{debtSummary(biz, t)}</div>
        </div>
      </div>

      {/* Rival intro */}
      <div style={{
        background: `${C.red}0d`, border: `1px solid ${C.red}35`, borderRadius: 16,
        padding: '16px 18px', marginBottom: 22,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Swords size={16} style={{ color: C.red }} />
          <div style={{ fontSize: 11, fontFamily: 'Syne', fontWeight: 700, color: C.red, letterSpacing: '0.08em' }}>
            {t('bizsim.your_rival_header')}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 15, color: C.white }}>{biz.rival_name}</span>
          <span style={{
            fontSize: 10, padding: '2px 8px', borderRadius: 12, background: `${C.red}20`,
            color: C.red, fontFamily: 'Syne', fontWeight: 700,
          }}>
            {(PERSONALITY_LABEL_KEYS[biz.rival_personality] && t(PERSONALITY_LABEL_KEYS[biz.rival_personality])) || biz.rival_personality}
          </span>
        </div>
        <div style={{
          padding: '10px 14px', borderRadius: '4px 14px 14px 14px', fontSize: 13,
          fontStyle: 'italic', lineHeight: 1.6, color: C.white,
          background: '#0F2040', border: `1px solid ${C.red}25`,
        }}>
          "{biz.rival_intro_dialogue}"
        </div>
      </div>

      {/* Name input */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 12, color: C.muted, letterSpacing: '0.1em', marginBottom: 10 }}>
          {t('bizsim.name_your_business')}
        </div>
        <input
          value={bizName} onChange={e => setBizName(e.target.value)}
          placeholder={t('bizsim.name_placeholder_dynamic', { biz: biz.name })}
          style={{
            width: '100%', padding: '12px 16px', borderRadius: 12,
            background: C.card, border: `1px solid ${biz.colour}50`,
            color: C.white, fontSize: 15, fontFamily: 'Syne', fontWeight: 600,
            outline: 'none', boxSizing: 'border-box', transition: 'box-shadow 0.2s',
          }}
          onFocus={e => e.target.style.boxShadow = `0 0 0 3px ${biz.colour}30`}
          onBlur={e => e.target.style.boxShadow = '0 0 0 0px transparent'}
        />
      </div>

      <button
        onClick={() => onConfirm(bizName.trim())}
        disabled={!bizName.trim() || starting}
        style={{
          width: '100%', padding: '15px 0', borderRadius: 14, cursor: 'pointer',
          background: `linear-gradient(135deg, ${biz.colour}, ${biz.colour}cc)`,
          border: 'none', color: '#fff', fontFamily: 'Syne', fontWeight: 800, fontSize: 16,
          boxShadow: `0 8px 32px ${biz.colour}40`, transition: 'all 0.3s ease',
          opacity: !bizName.trim() ? 0.6 : 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        }}>
        {starting
          ? <><Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> {t('bizsim.opening_for_business')}</>
          : <>{t('bizsim.open_business')} <ChevronRight size={18} /></>
        }
      </button>
    </div>
  )
}

// ── Story-driven setup: pick a business, reveal its story/debt/rival, name it ──
export default function StorySetup({ onStart }) {
  const { t } = useT()
  const [businesses, setBusinesses] = useState([])
  const [step,        setStep]      = useState('pick') // 'pick' | 'reveal'
  const [selected,    setSelected]  = useState(null)
  const [starting,    setStarting]  = useState(false)

  useEffect(() => {
    api.get('/bizsim/business-types')
      .then(r => setBusinesses(r.data.businesses || []))
      .catch(() => {})
  }, [])

  const handlePick = biz => {
    setSelected(biz)
    setStep('reveal')
  }

  const handleConfirm = async (bizName) => {
    if (!bizName) { toast.error(t('bizsim.name_business_error')); return }
    GameAudio.init()
    setStarting(true)
    try {
      await onStart(selected.id, bizName)
    } finally {
      setStarting(false)
    }
  }

  if (step === 'reveal' && selected) {
    return (
      <StoryReveal
        biz={selected}
        starting={starting}
        onBack={() => setStep('pick')}
        onConfirm={handleConfirm}
      />
    )
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 16px' }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '32px 0 24px' }}>
        <div style={{
          display: 'inline-block', fontSize: 11, fontFamily: 'Syne',
          fontWeight: 700, letterSpacing: '0.15em', color: C.teal,
          background: `${C.teal}15`, border: `1px solid ${C.teal}30`,
          padding: '4px 14px', borderRadius: 20, marginBottom: 14,
        }}>
          {t('bizsim.title').toUpperCase()}
        </div>
        <h1 style={{
          fontFamily: 'Syne', fontWeight: 800, fontSize: 'clamp(22px,5vw,36px)',
          color: C.white, lineHeight: 1.15, marginBottom: 10,
        }}>
          {t('bizsim.hero_line1')}<br />
          <span style={{ background: `linear-gradient(135deg, ${C.gold}, ${C.teal})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {t('bizsim.hero_line2')}
          </span>
        </h1>
        <p style={{ fontSize: 14, color: C.muted, maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }}>
          {t('bizsim.hero_desc')}
        </p>
      </div>

      {/* Business selector */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 12, color: C.muted, letterSpacing: '0.1em', marginBottom: 12 }}>
          {t('bizsim.choose_business').toUpperCase()}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
          {businesses.map(biz => (
            <button key={biz.id} onClick={() => handlePick(biz)} style={{
              padding: '14px 16px', borderRadius: 14, cursor: 'pointer',
              textAlign: 'left', position: 'relative', overflow: 'hidden',
              background: C.card, border: `1px solid ${C.border}`,
              transition: 'all 0.2s ease',
            }}>
              <div style={{ fontSize: 26, marginBottom: 6 }}>{biz.emoji}</div>
              <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13, color: C.white, marginBottom: 2 }}>{biz.name}</div>
              <div style={{ fontSize: 10, color: biz.colour, fontFamily: 'Syne', fontWeight: 600, marginBottom: 6 }}>{biz.location}</div>
              <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>{biz.description}</div>
              <div style={{ marginTop: 8, padding: '5px 8px', background: `${biz.colour}15`, borderRadius: 6, fontSize: 10, color: biz.colour, fontFamily: 'Syne', fontWeight: 700 }}>
                {biz.mechanic}
              </div>
              <div style={{ marginTop: 8, fontFamily: 'Syne', fontWeight: 800, fontSize: 16, color: C.white }}>
                {fmt(biz.capital)} <span style={{ fontSize: 10, fontWeight: 400, color: C.muted }}>{t('bizsim.starting_capital')}</span>
              </div>
              <div style={{ marginTop: 6, fontSize: 10, color: C.red }}>
                {t('bizsim.vs_rival', { rival: biz.rival_name, amount: fmt(biz.debt_original) })}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

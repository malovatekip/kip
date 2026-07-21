import React, { useState } from 'react'
import { Zap, Users, TrendingUp, Sparkles, ShieldAlert, ChevronRight, Loader2 } from 'lucide-react'
import { C } from './theme'

const CATEGORY_META = {
  zambian_reality:  { label: 'Zambian Reality',   colour: C.orange, icon: Zap },
  social_family:    { label: 'Social & Family',   colour: C.pink,   icon: Users },
  market_shocks:    { label: 'Market Shock',      colour: C.red,    icon: TrendingUp },
  opportunity:      { label: 'Opportunity',       colour: C.green,  icon: Sparkles },
  risk_consequence: { label: 'Risk & Consequence',colour: C.gold,   icon: ShieldAlert },
  debt:             { label: 'Debt Reminder',     colour: C.purple, icon: ShieldAlert },
}

function consequenceLine(consequence) {
  if (!consequence) return null
  const parts = []
  if (consequence.cash_delta) {
    const n = consequence.cash_delta
    parts.push(`${n > 0 ? '+' : ''}K${n} cash`)
  }
  if (consequence.reputation_delta) {
    parts.push(`${consequence.reputation_delta > 0 ? '+' : ''}${consequence.reputation_delta} reputation`)
  }
  if (consequence.family_reputation_delta) {
    parts.push(`${consequence.family_reputation_delta > 0 ? '+' : ''}${consequence.family_reputation_delta} family standing`)
  }
  if (consequence.demand_mult && consequence.demand_mult !== 1.0) {
    parts.push(consequence.demand_mult > 1
      ? `+${Math.round((consequence.demand_mult - 1) * 100)}% customers today`
      : `${Math.round((consequence.demand_mult - 1) * 100)}% customers today`)
  }
  if (consequence.skip_day) parts.push('No trading today')
  return parts.length ? parts.join(' · ') : 'No lasting effect.'
}

// Presentational only — BizSimPage owns fetching /event/today and posting /event/choose.
export default function EventCard({ event, onChoose, onContinue }) {
  const [chosenId,    setChosenId]    = useState(null)
  const [loading,     setLoading]     = useState(false)
  const [consequence, setConsequence] = useState(null)

  if (!event) return null
  const meta = CATEGORY_META[event.category] || CATEGORY_META.zambian_reality
  const Icon = meta.icon

  const handleChoose = async (choiceId) => {
    if (chosenId) return
    setChosenId(choiceId)
    setLoading(true)
    try {
      const result = await onChoose(choiceId)
      setConsequence(result || {})
    } catch {
      setConsequence({})
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      maxWidth: 480, margin: '0 auto', animation: 'slideUp 0.35s ease-out',
    }}>
      <div style={{
        background: C.card, border: `1px solid ${meta.colour}40`, borderRadius: 18,
        boxShadow: `0 8px 40px ${meta.colour}25`, overflow: 'hidden',
      }}>
        {/* Category badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px',
          background: `${meta.colour}15`, borderBottom: `1px solid ${meta.colour}30`,
        }}>
          <Icon size={14} style={{ color: meta.colour }} />
          <span style={{
            fontSize: 11, fontFamily: 'Syne', fontWeight: 700, color: meta.colour,
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            {meta.label}
          </span>
        </div>

        <div style={{ padding: '20px 22px' }}>
          <h3 style={{
            fontFamily: 'Syne', fontWeight: 800, fontSize: 19, color: C.white,
            margin: '0 0 10px',
          }}>
            {event.title}
          </h3>
          <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7, margin: '0 0 18px' }}>
            {event.flavour}
          </p>

          {!consequence && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {event.choices.map(choice => (
                <button
                  key={choice.id}
                  disabled={loading}
                  onClick={() => handleChoose(choice.id)}
                  style={{
                    padding: '12px 16px', borderRadius: 12, cursor: loading ? 'default' : 'pointer',
                    textAlign: 'left', background: '#0F2040',
                    border: `1px solid ${chosenId === choice.id ? meta.colour : C.border}`,
                    color: C.white, fontFamily: 'Syne', fontWeight: 600, fontSize: 13,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                    opacity: loading && chosenId !== choice.id ? 0.5 : 1,
                    transition: 'all 0.15s',
                  }}>
                  <span>{choice.label}</span>
                  {chosenId === choice.id && loading
                    ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite', color: meta.colour }} />
                    : <ChevronRight size={14} style={{ color: C.muted, flexShrink: 0 }} />}
                </button>
              ))}
            </div>
          )}

          {consequence && (
            <div>
              <div style={{
                padding: '12px 16px', borderRadius: 12, marginBottom: 14,
                background: `${meta.colour}12`, border: `1px solid ${meta.colour}35`,
                fontSize: 13, color: C.white, fontFamily: 'Syne', fontWeight: 600,
              }}>
                {consequenceLine(consequence)}
              </div>
              <button onClick={onContinue} style={{
                width: '100%', padding: '13px 0', borderRadius: 12, cursor: 'pointer',
                background: `linear-gradient(135deg, ${meta.colour}, ${meta.colour}cc)`,
                border: 'none', color: '#fff', fontFamily: 'Syne', fontWeight: 800, fontSize: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                Continue <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

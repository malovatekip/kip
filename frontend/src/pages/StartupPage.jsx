/**
 * StartupPage.jsx
 * ───────────────
 * KIP Startup Guidance — Business Development
 *
 * A step-by-step compliance and registration roadmap for all
 * Zambian startup types. Fully dynamic — adapts the roadmap based
 * on the selected startup type, whether employees are hired, and
 * whether the founder seeks investment incentives.
 *
 * Route: /startup  (Protected — requires login)
 * Layout: uses the standard KIP <Layout /> wrapper
 */

import React, { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CheckCircle, ChevronDown, ChevronUp, ExternalLink,
  FileText, Users, Building2, Zap, AlertTriangle,
  Calendar, ArrowRight, Info, BookOpen, Search,
  DollarSign, Clock, MapPin, MessageSquare,
} from 'lucide-react'
import Layout from '../components/Layout'
import { BusinessIllustration } from '../components/KipIllustrations'
import {
  STARTUP_TYPES,
  BUSINESS_STRUCTURES,
  AUTHORITIES,
  COMPLIANCE_CALENDAR,
  buildRoadmap,
} from '../data/startupData'

// ─── SECTION TABS ─────────────────────────────────────────────────────────────

const TABS = [
  { key: 'choose_type',   label: 'Choose Type',       icon: Building2  },
  { key: 'structure',     label: 'Business Structure', icon: BookOpen   },
  { key: 'roadmap',       label: 'Registration Steps', icon: CheckCircle },
  { key: 'compliance',    label: 'Stay Compliant',     icon: Calendar   },
]

// ─── STARTUP TYPE CARD ────────────────────────────────────────────────────────

function StartupTypeCard({ type, selected, onClick }) {
  return (
    <button
      onClick={() => onClick(type)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
        gap: 8, padding: '16px 16px', borderRadius: 14, cursor: 'pointer',
        textAlign: 'left', width: '100%',
        background: selected
          ? `${type.color}18`
          : 'var(--card)',
        border: `1px solid ${selected ? type.color + '60' : 'var(--border)'}`,
        transition: 'all 0.2s ease',
        boxShadow: selected ? `0 0 20px ${type.color}20` : 'none',
      }}
    >
      {/* Top row — emoji + label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
        <span style={{ fontSize: 26, lineHeight: 1 }}>{type.emoji}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'Syne', fontWeight: 700, fontSize: 13,
            color: selected ? type.color : 'var(--text)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {type.label}
          </div>
        </div>
        {selected && (
          <CheckCircle size={14} style={{ color: type.color, flexShrink: 0 }} />
        )}
      </div>
      {/* Description */}
      <p style={{
        fontSize: 11, color: 'var(--muted)', lineHeight: 1.55, margin: 0,
        display: '-webkit-box', WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {type.description}
      </p>
    </button>
  )
}

// ─── BUSINESS STRUCTURE CARD ──────────────────────────────────────────────────

function StructureCard({ structure, selected, onClick }) {
  return (
    <button
      onClick={() => onClick(structure)}
      style={{
        padding: '18px 18px', borderRadius: 16, cursor: 'pointer',
        textAlign: 'left', width: '100%', position: 'relative', overflow: 'hidden',
        background: selected ? `${structure.color}14` : 'var(--card)',
        border: `1px solid ${selected ? structure.color + '50' : 'var(--border)'}`,
        transition: 'all 0.2s ease',
      }}
    >
      {/* Accent bar */}
      {selected && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: structure.color,
        }} />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <span style={{ fontSize: 28 }}>{structure.emoji}</span>
        <div>
          <div style={{
            fontFamily: 'Syne', fontWeight: 800, fontSize: 15,
            color: selected ? structure.color : 'var(--text)',
          }}>
            {structure.name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>
            {structure.subtitle}
          </div>
        </div>
        {selected && (
          <CheckCircle size={16} style={{ color: structure.color, marginLeft: 'auto', flexShrink: 0 }} />
        )}
      </div>

      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 12 }}>
        <strong style={{ color: 'var(--text)' }}>Best for:</strong> {structure.best_for}
      </div>

      {/* Key stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          { label: 'Reg. Fee',  value: structure.registration_fee },
          { label: 'Timeline',  value: structure.time             },
          { label: 'Liability', value: structure.liability        },
          { label: 'Members',   value: structure.shareholders     },
        ].map(({ label, value }) => (
          <div key={label} style={{
            padding: '7px 10px', borderRadius: 9,
            background: 'var(--input-bg)', border: '1px solid var(--border)',
          }}>
            <div style={{ fontSize: 9, color: 'var(--faint)', fontFamily: 'Syne', fontWeight: 700, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {label}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text)', fontWeight: 600, lineHeight: 1.3 }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Pros / Cons — only on selected */}
      {selected && (
        <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <div style={{ fontSize: 10, fontFamily: 'Syne', fontWeight: 700, color: 'var(--green)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Advantages
            </div>
            {structure.pros.map((p, i) => (
              <div key={i} style={{ display: 'flex', gap: 7, marginBottom: 5 }}>
                <CheckCircle size={11} style={{ color: 'var(--green)', flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 11, color: 'var(--text)', lineHeight: 1.5 }}>{p}</span>
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 10, fontFamily: 'Syne', fontWeight: 700, color: 'var(--red)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Considerations
            </div>
            {structure.cons.map((c, i) => (
              <div key={i} style={{ display: 'flex', gap: 7, marginBottom: 5 }}>
                <AlertTriangle size={11} style={{ color: 'var(--gold)', flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>{c}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </button>
  )
}

// ─── REGISTRATION STEP CARD ───────────────────────────────────────────────────

function StepCard({ step, index }) {
  const [expanded, setExpanded] = useState(index === 0)
  const authority = AUTHORITIES[step.authority] || {}
  const accentColor = authority.color || 'var(--blue-bright)'

  return (
    <div style={{
      border: `1px solid ${expanded ? accentColor + '40' : 'var(--border)'}`,
      borderRadius: 16, overflow: 'hidden',
      background: expanded ? `${accentColor}06` : 'var(--card)',
      transition: 'all 0.25s ease',
    }}>
      {/* Header row — always visible */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 14,
          padding: '16px 18px', background: 'none', border: 'none',
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        {/* Step number bubble */}
        <div style={{
          width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
          background: expanded
            ? `linear-gradient(135deg, ${accentColor}, ${accentColor}aa)`
            : 'var(--input-bg)',
          border: `2px solid ${expanded ? accentColor : 'var(--border)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Syne', fontWeight: 800, fontSize: 14,
          color: expanded ? '#fff' : 'var(--muted)',
          transition: 'all 0.2s ease',
        }}>
          {step.step_number}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: 'Syne', fontWeight: 700, fontSize: 14,
              color: expanded ? 'var(--text)' : 'var(--text)',
            }}>
              {step.title}
            </span>
            {!step.mandatory && (
              <span style={{
                fontSize: 9, fontFamily: 'Syne', fontWeight: 700,
                padding: '2px 7px', borderRadius: 20,
                background: 'var(--gold-dim)', color: 'var(--gold)',
                border: '1px solid rgba(232,151,62,0.3)',
              }}>
                OPTIONAL
              </span>
            )}
          </div>
          {/* Authority + timeline teaser */}
          <div style={{ display: 'flex', gap: 12, marginTop: 3, flexWrap: 'wrap' }}>
            {authority.name && (
              <span style={{
                fontSize: 11, fontFamily: 'Syne', fontWeight: 700,
                color: accentColor,
              }}>
                {authority.name}
              </span>
            )}
            {step.timeline && (
              <span style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={10} />
                {step.timeline}
              </span>
            )}
            {step.trigger && !expanded && (
              <span style={{ fontSize: 11, color: 'var(--faint)', fontStyle: 'italic' }}>
                {step.trigger}
              </span>
            )}
          </div>
        </div>

        {expanded
          ? <ChevronUp size={16} style={{ color: 'var(--muted)', flexShrink: 0 }} />
          : <ChevronDown size={16} style={{ color: 'var(--muted)', flexShrink: 0 }} />
        }
      </button>

      {/* Expanded content */}
      {expanded && (
        <div style={{ padding: '0 18px 20px', borderTop: `1px solid ${accentColor}25` }}>

          {/* Summary */}
          <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7, margin: '14px 0' }}>
            {step.summary}
          </p>

          {/* What you get */}
          {step.what_you_get && (
            <div style={{
              display: 'flex', gap: 10, padding: '10px 14px', marginBottom: 16,
              background: `${accentColor}10`, border: `1px solid ${accentColor}30`,
              borderRadius: 10,
            }}>
              <CheckCircle size={14} style={{ color: accentColor, flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontSize: 10, fontFamily: 'Syne', fontWeight: 700, color: accentColor, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  What you receive
                </div>
                <span style={{ fontSize: 12.5, color: 'var(--text)' }}>{step.what_you_get}</span>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>

            {/* Requirements */}
            {step.requirements && step.requirements.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontFamily: 'Syne', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                  Documents Required
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {step.requirements.map((req, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: accentColor, flexShrink: 0, marginTop: 5 }} />
                      <span style={{ fontSize: 12.5, color: 'var(--text)', lineHeight: 1.55 }}>{req}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Costs */}
            {step.costs && step.costs.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontFamily: 'Syne', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                  Costs (ZMW)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {step.costs.filter(c => c.item).map((cost, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '6px 10px', background: 'var(--input-bg)', borderRadius: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--muted)', flex: 1 }}>{cost.item}</span>
                      <span style={{
                        fontFamily: 'Syne', fontWeight: 700, fontSize: 12,
                        color: cost.amount === 'FREE' ? 'var(--green)' : 'var(--gold-bright)',
                        flexShrink: 0,
                      }}>
                        {cost.amount || '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Tax categories (ZRA special) */}
          {step.tax_categories && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, fontFamily: 'Syne', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                Tax Categories — Choose the Right One
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {step.tax_categories.map((cat, i) => (
                  <div key={i} style={{
                    padding: '12px 14px', borderRadius: 10,
                    background: 'var(--input-bg)', border: '1px solid var(--border)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
                      <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{cat.name}</span>
                      <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 12, color: 'var(--gold-bright)' }}>{cat.rate}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 3 }}>
                      <strong>When:</strong> {cat.threshold}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 3 }}>
                      <strong>Filing:</strong> {cat.filing}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--faint)', fontStyle: 'italic' }}>{cat.notes}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommended banks (bank account step) */}
          {step.recommended_banks && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, fontFamily: 'Syne', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                Recommended Banks for SMEs
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {step.recommended_banks.map((bank, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: 10, padding: '9px 12px', borderRadius: 9,
                    background: 'var(--input-bg)', border: '1px solid var(--border)',
                  }}>
                    <Building2 size={13} style={{ color: accentColor, flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 12, color: 'var(--text)' }}>{bank.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{bank.notes}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ZDA incentives */}
          {step.incentives && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, fontFamily: 'Syne', fontWeight: 700, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Available Incentives
              </div>
              {step.incentives.map((inc, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                  <Zap size={11} style={{ color: 'var(--teal)', flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: 12, color: 'var(--text)' }}>{inc}</span>
                </div>
              ))}
            </div>
          )}

          {/* Tips */}
          {step.tips && step.tips.length > 0 && (
            <div style={{
              marginTop: 16, padding: '12px 14px',
              background: 'rgba(232,151,62,0.06)', border: '1px solid rgba(232,151,62,0.2)',
              borderLeft: '3px solid var(--gold)', borderRadius: '0 10px 10px 0',
            }}>
              <div style={{ fontSize: 10, fontFamily: 'Syne', fontWeight: 700, color: 'var(--gold)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                KIP Tips
              </div>
              {step.tips.map((tip, i) => (
                <div key={i} style={{ display: 'flex', gap: 7, marginBottom: 5 }}>
                  <Info size={11} style={{ color: 'var(--gold)', flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>{tip}</span>
                </div>
              ))}
            </div>
          )}

          {/* Forms + Portal + Ask KIP links */}
          <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {step.forms && step.forms.length > 0 && (
              <Link
                to="/templates?filter=startup"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 9, textDecoration: 'none',
                  background: 'var(--blue-dim)', border: '1px solid rgba(43,127,255,0.3)',
                  fontFamily: 'Syne', fontWeight: 600, fontSize: 12, color: 'var(--blue-bright)',
                }}
              >
                <FileText size={12} />
                View {step.forms.length} Required Form{step.forms.length > 1 ? 's' : ''}
              </Link>
            )}
            {step.portal && (
              <a
                href={step.portal}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 9, textDecoration: 'none',
                  background: `${accentColor}14`, border: `1px solid ${accentColor}40`,
                  fontFamily: 'Syne', fontWeight: 600, fontSize: 12, color: accentColor,
                }}
              >
                <ExternalLink size={12} />
                Visit {authority.name || 'Official'} Portal
              </a>
            )}
            {/* ── Ask KIP button — opens StartupChatPage pre-seeded with this step ── */}
            <Link
              to={`/startup/chat/${step.id}`}
              state={{
                stepContext: {
                  title:        step.title,
                  authorityName: authority.full_name || authority.name || '',
                  summary:      step.summary,
                  what_you_get: step.what_you_get,
                  requirements: step.requirements,
                  costs:        step.costs,
                  timeline:     step.timeline,
                  portal:       step.portal,
                  tips:         step.tips,
                },
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 9, textDecoration: 'none',
                background: 'linear-gradient(135deg, rgba(0,240,200,0.12), rgba(43,127,255,0.08))',
                border: '1px solid rgba(0,240,200,0.35)',
                fontFamily: 'Syne', fontWeight: 700, fontSize: 12, color: 'var(--teal)',
                transition: 'all 0.2s ease',
              }}
            >
              <MessageSquare size={12} />
              Ask KIP
            </Link>
          </div>

          {/* Authority contact */}
          {authority.name && (
            <div style={{ marginTop: 12, fontSize: 11, color: 'var(--faint)' }}>
              {authority.phone && <span style={{ marginRight: 16 }}>📞 {authority.phone}</span>}
              {authority.email && authority.email !== 'N/A — visit in person' && (
                <span>✉ {authority.email}</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── COMPLIANCE CALENDAR SECTION ─────────────────────────────────────────────

function ComplianceCalendarSection() {
  const { monthly, quarterly, annual } = COMPLIANCE_CALENDAR
  const sections = [
    { key: 'monthly',   label: 'Monthly',   color: 'var(--blue-bright)', items: monthly   },
    { key: 'quarterly', label: 'Quarterly',  color: 'var(--teal)',        items: quarterly },
    { key: 'annual',    label: 'Annual',     color: 'var(--gold)',        items: annual    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>
          Ongoing Compliance Calendar
        </h2>
        <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.65 }}>
          Registration is just the beginning. Every business in Zambia has recurring obligations. Missing these attracts fines and penalties. Use this calendar to plan your compliance year.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {sections.map(({ key, label, color, items }) => (
          <div key={key}>
            {/* Section header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
              paddingBottom: 10, borderBottom: `2px solid ${color}40`,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Calendar size={15} style={{ color }} />
              </div>
              <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 15, color }}>
                {label} Obligations
              </span>
            </div>

            {/* Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map((item, i) => (
                <div key={i} style={{
                  display: 'grid',
                  gridTemplateColumns: '180px 1fr auto',
                  gap: 14, alignItems: 'center',
                  padding: '12px 16px', borderRadius: 12,
                  background: 'var(--card)', border: '1px solid var(--border)',
                }}>
                  {/* Deadline */}
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--faint)', fontFamily: 'Syne', fontWeight: 600, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Deadline
                    </div>
                    <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 12, color }}>
                      {item.deadline}
                    </div>
                  </div>
                  {/* Obligation */}
                  <div>
                    <div style={{ fontFamily: 'Syne', fontWeight: 600, fontSize: 13, color: 'var(--text)', marginBottom: 2 }}>
                      {item.obligation}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                      {item.notes}
                    </div>
                  </div>
                  {/* Authority tag */}
                  <div style={{
                    fontSize: 10, fontFamily: 'Syne', fontWeight: 700,
                    padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap',
                    background: `${color}15`, color, border: `1px solid ${color}30`,
                  }}>
                    {item.authority}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer warning */}
      <div style={{
        marginTop: 24, padding: '14px 16px', borderRadius: 12,
        background: 'rgba(255,77,106,0.08)', border: '1px solid rgba(255,77,106,0.25)',
        display: 'flex', gap: 12, alignItems: 'flex-start',
      }}>
        <AlertTriangle size={15} style={{ color: 'var(--red)', flexShrink: 0, marginTop: 1 }} />
        <div>
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13, color: 'var(--red)', marginBottom: 4 }}>
            Penalties for Non-Compliance
          </div>
          <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.65, margin: 0 }}>
            ZRA levies a <strong style={{ color: 'var(--text)' }}>penalty of K500–K10,000</strong> for late filing plus interest on unpaid amounts. NAPSA charges a <strong style={{ color: 'var(--text)' }}>20% penalty</strong> on late contributions. Trading without a licence risks fines and forced closure by the council. File returns on time — even if you cannot pay the full amount.
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── PROGRESS INDICATOR ───────────────────────────────────────────────────────

function ProgressBar({ current, tabs }) {
  const currentIdx = tabs.findIndex(t => t.key === current)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      {tabs.map((tab, i) => {
        const done    = i < currentIdx
        const active  = i === currentIdx
        const Icon    = tab.icon
        return (
          <React.Fragment key={tab.key}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                background: done
                  ? 'var(--green)'
                  : active
                    ? 'linear-gradient(135deg, var(--blue), var(--teal))'
                    : 'var(--input-bg)',
                border: `2px solid ${done ? 'var(--green)' : active ? 'var(--blue)' : 'var(--border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.3s ease',
                boxShadow: active ? '0 0 16px rgba(43,127,255,0.4)' : 'none',
              }}>
                {done
                  ? <CheckCircle size={14} color="#fff" />
                  : <Icon size={14} color={active ? '#fff' : 'var(--faint)'} />
                }
              </div>
              <span style={{
                fontSize: 9, fontFamily: 'Syne', fontWeight: 700,
                color: active ? 'var(--blue-bright)' : done ? 'var(--green)' : 'var(--faint)',
                whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                {tab.label}
              </span>
            </div>
            {/* Connector line */}
            {i < tabs.length - 1 && (
              <div style={{
                flex: 1, height: 2, marginBottom: 16,
                background: done ? 'var(--green)' : 'var(--border)',
                transition: 'background 0.3s ease',
                minWidth: 20, maxWidth: 60,
              }} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function StartupPage() {
  const [activeTab,        setActiveTab]        = useState('choose_type')
  const [selectedType,     setSelectedType]     = useState(null)
  const [selectedStructure,setSelectedStructure]= useState(null)
  const [hasEmployees,     setHasEmployees]     = useState(false)
  const [seeksIncentives,  setSeeksIncentives]  = useState(false)
  const [typeSearch,       setTypeSearch]       = useState('')
  const roadmapRef = useRef(null)

  // Build dynamic roadmap based on selections
  const roadmap = selectedType
    ? buildRoadmap(selectedType.id, hasEmployees, seeksIncentives)
    : []

  // Filtered startup types
  const filteredTypes = STARTUP_TYPES.filter(t =>
    t.label.toLowerCase().includes(typeSearch.toLowerCase()) ||
    t.description.toLowerCase().includes(typeSearch.toLowerCase()) ||
    t.examples.some(e => e.toLowerCase().includes(typeSearch.toLowerCase()))
  )

  const handleTypeSelect = (type) => {
    setSelectedType(type)
  }

  const handleGoToRoadmap = () => {
    setActiveTab('roadmap')
    setTimeout(() => roadmapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
  }

  return (
    <Layout>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px 60px', position: 'relative', zIndex: 1 }}>

        {/* ── PAGE HEADER ── */}
        {/* Show the header illustration only when there's room beside the text */}
        <style>{`
          @media (min-width: 760px) {
            [data-startup-hero-figure] { display: flex !important; }
          }
        `}</style>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 380px', minWidth: 0 }}>
            {/* Eyebrow */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '4px 14px', borderRadius: 20, marginBottom: 12,
              background: 'var(--blue-dim)', border: '1px solid rgba(43,127,255,0.3)',
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--teal)' }} className="animate-pulse-soft" />
              <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 11, color: 'var(--blue-bright)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Business Development
              </span>
            </div>

            <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 'clamp(22px, 4vw, 32px)', color: 'var(--text)', marginBottom: 10, lineHeight: 1.15 }}>
              Start Your Business in Zambia
            </h1>
            <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, maxWidth: 620 }}>
              Step-by-step compliance guidance for every startup type. KIP walks you through every registration body — PACRA, ZRA, NAPSA, NHIMA, WCFCB, and sector-specific licences — so nothing gets missed.
            </p>
          </div>
          <div className="kip-card" style={{ padding: 12, flexShrink: 0, display: 'none' }} data-startup-hero-figure>
            <BusinessIllustration width={220} height={165} />
          </div>
        </div>

        {/* ── PROGRESS INDICATOR ── */}
        <div style={{ marginBottom: 28 }}>
          <ProgressBar current={activeTab} tabs={TABS} />
        </div>

        {/* ── TABS ── */}
        <div style={{
          display: 'flex', gap: 4, borderBottom: '1px solid var(--border)',
          marginBottom: 28, overflowX: 'auto', scrollbarWidth: 'none',
        }}>
          {TABS.map(tab => {
            const Icon   = tab.icon
            const active = activeTab === tab.key
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '10px 18px', background: 'none', border: 'none',
                fontFamily: 'Syne', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                color: active ? 'var(--blue-bright)' : 'var(--muted)',
                borderBottom: `2px solid ${active ? 'var(--blue-bright)' : 'transparent'}`,
                marginBottom: -1, whiteSpace: 'nowrap', flexShrink: 0,
                transition: 'all 0.2s ease',
              }}>
                <Icon size={14} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* ══════════════════════════════════════════════════════════════
            TAB 1 — CHOOSE STARTUP TYPE
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'choose_type' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, marginBottom: 18, flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 18, color: 'var(--text)', marginBottom: 5 }}>
                  What kind of startup are you building?
                </h2>
                <p style={{ fontSize: 13, color: 'var(--muted)' }}>
                  Select your startup type to get a tailored registration roadmap.
                </p>
              </div>
              {/* Search */}
              <div style={{ position: 'relative', flexShrink: 0, width: 220 }}>
                <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--faint)' }} />
                <input
                  value={typeSearch}
                  onChange={e => setTypeSearch(e.target.value)}
                  placeholder="Search startup types…"
                  className="kip-input"
                  style={{ paddingLeft: 34, fontSize: 13 }}
                />
              </div>
            </div>

            {/* Grid of startup type cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, marginBottom: 24 }}>
              {filteredTypes.map(type => (
                <StartupTypeCard
                  key={type.id}
                  type={type}
                  selected={selectedType?.id === type.id}
                  onClick={handleTypeSelect}
                />
              ))}
              {filteredTypes.length === 0 && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 0', color: 'var(--faint)', fontSize: 13 }}>
                  No startup types match "{typeSearch}"
                </div>
              )}
            </div>

            {/* Employee and incentive toggles */}
            {selectedType && (
              <div className="animate-slide-up" style={{
                padding: '18px 20px', borderRadius: 14, marginBottom: 20,
                background: `${selectedType.color}0A`,
                border: `1px solid ${selectedType.color}30`,
              }}>
                <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13, color: 'var(--text)', marginBottom: 14 }}>
                  Tell KIP more about your startup
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Employees toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>
                        Will you hire employees?
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                        Adds NAPSA, NHIMA, and WCFCB registration steps
                      </div>
                    </div>
                    <button onClick={() => setHasEmployees(v => !v)} style={{
                      width: 46, height: 24, borderRadius: 12, cursor: 'pointer', border: 'none',
                      background: hasEmployees ? 'var(--green)' : 'var(--border)',
                      position: 'relative', transition: 'background 0.2s ease', flexShrink: 0,
                    }}>
                      <span style={{
                        position: 'absolute', top: 3, width: 18, height: 18, borderRadius: '50%', background: '#fff',
                        left: hasEmployees ? 24 : 3, transition: 'left 0.2s ease',
                      }} />
                    </button>
                  </div>
                  {/* Investment incentives toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>
                        Seeking investment incentives (ZDA)?
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                        For businesses investing K250,000+ or in priority sectors
                      </div>
                    </div>
                    <button onClick={() => setSeeksIncentives(v => !v)} style={{
                      width: 46, height: 24, borderRadius: 12, cursor: 'pointer', border: 'none',
                      background: seeksIncentives ? 'var(--teal)' : 'var(--border)',
                      position: 'relative', transition: 'background 0.2s ease', flexShrink: 0,
                    }}>
                      <span style={{
                        position: 'absolute', top: 3, width: 18, height: 18, borderRadius: '50%', background: '#fff',
                        left: seeksIncentives ? 24 : 3, transition: 'left 0.2s ease',
                      }} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* CTA */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button
                onClick={() => setActiveTab('structure')}
                disabled={!selectedType}
                className="kip-btn kip-btn-primary"
                style={{ fontSize: 14, padding: '12px 24px', opacity: !selectedType ? 0.5 : 1 }}
              >
                Next — Choose Structure <ArrowRight size={15} />
              </button>
              {selectedType && (
                <button
                  onClick={handleGoToRoadmap}
                  className="kip-btn kip-btn-ghost"
                  style={{ fontSize: 14, padding: '12px 24px' }}
                >
                  Skip to Registration Steps
                </button>
              )}
            </div>

            {!selectedType && (
              <p style={{ fontSize: 12, color: 'var(--faint)', marginTop: 10 }}>
                Select a startup type above to continue.
              </p>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 2 — BUSINESS STRUCTURE
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'structure' && (
          <div>
            <div style={{ marginBottom: 18 }}>
              <h2 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 18, color: 'var(--text)', marginBottom: 5 }}>
                Choose Your Business Structure
              </h2>
              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.65, maxWidth: 600 }}>
                The structure you choose determines your liability, how you pay tax, how you raise money, and your ongoing compliance obligations. Take time to choose carefully — changing structure later involves legal work.
              </p>
            </div>

            {/* Info callout */}
            <div style={{
              display: 'flex', gap: 10, padding: '12px 16px', marginBottom: 20,
              background: 'var(--blue-dim)', border: '1px solid rgba(43,127,255,0.2)',
              borderRadius: 12,
            }}>
              <Info size={14} style={{ color: 'var(--blue-bright)', flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.65, margin: 0 }}>
                <strong style={{ color: 'var(--text)' }}>Most small businesses in Zambia</strong> start as a <strong style={{ color: 'var(--blue-bright)' }}>Business Name</strong> (fastest, cheapest) or a <strong style={{ color: 'var(--blue-bright)' }}>Private Limited Company</strong> (better for growth, investment, and credibility). NGOs and associations use the Registrar of Societies instead of PACRA.
              </p>
            </div>

            {/* Structure cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
              {BUSINESS_STRUCTURES.map(structure => (
                <StructureCard
                  key={structure.id}
                  structure={structure}
                  selected={selectedStructure?.id === structure.id}
                  onClick={setSelectedStructure}
                />
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button
                onClick={() => setActiveTab('choose_type')}
                className="kip-btn kip-btn-ghost"
                style={{ fontSize: 14, padding: '12px 24px' }}
              >
                ← Back
              </button>
              <button
                onClick={() => setActiveTab('roadmap')}
                disabled={!selectedStructure}
                className="kip-btn kip-btn-primary"
                style={{ fontSize: 14, padding: '12px 24px', opacity: !selectedStructure ? 0.5 : 1 }}
              >
                Next — Registration Steps <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 3 — REGISTRATION ROADMAP
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'roadmap' && (
          <div ref={roadmapRef}>
            {/* Header */}
            <div style={{ marginBottom: 18 }}>
              <h2 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 18, color: 'var(--text)', marginBottom: 5 }}>
                Your Registration Roadmap
                {selectedType && (
                  <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, color: 'var(--muted)', marginLeft: 10 }}>
                    — {selectedType.emoji} {selectedType.label}
                  </span>
                )}
              </h2>
              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.65 }}>
                {selectedType
                  ? `${roadmap.length} steps to fully register your ${selectedType.label.toLowerCase()} startup. Click each step to expand.`
                  : 'Complete the universal registration steps — then customise by selecting your startup type in Step 1.'
                }
              </p>
            </div>

            {/* Summary stats row */}
            {selectedType && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 20 }}>
                {[
                  {
                    label: 'Total Steps',
                    value: roadmap.length,
                    color: 'var(--blue-bright)',
                    icon: CheckCircle,
                  },
                  {
                    label: 'Mandatory',
                    value: roadmap.filter(s => s.mandatory !== false).length,
                    color: 'var(--red)',
                    icon: AlertTriangle,
                  },
                  {
                    label: 'Optional',
                    value: roadmap.filter(s => s.mandatory === false).length,
                    color: 'var(--gold)',
                    icon: Info,
                  },
                  {
                    label: 'Est. Total Cost',
                    value: 'K1,000+',
                    color: 'var(--green)',
                    icon: DollarSign,
                  },
                ].map(({ label, value, color, icon: Icon }) => (
                  <div key={label} style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--card)', border: '1px solid var(--border)' }}>
                    <Icon size={13} style={{ color, marginBottom: 5 }} />
                    <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 20, color }}>{value}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'Syne', fontWeight: 600, marginTop: 2 }}>{label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* No type selected — show default universal steps */}
            {!selectedType && (
              <div style={{
                padding: '16px 18px', borderRadius: 12, marginBottom: 20,
                background: 'var(--gold-dim)', border: '1px solid rgba(232,151,62,0.3)',
                display: 'flex', gap: 10,
              }}>
                <Info size={15} style={{ color: 'var(--gold)', flexShrink: 0, marginTop: 1 }} />
                <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.65 }}>
                  Showing the <strong style={{ color: 'var(--text)' }}>4 universal registration steps</strong> that apply to all Zambian businesses.{' '}
                  <button onClick={() => setActiveTab('choose_type')} style={{ background: 'none', border: 'none', color: 'var(--blue-bright)', cursor: 'pointer', fontFamily: 'Syne', fontWeight: 700, fontSize: 13, padding: 0 }}>
                    Select a startup type
                  </button>{' '}
                  to see the complete tailored roadmap.
                </div>
              </div>
            )}

            {/* Roadmap steps */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
              {(roadmap.length > 0 ? roadmap : []).map((step, i) => (
                <StepCard key={step.id} step={step} index={i} />
              ))}
            </div>

            {/* Forms shortcut banner */}
            <div style={{
              padding: '16px 20px', borderRadius: 14,
              background: 'linear-gradient(135deg, rgba(43,127,255,0.1), rgba(0,240,200,0.06))',
              border: '1px solid rgba(43,127,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 14, flexWrap: 'wrap', marginBottom: 16,
            }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--blue-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileText size={17} style={{ color: 'var(--blue-bright)' }} />
                </div>
                <div>
                  <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 2 }}>
                    All Official Forms in One Place
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    PACRA, ZRA, NAPSA, NHIMA, WCFCB, NCC and more — searchable and ready to access.
                  </div>
                </div>
              </div>
              <Link
                to="/templates?filter=startup"
                className="kip-btn kip-btn-primary"
                style={{ fontSize: 13, padding: '9px 18px', flexShrink: 0 }}
              >
                <FileText size={14} /> View All Forms
              </Link>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setActiveTab('structure')} className="kip-btn kip-btn-ghost" style={{ fontSize: 13, padding: '10px 20px' }}>
                ← Back
              </button>
              <button onClick={() => setActiveTab('compliance')} className="kip-btn kip-btn-primary" style={{ fontSize: 13, padding: '10px 20px' }}>
                Next — Compliance Calendar <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 4 — COMPLIANCE CALENDAR
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'compliance' && (
          <div>
            <ComplianceCalendarSection />
            <div style={{ marginTop: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button onClick={() => setActiveTab('roadmap')} className="kip-btn kip-btn-ghost" style={{ fontSize: 13, padding: '10px 20px' }}>
                ← Registration Steps
              </button>
              <Link to="/chat" className="kip-btn kip-btn-teal" style={{ fontSize: 13, padding: '10px 20px' }}>
                <Zap size={14} /> Ask KIP a Startup Question
              </Link>
              <Link to="/templates?filter=startup" className="kip-btn kip-btn-ghost" style={{ fontSize: 13, padding: '10px 20px' }}>
                <FileText size={14} /> View All Forms
              </Link>
            </div>
          </div>
        )}

      </div>
    </Layout>
  )
}

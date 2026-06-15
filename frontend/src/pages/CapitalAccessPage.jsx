import React, { useState, useEffect } from 'react'
import {
  DollarSign, Search, CheckCircle, ExternalLink,
  ChevronDown, ChevronUp, Zap, Loader2, MapPin,
  Building2, Clock, Percent, FileText, ArrowRight, Info
} from 'lucide-react'
import Layout from '../components/Layout'
import KipMarkdown from '../components/KipMarkdown'
import api from '../lib/api'
import toast from 'react-hot-toast'

const TYPE_COLORS = {
  grant:          { bg: 'rgba(26,224,110,0.1)',  border: 'rgba(26,224,110,0.3)',  text: 'var(--green)',       label: 'Grant'          },
  loan:           { bg: 'rgba(43,127,255,0.1)',  border: 'rgba(43,127,255,0.3)',  text: 'var(--blue-bright)', label: 'Loan'           },
  grant_loan:     { bg: 'rgba(232,151,62,0.1)',  border: 'rgba(232,151,62,0.3)',  text: 'var(--gold)',        label: 'Grant / Loan'   },
  training_grant: { bg: 'rgba(0,240,200,0.1)',   border: 'rgba(0,240,200,0.3)',   text: 'var(--teal)',        label: 'Training + Fund'},
}

const SECTORS = [
  'Retail / Trading', 'Food & Beverage', 'Agriculture / Farming',
  'Manufacturing', 'Services', 'Technology', 'Transport / Logistics',
  'Construction', 'Tourism / Hospitality', 'Healthcare', 'Education',
  'Creative / Media', 'Energy', 'Other',
]

/* ── Match score ring ─────────────────────────────── */
function ScoreRing({ score, color }) {
  const r   = 20, c = 2 * Math.PI * r
  const pct = (score / 100) * c
  return (
    <svg width={50} height={50} viewBox="0 0 50 50">
      <circle cx={25} cy={25} r={r} fill="none" stroke="var(--border)" strokeWidth={4} />
      <circle cx={25} cy={25} r={r} fill="none" stroke={color} strokeWidth={4}
        strokeDasharray={`${pct} ${c}`} strokeLinecap="round"
        transform="rotate(-90 25 25)" />
      <text x={25} y={30} textAnchor="middle" fontSize={11}
        fontFamily="Syne" fontWeight={800} fill={color}>
        {score}%
      </text>
    </svg>
  )
}

/* ── Funding source card ──────────────────────────── */
function FundingCard({ source, rank, onGenerateLetter }) {
  const [expanded, setExpanded] = useState(rank === 0)
  const tc = TYPE_COLORS[source.type] || TYPE_COLORS.loan
  const score = source.match_score ?? 75

  return (
    <div style={{
      border: `1px solid ${rank === 0 ? source.color + '55' : 'var(--border)'}`,
      borderRadius: 16, overflow: 'hidden',
      background: rank === 0
        ? `linear-gradient(135deg, ${source.color}0A, transparent)`
        : 'var(--card)',
      transition: 'all 0.2s ease',
    }}>
      {/* Card header */}
      <button onClick={() => setExpanded(e => !e)} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 14,
        padding: '16px 18px', background: 'none', border: 'none', cursor: 'pointer',
        textAlign: 'left',
      }}>
        {/* Rank badge */}
        <div style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          background: rank === 0 ? source.color : 'var(--input-bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Syne', fontWeight: 800, fontSize: 12,
          color: rank === 0 ? '#fff' : 'var(--faint)',
        }}>
          {rank + 1}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
            <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>
              {source.name}
            </span>
            <span style={{
              fontSize: 10, fontFamily: 'Syne', fontWeight: 700,
              padding: '2px 8px', borderRadius: 20,
              background: tc.bg, border: `1px solid ${tc.border}`, color: tc.text,
            }}>
              {tc.label}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              K{source.min_amount.toLocaleString()} – K{source.max_amount.toLocaleString()}
            </span>
            {source.interest_rate && (
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                {source.interest_rate}
              </span>
            )}
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              <Clock size={10} style={{ marginRight: 3 }} />{source.processing}
            </span>
          </div>
        </div>

        <ScoreRing score={score} color={source.color} />
        {expanded
          ? <ChevronUp size={16} style={{ color: 'var(--muted)', flexShrink: 0 }} />
          : <ChevronDown size={16} style={{ color: 'var(--muted)', flexShrink: 0 }} />
        }
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ padding: '0 18px 18px', borderTop: '1px solid var(--border)' }}>
          <div style={{ paddingTop: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 14 }}>

            {/* Eligibility */}
            <div>
              <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Eligibility
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {source.eligibility.map((e, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8 }}>
                    <CheckCircle size={13} style={{ color: source.color, flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontSize: 12.5, color: 'var(--text)', lineHeight: 1.5 }}>{e}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Requirements */}
            <div>
              <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Documents Required
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {source.requirements.map((r, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8 }}>
                    <FileText size={12} style={{ color: 'var(--muted)', flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontSize: 12.5, color: 'var(--text)', lineHeight: 1.5 }}>{r}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Notes */}
          {source.notes && (
            <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 10 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <Info size={13} style={{ color: source.color, flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.65 }}>{source.notes}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <a href={source.website} target="_blank" rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 9, textDecoration: 'none',
                background: `${source.color}14`, border: `1px solid ${source.color}40`,
                fontFamily: 'Syne', fontWeight: 600, fontSize: 12, color: source.color,
              }}>
              <ExternalLink size={12} /> Visit Website
            </a>
            <button onClick={() => onGenerateLetter(source)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 9, cursor: 'pointer',
                background: 'var(--blue-dim)', border: '1px solid rgba(43,127,255,0.3)',
                fontFamily: 'Syne', fontWeight: 600, fontSize: 12, color: 'var(--blue-bright)',
              }}>
              <Zap size={12} /> Generate Application Letter
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Letter modal ─────────────────────────────────── */
function LetterModal({ source, businessName, onClose }) {
  const [loading,  setLoading]  = useState(false)
  const [letter,   setLetter]   = useState('')
  const [recipient,setRecipient]= useState('')
  const [amount,   setAmount]   = useState('')
  const [purpose,  setPurpose]  = useState('')

  const generate = async () => {
    setLoading(true)
    try {
      const { data } = await api.post('/templates/generate-letter', {
        prompt_type: 'loan_request_letter',
        recipient:   recipient || source.contact,
        amount:      amount    || null,
        notes:       `Applying to ${source.name}. Purpose: ${purpose || 'business financing'}. ${source.notes}`,
      })
      setLetter(data.letter_text)
    } catch { toast.error('Letter generation failed.') }
    finally  { setLoading(false) }
  }

  const copy = () => {
    navigator.clipboard.writeText(letter)
    toast.success('Copied to clipboard!')
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 560, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 2 }}>
            Application Letter — {source.name}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{businessName}</div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {!letter ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontFamily: 'Syne', fontWeight: 600, fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Addressed to</label>
                <input value={recipient} onChange={e => setRecipient(e.target.value)}
                  placeholder={source.contact} className="kip-input" style={{ fontSize: 13 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontFamily: 'Syne', fontWeight: 600, fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Amount requesting</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--gold)', fontFamily: 'Syne', fontWeight: 700 }}>K</span>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                    placeholder="0" className="kip-input" style={{ fontSize: 13, paddingLeft: 26 }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontFamily: 'Syne', fontWeight: 600, fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Purpose of funding</label>
                <textarea value={purpose} onChange={e => setPurpose(e.target.value)}
                  placeholder="e.g. Purchase of stock and working capital for my retail business..."
                  className="kip-input" rows={3} style={{ resize: 'none', fontSize: 13 }} />
              </div>
              <button onClick={generate} disabled={loading} className="kip-btn kip-btn-primary" style={{ width: '100%', padding: '12px 0', fontSize: 14 }}>
                {loading
                  ? <><Loader2 size={15} style={{ animation: 'spinSlow 0.8s linear infinite' }} /> Generating…</>
                  : <><Zap size={15} /> Generate Letter</>
                }
              </button>
            </div>
          ) : (
            <div>
              <div style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 12, whiteSpace: 'pre-wrap', fontSize: 13, color: 'var(--text)', lineHeight: 1.7 }}>
                {letter}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={copy} className="kip-btn kip-btn-primary" style={{ flex: 1, fontSize: 13 }}>Copy Letter</button>
                <button onClick={() => setLetter('')} className="kip-btn kip-btn-ghost" style={{ fontSize: 13 }}>Regenerate</button>
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <button onClick={onClose} style={{ width: '100%', padding: '10px 0', borderRadius: 10, background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--muted)', cursor: 'pointer', fontFamily: 'Syne', fontWeight: 600, fontSize: 13 }}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Main page ────────────────────────────────────── */
export default function CapitalAccessPage() {
  const [form, setForm] = useState({
    business_name:    '',
    business_sector:  '',
    location:         '',
    capital_needed:   '',
    months_operating: '',
    current_employees:'',
    purpose:          '',
  })
  const [results,      setResults]      = useState(null)
  const [loading,      setLoading]      = useState(false)
  const [allSources,   setAllSources]   = useState([])
  const [letterSource, setLetterSource] = useState(null)
  const [tab,          setTab]          = useState('finder') // finder | browse

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    api.get('/capital/sources')
      .then(r => setAllSources(r.data.sources || []))
      .catch(() => {})
  }, [])

  const handleMatch = async () => {
    if (!form.business_name.trim())   { toast.error('Enter your business name.'); return }
    if (!form.business_sector.trim()) { toast.error('Select your business sector.'); return }
    setLoading(true)
    try {
      const { data } = await api.post('/capital/match', {
        ...form,
        capital_needed:     form.capital_needed    ? parseFloat(form.capital_needed)    : null,
        months_operating:   form.months_operating  ? parseInt(form.months_operating)    : 0,
        current_employees:  form.current_employees ? parseInt(form.current_employees)  : 0,
      })
      setResults(data)
      setTab('finder')
    } catch { toast.error('Could not run matching. Try again.') }
    finally  { setLoading(false) }
  }

  return (
    <Layout>
      {letterSource && (
        <LetterModal
          source={letterSource}
          businessName={form.business_name || 'My Business'}
          onClose={() => setLetterSource(null)}
        />
      )}

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '20px 16px', position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--green-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={18} style={{ color: 'var(--green)' }} />
            </div>
            <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 22, color: 'var(--text)', margin: 0 }}>
              Capital Access Finder
            </h1>
          </div>
          <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.65, maxWidth: 620 }}>
            Find the right funding source for your business. KIP matches your profile against CDF, CEEC, DBZ, ZANACO, FNB, and other Zambian funding options — then generates the application letter for you.
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 22 }}>
          {[
            { key: 'finder', label: 'Smart Matcher' },
            { key: 'browse', label: `All Sources (${allSources.length})` },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)} style={{
              padding: '10px 20px', background: 'none', border: 'none',
              fontFamily: 'Syne', fontWeight: 700, fontSize: 13, cursor: 'pointer',
              color: tab === key ? 'var(--blue-bright)' : 'var(--muted)',
              borderBottom: `2px solid ${tab === key ? 'var(--blue-bright)' : 'transparent'}`,
              marginBottom: -1,
            }}>
              {label}
            </button>
          ))}
        </div>

        {/* Smart Matcher */}
        {tab === 'finder' && (
          <div>
            {!results ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 24 }}>
                {/* Form */}
                <div>
                  <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 16 }}>
                    Tell KIP about your business
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontFamily: 'Syne', fontWeight: 600, fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Business name *</label>
                      <input value={form.business_name} onChange={e => set('business_name', e.target.value)}
                        placeholder="e.g. Chanda's Grocery Store" className="kip-input" style={{ fontSize: 13 }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontFamily: 'Syne', fontWeight: 600, fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Business sector *</label>
                      <select value={form.business_sector} onChange={e => set('business_sector', e.target.value)}
                        className="kip-input" style={{ fontSize: 13 }}>
                        <option value="">Select sector…</option>
                        {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontFamily: 'Syne', fontWeight: 600, fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
                        <MapPin size={11} style={{ marginRight: 3 }} />Location
                      </label>
                      <input value={form.location} onChange={e => set('location', e.target.value)}
                        placeholder="e.g. Kitwe, Copperbelt" className="kip-input" style={{ fontSize: 13 }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontFamily: 'Syne', fontWeight: 600, fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Capital needed (K)</label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--gold)', fontFamily: 'Syne', fontWeight: 700 }}>K</span>
                        <input type="number" value={form.capital_needed} onChange={e => set('capital_needed', e.target.value)}
                          placeholder="50000" className="kip-input" style={{ fontSize: 13, paddingLeft: 26 }} />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <label style={{ display: 'block', fontFamily: 'Syne', fontWeight: 600, fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Months operating</label>
                        <input type="number" value={form.months_operating} onChange={e => set('months_operating', e.target.value)}
                          placeholder="0" className="kip-input" style={{ fontSize: 13 }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontFamily: 'Syne', fontWeight: 600, fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Employees</label>
                        <input type="number" value={form.current_employees} onChange={e => set('current_employees', e.target.value)}
                          placeholder="0" className="kip-input" style={{ fontSize: 13 }} />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontFamily: 'Syne', fontWeight: 600, fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>What will the funding be used for?</label>
                      <textarea value={form.purpose} onChange={e => set('purpose', e.target.value)}
                        placeholder="e.g. Purchase equipment, buy stock, hire staff..."
                        className="kip-input" rows={2} style={{ resize: 'none', fontSize: 13 }} />
                    </div>
                    <button onClick={handleMatch} disabled={loading} className="kip-btn kip-btn-primary"
                      style={{ width: '100%', padding: '13px 0', fontSize: 14, marginTop: 4 }}>
                      {loading
                        ? <><Loader2 size={16} style={{ animation: 'spinSlow 0.8s linear infinite' }} /> Finding matches…</>
                        : <><Search size={15} /> Find My Funding Options</>
                      }
                    </button>
                  </div>
                </div>

                {/* Info panel */}
                <div>
                  <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 14 }}>
                    Available funding in Zambia
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {allSources.map(src => {
                      const tc = TYPE_COLORS[src.type] || TYPE_COLORS.loan
                      return (
                        <div key={src.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 10 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: src.color, flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{src.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>K{src.min_amount.toLocaleString()} – K{src.max_amount.toLocaleString()}</div>
                          </div>
                          <span style={{ fontSize: 10, fontFamily: 'Syne', fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: tc.bg, color: tc.text, flexShrink: 0 }}>
                            {tc.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ) : (
              /* Results */
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 16, color: 'var(--text)', marginBottom: 3 }}>
                      {results.matches.length} matches found for {results.business}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                      {results.sector} · {results.location || 'Zambia'} · K{(results.capital || 0).toLocaleString()} needed
                    </div>
                  </div>
                  <button onClick={() => setResults(null)} className="kip-btn kip-btn-ghost" style={{ fontSize: 12, padding: '8px 14px' }}>
                    ← New Search
                  </button>
                </div>

                {/* AI guidance */}
                {results.guidance?.advice && (
                  <div style={{ background: 'var(--blue-dim)', border: '1px solid rgba(43,127,255,0.25)', borderRadius: 14, padding: '14px 18px', marginBottom: 18 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <Zap size={14} style={{ color: 'var(--blue-bright)' }} />
                      <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13, color: 'var(--blue-bright)' }}>KIP Funding Advice</span>
                    </div>
                    <KipMarkdown content={results.guidance.advice} />
                  </div>
                )}

                {/* Matches */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {results.matches.map((src, i) => (
                    <FundingCard key={src.id} source={src} rank={i} onGenerateLetter={setLetterSource} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Browse all */}
        {tab === 'browse' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {allSources.map((src, i) => (
              <FundingCard key={src.id} source={src} rank={i} onGenerateLetter={setLetterSource} />
            ))}
          </div>
        )}

      </div>
    </Layout>
  )
}

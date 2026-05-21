import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Building2, Plus, MapPin, Users, TrendingUp, TrendingDown,
  DollarSign, ArrowRight, Zap, ChevronDown, ChevronUp,
  Target, BarChart2, Crown, Lock, X, CheckCircle, Loader2
} from 'lucide-react'
import Layout from '../components/Layout'
import KipMarkdown from '../components/KipMarkdown'
import { useAuth } from '../hooks/useAuth'
import api from '../lib/api'
import toast from 'react-hot-toast'

/* ── Premium gate ────────────────────────────────────── */
function PremiumGate() {
  return (
    <div style={{ maxWidth: 520, margin: '60px auto', textAlign: 'center', padding: '0 20px' }}>
      <div style={{ width: 64, height: 64, borderRadius: 20, background: 'var(--gold-dim)', border: '1px solid rgba(232,151,62,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
        <Crown size={28} style={{ color: 'var(--gold)' }} />
      </div>
      <h2 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 22, color: 'var(--text)', marginBottom: 10 }}>
        Enterprise Feature
      </h2>
      <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 24 }}>
        Multi-branch enterprise accounts are available on the Premium plan. Manage multiple branches, track consolidated performance, and assign branch managers — all from one central dashboard.
      </p>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px', marginBottom: 24, textAlign: 'left' }}>
        <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13, color: 'var(--gold)', marginBottom: 12 }}>What you get with Premium:</div>
        {[
          'Unlimited branches under one enterprise',
          'Consolidated revenue & profit dashboard',
          'KIP analysis across all branches',
          'Branch manager assignments',
          'Set monthly targets per branch',
          'Email notifications (coming soon)',
        ].map(f => (
          <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <CheckCircle size={13} style={{ color: 'var(--green)', flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>{f}</span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 13, color: 'var(--faint)' }}>Premium subscriptions launching 26th June 2026</div>
    </div>
  )
}

/* ── Create enterprise modal ─────────────────────────── */
function CreateEnterpriseModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', description: '', industry: '', headquarters: '' })
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.name.trim()) { toast.error('Enter enterprise name.'); return }
    setLoading(true)
    try {
      const { data } = await api.post('/enterprise/create', form)
      toast.success('Enterprise created!')
      onCreated(data)
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not create enterprise.')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, width: '100%', maxWidth: 480, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16, color: 'var(--text)', margin: 0 }}>Create Enterprise</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}><X size={19} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { k: 'name',         l: 'Enterprise name *',   p: 'e.g. Maloba Holdings',            req: true  },
            { k: 'industry',     l: 'Industry',            p: 'e.g. Retail, Hospitality, Food',  req: false },
            { k: 'headquarters', l: 'Headquarters location',p: 'e.g. Lusaka CBD',                req: false },
          ].map(({ k, l, p }) => (
            <div key={k}>
              <label style={{ display: 'block', fontFamily: 'Syne', fontWeight: 600, fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>{l}</label>
              <input value={form[k]} onChange={e => set(k, e.target.value)} placeholder={p} className="kip-input" style={{ fontSize: 13 }} />
            </div>
          ))}
          <div>
            <label style={{ display: 'block', fontFamily: 'Syne', fontWeight: 600, fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Brief description of the enterprise..." className="kip-input" rows={2} style={{ resize: 'none', fontSize: 13 }} />
          </div>
          <button onClick={submit} disabled={loading} className="kip-btn kip-btn-primary" style={{ width: '100%', padding: '12px 0', marginTop: 4 }}>
            {loading ? <><Loader2 size={15} style={{ animation: 'spinSlow 0.8s linear infinite' }} /> Creating…</> : <><Building2 size={15} /> Create Enterprise</>}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Add branch modal ────────────────────────────────── */
function AddBranchModal({ enterpriseId, enterpriseName, onClose, onAdded }) {
  const [form, setForm] = useState({ branch_name: '', location: '', specialty: '', manager_email: '', monthly_target: '' })
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.branch_name.trim())  { toast.error('Enter branch name.'); return }
    if (!form.manager_email.trim()){ toast.error('Enter manager email.'); return }
    setLoading(true)
    try {
      const { data } = await api.post('/enterprise/add-branch', {
        enterprise_id:  enterpriseId,
        branch_name:    form.branch_name,
        location:       form.location || null,
        specialty:      form.specialty || null,
        manager_email:  form.manager_email,
        monthly_target: form.monthly_target ? parseFloat(form.monthly_target) : null,
      })
      toast.success(data.message)
      onAdded()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not add branch.')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, width: '100%', maxWidth: 480, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <h2 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16, color: 'var(--text)', margin: 0 }}>Add Branch</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}><X size={19} /></button>
        </div>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 18 }}>Adding a branch to <strong>{enterpriseName}</strong></p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { k: 'branch_name',   l: 'Branch name *',                    p: 'e.g. Kitwe Branch' },
            { k: 'location',      l: 'Location',                         p: 'e.g. Riverside, Kitwe' },
            { k: 'specialty',     l: 'Specialty / what this branch does', p: 'e.g. Electronics repair and accessories' },
          ].map(({ k, l, p }) => (
            <div key={k}>
              <label style={{ display: 'block', fontFamily: 'Syne', fontWeight: 600, fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>{l}</label>
              <input value={form[k]} onChange={e => set(k, e.target.value)} placeholder={p} className="kip-input" style={{ fontSize: 13 }} />
            </div>
          ))}
          <div>
            <label style={{ display: 'block', fontFamily: 'Syne', fontWeight: 600, fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
              Branch manager email *
              <span style={{ color: 'var(--faint)', fontWeight: 400, marginLeft: 6 }}>must have a KIP account</span>
            </label>
            <input type="email" value={form.manager_email} onChange={e => set('manager_email', e.target.value)}
              placeholder="manager@example.com" className="kip-input" style={{ fontSize: 13 }} />
          </div>
          <div>
            <label style={{ display: 'block', fontFamily: 'Syne', fontWeight: 600, fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Monthly revenue target (K)</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--gold)', fontFamily: 'Syne', fontWeight: 700 }}>K</span>
              <input type="number" value={form.monthly_target} onChange={e => set('monthly_target', e.target.value)}
                placeholder="0" className="kip-input" style={{ fontSize: 13, paddingLeft: 26 }} />
            </div>
          </div>
          <div style={{ background: 'var(--blue-dim)', border: '1px solid rgba(43,127,255,0.2)', borderRadius: 10, padding: '10px 12px', fontSize: 12, color: 'var(--muted)' }}>
            The branch manager will receive an in-app notification when they next log in to KIP.
          </div>
          <button onClick={submit} disabled={loading} className="kip-btn kip-btn-primary" style={{ width: '100%', padding: '12px 0' }}>
            {loading ? <><Loader2 size={15} style={{ animation: 'spinSlow 0.8s linear infinite' }} /> Adding…</> : <><Plus size={15} /> Add Branch</>}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Branch card ─────────────────────────────────────── */
function BranchCard({ branch, enterpriseId }) {
  const [expanded, setExpanded] = useState(false)
  const profit  = branch.profit_7d || 0
  const revenue = branch.revenue_7d || 0
  const target  = branch.monthly_target
  const pct     = target && revenue > 0 ? Math.min(100, ((revenue / (target / 4)) * 100)).toFixed(0) : null

  return (
    <div className="kip-card" style={{ padding: 0, overflow: 'hidden' }}>
      <button onClick={() => setExpanded(e => !e)} style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--blue-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Building2 size={17} style={{ color: 'var(--blue-bright)' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {branch.branch_name}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
              {branch.location && <span><MapPin size={10} style={{ marginRight: 3 }} />{branch.location}</span>}
              {branch.manager_name && <span>· {branch.manager_name}</span>}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 16, color: profit >= 0 ? 'var(--green)' : 'var(--red)' }}>
              K{revenue.toLocaleString()}
            </div>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>7-day revenue</div>
          </div>
          {expanded ? <ChevronUp size={16} style={{ color: 'var(--muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--muted)' }} />}
        </div>
      </button>

      {expanded && (
        <div style={{ padding: '0 18px 16px', borderTop: '1px solid var(--border)' }}>
          <div style={{ paddingTop: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(120px,1fr))', gap: 10, marginBottom: 14 }}>
            {[
              { l: 'Revenue',   v: `K${revenue.toLocaleString()}`,              c: 'var(--green)'       },
              { l: 'Profit',    v: `K${profit.toLocaleString()}`,               c: profit >= 0 ? 'var(--gold-bright)' : 'var(--red)' },
              { l: 'Customers', v: (branch.customers_7d || 0).toLocaleString(), c: 'var(--teal)'        },
              { l: 'Days logged',v: (branch.days_logged || 0).toString(),       c: 'var(--blue-bright)' },
            ].map(({ l, v, c }) => (
              <div key={l} style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'Syne', fontWeight: 600, marginBottom: 4 }}>{l}</div>
                <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 16, color: c }}>{v}</div>
              </div>
            ))}
          </div>

          {pct && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'Syne', fontWeight: 600 }}>Weekly target progress</span>
                <span style={{ fontSize: 11, color: 'var(--blue-bright)', fontFamily: 'Syne', fontWeight: 700 }}>{pct}%</span>
              </div>
              <div className="kip-progress">
                <div className="kip-progress-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}

          {branch.specialty && (
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12, fontStyle: 'italic' }}>
              {branch.specialty}
            </p>
          )}

          {branch.plan_id && (
            <Link to={`/business/${branch.plan_id}`} className="kip-btn kip-btn-ghost" style={{ fontSize: 12, padding: '8px 14px', display: 'inline-flex' }}>
              View Branch Dashboard <ArrowRight size={13} />
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Main Page ───────────────────────────────────────── */
export default function EnterprisePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [enterprises,    setEnterprises]    = useState([])
  const [selected,       setSelected]       = useState(null)
  const [enterpriseData, setEnterpriseData] = useState(null)
  const [analysis,       setAnalysis]       = useState('')
  const [loadingData,    setLoadingData]    = useState(false)
  const [loadingAnalysis,setLoadingAnalysis]= useState(false)
  const [showCreate,     setShowCreate]     = useState(false)
  const [showAddBranch,  setShowAddBranch]  = useState(false)

  const isPremium = ['premium','enterprise','pro'].includes((user?.plan_tier || 'free').toLowerCase())

  const loadEnterprises = () => {
    api.get('/enterprise/my-enterprises').then(r => {
      setEnterprises(r.data || [])
      if (r.data?.length && !selected) setSelected(r.data[0])
    }).catch(() => {})
  }

  useEffect(() => { loadEnterprises() }, [])

  useEffect(() => {
    if (!selected) return
    setLoadingData(true)
    setAnalysis('')
    api.get(`/enterprise/enterprise/${selected.id}`)
      .then(r => setEnterpriseData(r.data))
      .catch(() => toast.error('Could not load enterprise data.'))
      .finally(() => setLoadingData(false))
  }, [selected?.id])

  const runAnalysis = async () => {
    if (!selected) return
    setLoadingAnalysis(true)
    try {
      const { data } = await api.get(`/enterprise/enterprise/${selected.id}/kip-analysis`)
      setAnalysis(data.analysis)
    } catch { toast.error('Analysis failed.') }
    finally { setLoadingAnalysis(false) }
  }

  const branches       = enterpriseData?.branches || []
  const totalRevenue   = branches.reduce((s, b) => s + (b.revenue_7d  || 0), 0)
  const totalProfit    = branches.reduce((s, b) => s + (b.profit_7d   || 0), 0)
  const totalCustomers = branches.reduce((s, b) => s + (b.customers_7d|| 0), 0)

  if (!isPremium) return <Layout><PremiumGate /></Layout>

  return (
    <Layout>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '20px 16px', position: 'relative', zIndex: 1 }}>

        {/* Modals */}
        {showCreate && (
          <CreateEnterpriseModal
            onClose={() => setShowCreate(false)}
            onCreated={e => { loadEnterprises(); setSelected(e) }}
          />
        )}
        {showAddBranch && selected && (
          <AddBranchModal
            enterpriseId={selected.id}
            enterpriseName={selected.name}
            onClose={() => setShowAddBranch(false)}
            onAdded={() => {
              setLoadingData(true)
              api.get(`/enterprise/enterprise/${selected.id}`)
                .then(r => setEnterpriseData(r.data))
                .finally(() => setLoadingData(false))
            }}
          />
        )}

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 22 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Crown size={16} style={{ color: 'var(--gold)' }} />
              <span className="kip-badge kip-badge-gold">Enterprise</span>
            </div>
            <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 22, color: 'var(--text)', marginBottom: 3 }}>
              {selected?.name || 'Enterprise Dashboard'}
            </h1>
            {selected?.headquarters && (
              <p style={{ fontSize: 12, color: 'var(--muted)' }}>
                <MapPin size={11} style={{ marginRight: 4 }} />{selected.headquarters}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {enterprises.length > 1 && (
              <select value={selected?.id || ''} onChange={e => setSelected(enterprises.find(en => en.id === parseInt(e.target.value)))}
                className="kip-input" style={{ fontSize: 13, padding: '8px 12px', width: 'auto' }}>
                {enterprises.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            )}
            <button onClick={() => setShowCreate(true)} className="kip-btn kip-btn-ghost" style={{ fontSize: 13, padding: '8px 14px' }}>
              <Plus size={14} /> New Enterprise
            </button>
            {selected && (
              <button onClick={() => setShowAddBranch(true)} className="kip-btn kip-btn-primary" style={{ fontSize: 13, padding: '8px 14px' }}>
                <Plus size={14} /> Add Branch
              </button>
            )}
          </div>
        </div>

        {enterprises.length === 0 && (
          <div className="kip-card" style={{ padding: '44px 24px', textAlign: 'center' }}>
            <Building2 size={44} style={{ color: 'var(--faint)', margin: '0 auto 14px', display: 'block' }} className="animate-float" />
            <h2 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 8 }}>No enterprise yet</h2>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>Create your enterprise to start managing multiple branches from one central dashboard.</p>
            <button onClick={() => setShowCreate(true)} className="kip-btn kip-btn-primary" style={{ fontSize: 14 }}>
              <Building2 size={15} /> Create Enterprise
            </button>
          </div>
        )}

        {selected && !loadingData && (
          <>
            {/* Consolidated stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12, marginBottom: 16 }}>
              {[
                { l: 'Total Revenue (7d)',  v: `K${totalRevenue.toLocaleString()}`,   c: 'var(--green)'       },
                { l: 'Total Profit (7d)',   v: `K${totalProfit.toLocaleString()}`,    c: totalProfit >= 0 ? 'var(--gold-bright)' : 'var(--red)' },
                { l: 'Total Customers (7d)',v: totalCustomers.toLocaleString(),       c: 'var(--teal)'        },
                { l: 'Active Branches',     v: branches.length.toString(),            c: 'var(--blue-bright)' },
              ].map(({ l, v, c }) => (
                <div key={l} className="kip-card" style={{ padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'Syne', fontWeight: 600, marginBottom: 6 }}>{l}</div>
                  <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 22, color: c }}>{v}</div>
                </div>
              ))}
            </div>

            {/* KIP analysis */}
            <div className="kip-card" style={{ padding: '16px 18px', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: analysis ? 12 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Zap size={15} style={{ color: 'var(--gold-bright)' }} />
                  <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>KIP Enterprise Analysis</span>
                </div>
                <button onClick={runAnalysis} disabled={loadingAnalysis} className="kip-btn kip-btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }}>
                  {loadingAnalysis ? <><Loader2 size={12} style={{ animation: 'spinSlow 0.8s linear infinite' }} /> Analysing…</> : <><Zap size={12} /> {analysis ? 'Refresh' : 'Analyse All Branches'}</>}
                </button>
              </div>
              {analysis && <KipMarkdown content={analysis} />}
              {!analysis && !loadingAnalysis && (
                <p style={{ fontSize: 12, color: 'var(--faint)', marginTop: 8 }}>Click "Analyse All Branches" to get KIP's assessment of your enterprise performance.</p>
              )}
            </div>

            {/* Branches */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 12 }}>
                Branches ({branches.length})
              </div>
              {branches.length === 0 ? (
                <div className="kip-card" style={{ padding: '30px 24px', textAlign: 'center' }}>
                  <Plus size={32} style={{ color: 'var(--faint)', margin: '0 auto 10px', display: 'block' }} />
                  <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>No branches yet. Add your first branch to get started.</p>
                  <button onClick={() => setShowAddBranch(true)} className="kip-btn kip-btn-primary" style={{ fontSize: 13 }}>
                    <Plus size={14} /> Add First Branch
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {branches.map(b => <BranchCard key={b.id} branch={b} enterpriseId={selected.id} />)}
                </div>
              )}
            </div>
          </>
        )}

        {loadingData && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(43,127,255,0.2)', borderTopColor: 'var(--blue)', animation: 'spinSlow 0.8s linear infinite' }} />
          </div>
        )}

      </div>
    </Layout>
  )
}

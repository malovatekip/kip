import React, { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  MessageSquare, Lightbulb, CheckCircle, ArrowRight,
  MapPin, DollarSign, Rocket, TrendingUp, Zap, Activity
} from 'lucide-react'
import Layout from '../components/Layout'
import { useAuth } from '../hooks/useAuth'
import api from '../lib/api'

/* ── Animated counter ────────────────────────────────── */
function CountUp({ target, duration = 1200, prefix = '' }) {
  const [val, setVal] = useState(0)
  const started = useRef(false)
  useEffect(() => {
    if (started.current || !target) return
    started.current = true
    const step = target / (duration / 16)
    let cur = 0
    const t = setInterval(() => {
      cur += step
      if (cur >= target) { setVal(target); clearInterval(t) }
      else setVal(Math.floor(cur))
    }, 16)
    return () => clearInterval(t)
  }, [target, duration])
  return <>{prefix}{val}</>
}

/* ── KIP Score Dial ──────────────────────────────────── */
function ScoreDial({ score = 0, band = 'Explorer', band_desc = '' }) {
  const [drawn, setDrawn] = useState(0)
  const r = 54
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - drawn / 100)

  const bandColors = {
    Explorer: '#7B9ABB', Researcher: '#4B9EFF',
    Planner: '#00D4B1', Entrepreneur: '#F5A623', Operator: '#00E676'
  }
  const color = bandColors[band] || '#4B9EFF'

  useEffect(() => {
    const t = setTimeout(() => {
      let cur = 0
      const iv = setInterval(() => {
        cur += 1.4
        if (cur >= score) { setDrawn(score); clearInterval(iv) }
        else setDrawn(Math.floor(cur))
      }, 16)
      return () => clearInterval(iv)
    }, 400)
    return () => clearTimeout(t)
  }, [score])

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: 140, height: 140 }}>
        {/* Outer glow ring */}
        <div style={{
          position: 'absolute', inset: -6,
          borderRadius: '50%',
          background: `conic-gradient(${color}30 ${drawn}%, transparent ${drawn}%)`,
          filter: 'blur(8px)',
          transition: 'background 0.05s',
        }} />
        <svg width="140" height="140" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
          {/* Track */}
          <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
          {/* Background arc */}
          <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="12" />
          {/* Progress */}
          <circle
            cx="60" cy="60" r={r} fill="none"
            stroke={color} strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            className="score-circle"
            style={{ filter: `drop-shadow(0 0 6px ${color}90)` }}
          />
        </svg>
        {/* Center content */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{
            fontFamily: 'Syne', fontWeight: 800, fontSize: 34,
            color: '#fff', lineHeight: 1
          }}>
            {drawn}
          </span>
          <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>/ 100</span>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: 10 }}>
        <div style={{
          fontFamily: 'Syne', fontWeight: 700, fontSize: 13,
          color, letterSpacing: '0.04em'
        }}>{band}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{band_desc}</div>
      </div>
    </div>
  )
}

/* ── Stat Card ───────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, color, glow, delay = 0 }) {
  return (
    <div className="kip-card stat-card animate-slide-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="stat-icon" style={{ background: `${color}18`, boxShadow: `0 0 20px ${color}20` }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div>
        <div style={{
          fontFamily: 'Syne', fontWeight: 800, fontSize: 28,
          color: '#fff', lineHeight: 1
        }}>
          <CountUp target={value || 0} duration={1100} />
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3, fontWeight: 500 }}>{label}</div>
      </div>
    </div>
  )
}

/* ── Main ────────────────────────────────────────────── */
export default function DashboardPage() {
  const { user } = useAuth()
  const [stats,   setStats]   = useState(null)
  const [ideas,   setIdeas]   = useState([])
  const [score,   setScore]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/stats'),
      api.get('/dashboard/recent-ideas'),
      api.get('/dashboard/score'),
    ]).then(([s, id, sc]) => {
      setStats(s.data); setIdeas(id.data); setScore(sc.data)
    }).finally(() => setLoading(false))
  }, [])

  const first = user?.full_name?.split(' ')[0] || ''
  const hour  = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <Layout>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px', position: 'relative', zIndex: 1 }}>

        {/* ── HERO PANEL ── */}
        <div className="hero-panel animate-fade-in" style={{ padding: '32px 36px', marginBottom: 28 }}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>

              {/* Left: greeting */}
              <div style={{ flex: 1, minWidth: 240 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span className="live-dot" />
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'Syne' }}>
                    KIP Intelligence Active
                  </span>
                </div>
                <h1 style={{
                  fontFamily: 'Syne', fontWeight: 800,
                  fontSize: 'clamp(24px,3vw,34px)',
                  color: '#fff', lineHeight: 1.15, marginBottom: 10
                }}>
                  {greeting},<br />
                  <span style={{
                    background: 'linear-gradient(90deg, #fff 0%, #90CAF9 60%, #00D4B1 100%)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
                  }}>{first}.</span>
                </h1>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', maxWidth: 340, lineHeight: 1.6, marginBottom: 24 }}>
                  Your AI business advisor is ready. Ask KIP for ideas, check the live news feed, or continue coaching your business.
                </p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <Link to="/chat" className="kip-btn kip-btn-primary" style={{ fontSize: 13 }}>
                    <MessageSquare size={15} /> Ask KIP
                  </Link>
                  <Link to="/news" className="kip-btn kip-btn-ghost" style={{ fontSize: 13 }}>
                    <Activity size={15} /> Live News Feed
                  </Link>
                </div>
              </div>

              {/* Right: KIP Score */}
              {score && (
                <div style={{
                  flexShrink: 0,
                  background: 'rgba(255,255,255,0.06)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 20,
                  padding: '20px 28px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: 'Syne', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
                    KIP Score
                  </div>
                  <ScoreDial score={score.score} band={score.band} band_desc={score.band_desc} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── STAT CARDS ── */}
        <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, marginBottom: 28 }}>
          <StatCard icon={MessageSquare} label="Conversations"   value={stats?.total_conversations} color="var(--blue)"  delay={0} />
          <StatCard icon={Lightbulb}    label="Ideas Generated" value={stats?.total_ideas}          color="var(--teal)"  delay={60} />
          <StatCard icon={CheckCircle}  label="Ideas Accepted"  value={stats?.accepted_ideas}       color="var(--green)" delay={120} />
        </div>

        {/* ── RESPONSIVE TWO COLUMN GRID ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>

          {/* Ask KIP prompt card */}
          <div className="kip-card kip-card-glow animate-slide-up" style={{ animationDelay: '200ms', padding: 24 }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{
                width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                background: 'linear-gradient(135deg, var(--blue), var(--mid))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: 'var(--glow-blue)',
              }}>
                <TrendingUp size={20} color="#fff" />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, color: '#fff', marginBottom: 6 }}>
                  Get a Business Idea
                </h3>
                <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 16 }}>
                  Tell KIP your capital, location, and any skills. KIP will analyse the market and generate a personalised recommendation.
                </p>
                <div style={{
                  background: 'rgba(27,110,243,0.08)',
                  border: '1px solid rgba(27,110,243,0.2)',
                  borderRadius: 10, padding: '10px 14px',
                  fontSize: 13, color: 'var(--muted)', fontStyle: 'italic',
                  marginBottom: 16
                }}>
                  "I have K5,000 and want to start a business in Matero, Lusaka."
                </div>
                <Link to="/chat" className="kip-btn kip-btn-primary" style={{ fontSize: 12, padding: '9px 16px' }}>
                  Start Conversation <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>

          {/* Recent ideas */}
          <div className="kip-card animate-slide-up" style={{ animationDelay: '260ms', padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, color: '#fff' }}>Recent Ideas</h3>
              <Link to="/ideas" style={{ fontSize: 12, color: 'var(--blue-bright)', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                View all <ArrowRight size={12} />
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[0,1,2].map(i => <div key={i} className="shimmer-load" style={{ height: 52, borderRadius: 10 }} />)}
              </div>
            ) : ideas.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '28px 0' }}>
                <Lightbulb size={36} style={{ color: 'var(--faint)', margin: '0 auto 10px', display: 'block' }} className="animate-float" />
                <p style={{ fontSize: 13, color: 'var(--muted)' }}>No ideas yet. Ask KIP to start!</p>
              </div>
            ) : (
              <div className="stagger space-y-2">
                {ideas.slice(0, 3).map((idea, idx) => (
                  <div key={idea.id}
                    className="animate-slide-up"
                    style={{
                      animationDelay: `${idx * 70}ms`,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      gap: 12, padding: '10px 14px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 12,
                      transition: 'all 0.2s ease',
                    }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {idea.idea_name}
                      </div>
                      <div style={{ display: 'flex', gap: 10, marginTop: 3, flexWrap: 'wrap' }}>
                        {idea.location && (
                          <span style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <MapPin size={10} /> {idea.location}
                          </span>
                        )}
                        {idea.capital_amount && (
                          <span style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <DollarSign size={10} /> K{idea.capital_amount?.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                    {idea.plan_id ? (
                      <Link to={`/business/${idea.plan_id}`}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--gold)', fontWeight: 600, fontFamily: 'Syne', textDecoration: 'none', whiteSpace: 'nowrap', padding: '5px 10px', background: 'rgba(245,166,35,0.1)', borderRadius: 8, border: '1px solid rgba(245,166,35,0.25)' }}>
                        <Rocket size={11} /> Business
                      </Link>
                    ) : (
                      <span className={`kip-badge ${idea.accepted ? 'kip-badge-green' : 'kip-badge-blue'}`}>
                        {idea.accepted ? 'Accepted' : 'Pending'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── KIP Score breakdown (if has score) ── */}
        {score && score.score > 0 && (
          <div className="kip-card animate-slide-up" style={{ marginTop: 16, padding: 24, animationDelay: '320ms' }}>
            <h3 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, color: '#fff', marginBottom: 16 }}>
              Score Breakdown
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
              {Object.entries(score.breakdown || {}).map(([key, data]) => {
                const labels = { conversations: 'Conversations', ideas_generated: 'Ideas Generated', ideas_accepted: 'Ideas Accepted', business_started: 'Business Started', daily_logs: 'Daily Logs' }
                const pct = (data.points / data.max) * 100
                return (
                  <div key={key} style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>{labels[key] || key}</span>
                      <span style={{ fontFamily: 'Syne', fontSize: 13, fontWeight: 700, color: '#fff' }}>{data.points}/{data.max}</span>
                    </div>
                    <div className="kip-progress">
                      <div className="kip-progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </Layout>
  )
}
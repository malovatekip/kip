import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Brain, MapPin, DollarSign, Zap } from 'lucide-react'
import KIP_LOGO from '../kipLogo'
import ParticleBackground from '../components/ParticleBackground'
import { DashboardHeroIllustration, BusinessIllustration, FinancialLiteracyIllustration } from '../components/KipIllustrations'
import marketPhoto from '../assets/landing/market-street.jpg'
import signpostPhoto from '../assets/landing/signpost-sunset.jpg'

// Small bespoke figures for the two feature concepts nothing existing quite fits.
function FusionFigure({ color = '#4B9EFF', width = 120, height = width * 0.75 }) {
  return (
    <svg width={width} height={height} viewBox="0 0 120 90" fill="none">
      <circle cx="24" cy="20" r="8" fill={color} opacity="0.85" />
      <circle cx="24" cy="70" r="8" fill={color} opacity="0.55" />
      <circle cx="18" cy="45" r="6" fill={color} opacity="0.35" />
      <path d="M30 20 L82 45 M30 70 L82 45 M24 45 L82 45" stroke={color} strokeWidth="1.5" strokeOpacity="0.4" />
      <circle cx="90" cy="45" r="16" fill={color} opacity="0.15" />
      <circle cx="90" cy="45" r="10" fill={color} />
    </svg>
  )
}

function ZambiaMapFigure({ color = '#00D4B1', width = 120, height = width * 0.75 }) {
  return (
    <svg width={width} height={height} viewBox="0 0 120 90" fill="none">
      <path
        d="M20 22 L50 14 L66 24 L84 18 L96 30 L92 46 L100 58 L86 70 L64 74 L48 68 L30 72 L18 56 L26 40 Z"
        fill={color} fillOpacity="0.14" stroke={color} strokeWidth="1.5" strokeOpacity="0.5"
      />
      <circle cx="58" cy="40" r="4" fill={color} />
      <path d="M58 40 L58 24 M52 30 L58 24 L64 30" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="40" cy="52" r="2.5" fill={color} opacity="0.6" />
      <circle cx="72" cy="50" r="2.5" fill={color} opacity="0.6" />
    </svg>
  )
}

const FEATURES = [
  { icon: Brain,      title: 'K-BIG-1 Intelligence',   caption: 'Three sources. One advisor.', figure: FusionFigure,      color: '#4B9EFF' },
  { icon: MapPin,     title: 'Hyper-Local Insights',    caption: 'Zambia, at street level.',    figure: ZambiaMapFigure,   color: '#00D4B1' },
  { icon: DollarSign, title: 'Capital-Aware Planning',  caption: 'Fits your budget, exactly.',  figure: BusinessIllustration, color: '#F5A623' },
  { icon: Zap,        title: 'Live Economic Feed',      caption: 'Rates, fuel, copper — live.', figure: FinancialLiteracyIllustration, color: '#00E676' },
]

const STEPS = [
  { icon: Brain,      title: 'Tell KIP your situation',  caption: 'Capital, location, skills.' },
  { icon: Zap,        title: 'KIP analyses everything',  caption: 'Market + economic context, in seconds.' },
  { icon: DollarSign, title: 'Get your personalised idea', caption: 'Breakdown, reasoning, first steps.' },
]

const STATS = [
  { value: 'K500 – K50k+', label: 'Capital range covered' },
  { value: '10',           label: 'Provinces mapped' },
  { value: '<30s',         label: 'To your first idea' },
]

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--base)', color: 'var(--text)', position: 'relative', overflowX: 'hidden' }}>
      <ParticleBackground />
      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <header style={{
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(4,12,24,0.7)', backdropFilter: 'blur(20px)',
          position: 'sticky', top: 0, zIndex: 100,
        }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src={KIP_LOGO} alt="KIP" style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover' }} className="animate-logo-glow" />
              <div>
                <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 14, letterSpacing: '0.12em', color: '#fff', lineHeight: 1 }}> </div>
                <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.04em', display: 'none' }} className="sm:block">Kwacha Intelligence Platform</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Link to="/login" className="kip-btn kip-btn-ghost" style={{ fontSize: 13, padding: '8px 18px' }}>Sign In</Link>
              <Link to="/register" className="kip-btn kip-btn-primary" style={{ fontSize: 13, padding: '8px 18px' }}>Get Started Free</Link>

            </div>
          </div>
        </header>

        {/* Hero sign */}
        <section style={{ padding: 'clamp(60px,10vh,120px) 24px', textAlign: 'center' }}>
          <div style={{ maxWidth: 780, margin: '0 auto' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(27,110,243,0.12)', border: '1px solid rgba(27,110,243,0.25)',
              borderRadius: 40, padding: '7px 16px', marginBottom: 32,
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--teal)', display: 'inline-block' }} className="animate-pulse-soft" />
              <span style={{ fontSize: 12, color: 'var(--blue-bright)', fontWeight: 600, fontFamily: 'Syne', letterSpacing: '0.04em' }}>
                Zambia's First AI Business Advisor
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
              <div style={{ position: 'relative' }}>
                <div style={{
                  position: 'absolute', inset: -12, borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(27,110,243,0.4) 0%, transparent 70%)',
                  filter: 'blur(20px)',
                }} className="animate-pulse-soft" />
                <img src={KIP_LOGO} alt="KIP" style={{ position: 'relative', width: 88, height: 88, borderRadius: 24, objectFit: 'cover', boxShadow: '0 0 40px rgba(27,110,243,0.4)' }} className="animate-float" />
              </div>
            </div>

            <h1 style={{
              fontFamily: 'Syne', fontWeight: 800,
              fontSize: 'clamp(38px,6vw,68px)',
              lineHeight: 1.1, marginBottom: 20,
              color: '#fff',
            }}>
              Your Capital.<br />
              <span style={{
                background: 'linear-gradient(135deg, #4B9EFF, #00D4B1)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                Your Location.
              </span><br />
              Your Business.
            </h1>

            <p style={{ fontSize: 17, color: 'var(--muted)', maxWidth: 560, margin: '0 auto 36px', lineHeight: 1.7 }}>
              KIP analyses your capital, location, and skills against Zambia's economic landscape to deliver personalised, viable business recommendations — instantly.
            </p>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/register" className="kip-btn kip-btn-primary" style={{ fontSize: 15, padding: '13px 28px' }}>
                Start for Free <ArrowRight size={16} />
              </Link>
              <Link to="/login" className="kip-btn kip-btn-ghost" style={{ fontSize: 15, padding: '13px 28px' }}>
                Sign In
              </Link>
              <Link to="/pricing" className="kip-btn kip-btn-primary" style={{ fontSize: 15, padding: '13px 28px' }}>View Pricing</Link>
            </div>
          </div>
        </section>

        {/* Hero illustration — the product, at a glance */}
        <section style={{ padding: '0 24px 64px' }}>
          <div style={{ maxWidth: 460, margin: '0 auto' }}>
            <div className="kip-card kip-card-glow animate-scale-in" style={{ padding: 20, display: 'flex', justifyContent: 'center' }}>
              <DashboardHeroIllustration width={380} height={240} />
            </div>
          </div>
        </section>

        {/* Stat strip */}
        <section style={{ padding: '0 24px 80px' }}>
          <div style={{ maxWidth: 700, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 16 }}>
            {STATS.map(({ value, label }) => (
              <div key={label} className="stat-tile" style={{ textAlign: 'center' }}>
                <div className="stat-tile-value counter-value" style={{ color: '#fff' }}>{value}</div>
                <div className="stat-tile-label">{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Photo band — real market, real opportunity */}
        <section style={{
          position: 'relative', padding: '90px 24px', textAlign: 'center',
          backgroundImage: `linear-gradient(180deg, rgba(4,12,24,0.55), rgba(4,12,24,0.82)), url(${marketPhoto})`,
          backgroundSize: 'cover', backgroundPosition: 'center 30%',
        }}>
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            <p style={{ fontSize: 12, color: 'var(--gold-bright, #F5A623)', fontFamily: 'Syne', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
              Not generic AI advice.
            </p>
            <h2 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 'clamp(24px,3.6vw,34px)', color: '#fff', lineHeight: 1.25 }}>
              Built for the streets, stalls, and shops<br />where real business actually happens.
            </h2>
          </div>
        </section>

        {/* Features */}
        <section style={{ padding: '80px 24px', background: 'rgba(255,255,255,0.015)' }}>
          <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            <h2 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 'clamp(26px,4vw,38px)', color: '#fff', textAlign: 'center', marginBottom: 10 }}>Built Different</h2>
            <p style={{ fontSize: 15, color: 'var(--muted)', textAlign: 'center', marginBottom: 48, maxWidth: 480, margin: '0 auto 48px' }}>The engine underneath.</p>
            <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16 }}>
              {FEATURES.map(({ icon: Icon, title, caption, figure: Figure, color }, idx) => (
                <div key={title} className="kip-card animate-slide-up" style={{ padding: 24, animationDelay: `${idx*80}ms` }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, borderRadius: 12, overflow: 'hidden', background: `${color}0D` }}>
                    <Figure color={color} width={200} height={150} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <Icon size={16} style={{ color }} />
                    <h3 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, color: '#fff' }}>{title}</h3>
                  </div>
                  <p style={{ fontSize: 12.5, color: 'var(--muted)' }}>{caption}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section style={{ padding: '80px 24px' }}>
          <style>{`@media (max-width: 640px) { .landing-step-connector { display: none; } }`}</style>
          <div style={{ maxWidth: 780, margin: '0 auto' }}>
            <h2 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 'clamp(26px,4vw,38px)', color: '#fff', textAlign: 'center', marginBottom: 48 }}>How It Works</h2>
            <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 28 }}>
              <div className="landing-step-connector" style={{
                position: 'absolute', top: 24, left: '16%', right: '16%', height: 2,
                background: 'linear-gradient(90deg, var(--blue), var(--teal))', opacity: 0.3,
              }} />
              {STEPS.map(({ icon: Icon, title, caption }, idx) => (
                <div key={title} className="animate-slide-up" style={{ textAlign: 'center', position: 'relative', animationDelay: `${idx*100}ms` }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 14, margin: '0 auto 16px',
                    background: 'linear-gradient(135deg, var(--blue), var(--teal))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 16px rgba(27,110,243,0.3)',
                  }}>
                    <Icon size={20} color="#fff" />
                  </div>
                  <h3 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, color: '#fff', marginBottom: 6 }}>{title}</h3>
                  <p style={{ fontSize: 12.5, color: 'var(--muted)' }}>{caption}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section style={{
          position: 'relative', padding: '120px 24px', textAlign: 'center',
          backgroundImage: `linear-gradient(180deg, rgba(4,12,24,0.72), rgba(4,12,24,0.55) 40%, rgba(4,12,24,0.88)), url(${signpostPhoto})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
        }}>
          <div style={{ maxWidth: 520, margin: '0 auto' }}>
            <h2 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 'clamp(24px,4vw,36px)', color: '#fff', marginBottom: 12 }}>
              Ready to find your business idea?
            </h2>
            <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 28 }}>Join Zambian entrepreneurs using KIP. Free to start.</p>
            <Link to="/register" className="kip-btn kip-btn-primary" style={{ fontSize: 15, padding: '13px 32px' }}>
              Get Started Free <ArrowRight size={16} />
            </Link>

          </div>
        </section>

        {/* Footer */}
        <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '24px', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
            <img src={KIP_LOGO} alt="KIP" style={{ width: 28, height: 28, borderRadius: 8, objectFit: 'cover' }} />
            <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13, color: 'var(--muted)', letterSpacing: '0.08em' }}>KWACHA INTELLIGENCE PLATFORM</span>
          </div>

          <p style={{ fontSize: 12, color: 'var(--faint)' }}>© 2026 Malovate · Zambia · All rights reserved</p>
        </footer>

      </div>
    </div>
  )
}

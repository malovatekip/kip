import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Brain, MapPin, DollarSign, Zap, CheckCircle, TrendingUp, Shield } from 'lucide-react'
import KIP_LOGO from '../kipLogo'
import ParticleBackground from '../components/ParticleBackground'

const FEATURES = [
  { icon: Brain,      title: 'K-BIG-1 Intelligence',   desc: 'Three-pillar AI engine — Zambia intelligence, business knowledge, economic data fused into one advisor.', color: '#4B9EFF' },
  { icon: MapPin,     title: 'Hyper-Local Insights',    desc: 'KIP knows Zambian towns, markets, and neighbourhoods at street level. Not Africa. Zambia.', color: '#00D4B1' },
  { icon: DollarSign, title: 'Capital-Aware Planning',  desc: 'Tell KIP your budget in Kwacha. Every recommendation fits exactly what you have.', color: '#F5A623' },
  { icon: Zap,        title: 'Live Economic Feed',      desc: 'USD/ZMW rates, fuel prices, copper market, breaking financial news — all in one place.', color: '#00E676' },
]

const STEPS = [
  { n: '01', title: 'Tell KIP your situation',  desc: '"I have K5,000 and want to start a business in Chelstone, Lusaka."' },
  { n: '02', title: 'KIP analyses everything',  desc: 'Capital, location, market conditions, economic context — processed in seconds.' },
  { n: '03', title: 'Get your personalised idea', desc: 'A tailored recommendation with capital breakdown, market reasoning, and first steps.' },
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

        {/* Hero */}
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
            </div>
          </div>
        </section>

        {/* Demo bubble */}
        <section style={{ padding: '0 24px 80px' }}>
          <div style={{ maxWidth: 640, margin: '0 auto' }}>
            <div className="kip-card kip-card-glow" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <img src={KIP_LOGO} alt="KIP" style={{ width: 40, height: 40, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 8, fontFamily: 'Syne', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Example conversation</div>
                  <div style={{ background: 'linear-gradient(135deg, #1B6EF3, #0D52CC)', borderRadius: '14px 14px 4px 14px', padding: '10px 14px', marginBottom: 12, display: 'inline-block' }}>
                    <p style={{ fontSize: 13, color: '#fff', margin: 0 }}>"I have K3,000 and want to start a business in Riverside, Kitwe."</p>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.7 }}>
                    <span style={{ color: 'var(--blue-bright)', fontWeight: 700 }}>KIP recommends:</span> <strong style={{ color: '#fff' }}>Mobile Phone Repair Shop.</strong><br />
                    <span style={{ color: 'var(--muted)' }}>Setup: </span><span style={{ color: 'var(--gold)', fontWeight: 700 }}>K2,400</span>
                    <span style={{ color: 'var(--muted)' }}> · Stock: </span><span style={{ color: 'var(--gold)', fontWeight: 700 }}>K400</span>
                    <span style={{ color: 'var(--muted)' }}> · Reserve: </span><span style={{ color: 'var(--gold)', fontWeight: 700 }}>K200</span><br />
                    <span style={{ color: 'var(--green)', fontWeight: 600 }}>Est. monthly profit: K800–K1,200 ✓</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section style={{ padding: '80px 24px', background: 'rgba(255,255,255,0.015)' }}>
          <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            <h2 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 'clamp(26px,4vw,38px)', color: '#fff', textAlign: 'center', marginBottom: 10 }}>Built Different</h2>
            <p style={{ fontSize: 15, color: 'var(--muted)', textAlign: 'center', marginBottom: 48, maxWidth: 480, margin: '0 auto 48px' }}>Not generic AI advice. Real Zambian market intelligence.</p>
            <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16 }}>
              {FEATURES.map(({ icon: Icon, title, desc, color }, idx) => (
                <div key={title} className="kip-card animate-slide-up" style={{ padding: 24, animationDelay: `${idx*80}ms` }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, boxShadow: `0 0 20px ${color}20` }}>
                    <Icon size={20} style={{ color }} />
                  </div>
                  <h3 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, color: '#fff', marginBottom: 8 }}>{title}</h3>
                  <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.65 }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section style={{ padding: '80px 24px' }}>
          <div style={{ maxWidth: 640, margin: '0 auto' }}>
            <h2 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 'clamp(26px,4vw,38px)', color: '#fff', textAlign: 'center', marginBottom: 48 }}>How It Works</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              {STEPS.map(({ n, title, desc }, idx) => (
                <div key={n} className="animate-slide-up" style={{ display: 'flex', gap: 20, alignItems: 'flex-start', animationDelay: `${idx*100}ms` }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                    background: 'linear-gradient(135deg, var(--blue), var(--teal))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'Syne', fontWeight: 800, fontSize: 16, color: '#fff',
                    boxShadow: '0 4px 16px rgba(27,110,243,0.3)',
                  }}>{n}</div>
                  <div style={{ paddingTop: 4 }}>
                    <h3 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16, color: '#fff', marginBottom: 6 }}>{title}</h3>
                    <p style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic', lineHeight: 1.6 }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section style={{ padding: '80px 24px', textAlign: 'center' }}>
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

          <p style={{ fontSize: 12, color: 'var(--faint)' }}>© 2025 Malovate · Zambia · All rights reserved</p>
        </footer>

      </div>
    </div>
  )
}

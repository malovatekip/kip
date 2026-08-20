import KipBackground from './KipBackground'

import React, { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import {
  LayoutDashboard, MessageSquare, Lightbulb, LogOut,
  Newspaper, ChevronRight, PanelLeftClose, PanelLeftOpen,
  FileText, Globe, X, Menu, Sun, Moon, Building2, Crown, DollarSign,
  BarChart2, BookOpen, Gamepad2, Rocket, Settings
} from 'lucide-react'
import api from '../lib/api'
import KIP_LOGO from '../kipLogo'
import OfflineBanner from './OfflineBanner'
import LanguageToggle from './LanguageToggle'
import { useT } from '../context/TranslationContext'

export default function Layout({ children }) {
  const { t }                     = useT()
  const { user, logout }          = useAuth()
  const { theme, toggle, isDark } = useTheme()

  const NAV = [
    { to: '/dashboard',  icon: LayoutDashboard, label: t('nav.dashboard')   },
    { to: '/chat',       icon: MessageSquare,   label: t('nav.chat')       },
    { to: '/news',       icon: Newspaper,       label: t('nav.news')       },
    { to: '/ideas',      icon: Lightbulb,       label: t('nav.ideas')      },
    { to: '/startup',    icon: Rocket,          label: t('nav.startup')    },
    { to: '/templates',  icon: FileText,        label: t('nav.templates')  },
    { to: '/learn',      icon: BookOpen,        label: t('nav.learn')      },
    { to: '/bizsim',     icon: Gamepad2,        label: t('nav.bizsim')     },
    // { to: '/capital', icon: DollarSign, label: t('nav.capital') },
    { to: '/market',     icon: BarChart2,       label: t('nav.market')     },
    { to: '/survey',     icon: Globe,           label: t('nav.survey')     },
    { to: '/enterprise', icon: Crown,           label: t('nav.enterprise'), premium: true },
    { to: '/settings',   icon: Settings,        label: t('nav.settings')   },
  ]
  const location                  = useLocation()
  const navigate                  = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed,  setCollapsed]  = useState(() => {
    try { return localStorage.getItem('kip_sb') === '1' } catch { return false }
  })
  const [alerts, setAlerts] = useState(0)

  useEffect(() => {
    try { localStorage.setItem('kip_sb', collapsed ? '1' : '0') } catch {}
  }, [collapsed])

  useEffect(() => {
    const f = () => api.get('/news/alerts/count').then(r => setAlerts(r.data?.unread || 0)).catch(() => {})
    f(); const iv = setInterval(f, 300000); return () => clearInterval(iv)
  }, [])

  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  // Auto-hide bottom nav on scroll (mobile): hides on scroll-down, reappears on scroll-up / near top.
  // Listens on `document` with capture so it catches scrolling from ANY scrollable descendant —
  // not just Layout's own <main>, but also pages (e.g. ChatPage) that manage their own inner
  // scroll container for a message list.
  const [navHidden, setNavHidden] = useState(false)
  const mainRef = useRef(null)

  useEffect(() => {
    let ticking     = false
    let lastY       = 0
    let lastTarget  = null
    const onScroll = (e) => {
      const el = e.target
      if (!el || typeof el.scrollTop !== 'number') return
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const y = el.scrollTop
        if (el !== lastTarget) { lastTarget = el; lastY = y }
        const diff = y - lastY
        if (y < 40) setNavHidden(false)
        else if (diff > 6) setNavHidden(true)
        else if (diff < -6) setNavHidden(false)
        lastY = y
        ticking = false
      })
    }
    document.addEventListener('scroll', onScroll, { capture: true, passive: true })
    return () => document.removeEventListener('scroll', onScroll, { capture: true })
  }, [])

  useEffect(() => { setNavHidden(false) }, [location.pathname])

  const initial    = user?.full_name?.[0]?.toUpperCase() || '?'
  const isPremium  = ['premium','enterprise','pro'].includes((user?.plan_tier || 'free').toLowerCase())
  const BOTTOM_NAV = NAV.filter(n => !n.premium).slice(0, 5)

  const ThemeBtn = ({ size = 17 }) => (
    <button onClick={toggle} className="theme-toggle" title={isDark ? t('layout.light_mode') : t('layout.dark_mode')}>
      {isDark ? <Sun size={size} /> : <Moon size={size} />}
    </button>
  )

  const NavLink = ({ to, icon: Icon, label, badge = 0, mobile = false, premium = false }) => {
    const active = location.pathname.startsWith(to)
    return (
      <Link to={to} style={{
        display: 'flex', alignItems: 'center',
        gap: mobile ? 12 : (collapsed ? 0 : 12),
        padding: mobile ? '11px 14px' : '10px 12px',
        borderRadius: 10, marginBottom: 3, textDecoration: 'none',
        color: active ? 'var(--blue-bright)' : 'var(--muted)',
        background: active ? 'var(--nav-active-bg)' : 'transparent',
        border: `1px solid ${active ? 'var(--nav-active-border)' : 'transparent'}`,
        fontFamily: 'Plus Jakarta Sans', fontWeight: active ? 600 : 500, fontSize: 13.5,
        justifyContent: (!mobile && collapsed) ? 'center' : 'flex-start',
        transition: 'all 0.2s ease', position: 'relative',
      }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <Icon size={mobile ? 19 : 18} style={{ color: premium && !isPremium ? 'var(--gold)' : undefined }} />
          {badge > 0 && (
            <span style={{ position: 'absolute', top: -5, right: -5, background: 'var(--gold)', color: '#040C18', fontSize: 8, fontWeight: 800, width: 14, height: 14, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {badge > 9 ? '9+' : badge}
            </span>
          )}
        </div>
        {(mobile || !collapsed) && (
          <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
            {label}
            {premium && !isPremium && (
              <span style={{ fontSize: 8, fontFamily: 'Syne', fontWeight: 700, color: 'var(--gold)', background: 'var(--gold-dim)', border: '1px solid rgba(232,151,62,0.3)', borderRadius: 20, padding: '1px 5px' }}>
                {t('layout.pro_badge')}
              </span>
            )}
          </span>
        )}
        {(mobile || !collapsed) && active && <ChevronRight size={13} style={{ opacity: 0.4 }} />}
      </Link>
    )
  }
  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden', background: 'var(--base)', position: 'relative' }}>
        <KipBackground />


      {mobileOpen && (
        <div onClick={() => setMobileOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }} />
      )}
{/*       <EnergyField/> */}
      {/* Desktop sidebar */}
      <aside className="kip-sidebar-desktop" style={{
        width: collapsed ? 68 : 256, flexShrink: 0, display: 'none',
        flexDirection: 'column', transition: 'width 0.28s cubic-bezier(0.4,0,0.2,1)',
        overflow: 'hidden', position: 'relative', zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 10, padding: '0 14px', height: 64, borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <img src={KIP_LOGO} alt="KIP" style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} className="animate-logo-glow" />
          {!collapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 15, letterSpacing: '0.1em', color: 'var(--text)' }}>KIP</div>
              <div style={{ fontSize: 9, color: 'var(--muted)' }}>{t('layout.brand_tagline')}</div>

            </div>
          )}
          {!collapsed && <ThemeBtn size={15} />}
        </div>

        <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 8px' }}>
          {NAV.map(({ to, icon, label, premium }) => (
            <div key={to} style={{ position: 'relative' }} className="group">
              <NavLink to={to} icon={icon} label={label} badge={to === '/news' ? alerts : 0} premium={premium} />
              {collapsed && <span className="kip-tooltip">{label}</span>}
            </div>
          ))}
        </nav>
        <LanguageToggle />
        <div style={{ borderTop: '1px solid var(--border)', padding: '10px 8px' }}>
          {collapsed && <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}><ThemeBtn /></div>}
          <div className="relative group" style={{ marginBottom: 4 }}>
            <button onClick={() => setCollapsed(c => !c)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', justifyContent: collapsed ? 'center' : 'flex-start', fontSize: 12 }}>
              {collapsed ? <PanelLeftOpen size={17} /> : <><PanelLeftClose size={17} /><span>{t('layout.collapse')}</span></>}
            </button>
            {collapsed && <span className="kip-tooltip">{t('layout.expand')}</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 8, padding: '6px 10px', justifyContent: collapsed ? 'center' : 'flex-start' }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: 'linear-gradient(135deg,var(--blue),var(--blue-mid))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', fontFamily: 'Syne', flexShrink: 0 }}>
              {initial}
            </div>
            {!collapsed && (
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.full_name}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'capitalize' }}>{user?.plan_tier || 'free'} {t('layout.plan_label')}</div>
              </div>
            )}
          </div>
          <div className="relative group">
            <button onClick={() => { logout(); navigate('/') }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', justifyContent: collapsed ? 'center' : 'flex-start', fontSize: 12 }}>
              <LogOut size={17} />
              {!collapsed && <span>{t('nav.logout')}</span>}
            </button>
            {collapsed && <span className="kip-tooltip">{t('nav.logout')}</span>}
          </div>
        </div>
      </aside>

      {/* Mobile drawer */}
      <aside style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 70,
        width: 280, transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
        background: 'var(--sidebar-bg)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src={KIP_LOGO} alt="KIP" style={{ width: 34, height: 34, borderRadius: 9, objectFit: 'cover' }} className="animate-logo-glow" />
            <div>
              <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>KIP</div>
              <div style={{ fontSize: 9, color: 'var(--muted)' }}>{t('layout.brand_tagline')}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <ThemeBtn />
            <button onClick={() => setMobileOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}><X size={20} /></button>
          </div>
        </div>
        <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 10px' }}>
          {NAV.map(({ to, icon, label, premium }) => (
            <NavLink key={to} to={to} icon={icon} label={label} badge={to === '/news' ? alerts : 0} mobile premium={premium} />
          ))}
        </nav>
        <div style={{ padding: '12px 10px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', marginBottom: 6 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,var(--blue),var(--blue-mid))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: 'Syne' }}>
              {initial}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{user?.full_name}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'capitalize' }}>{user?.plan_tier || 'free'} {t('layout.plan_label')}</div>
            </div>
          </div>
          <button onClick={() => { logout(); navigate('/') }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 10, background: 'rgba(224,38,62,0.08)', border: '1px solid rgba(224,38,62,0.2)', color: 'var(--red)', cursor: 'pointer', fontFamily: 'Plus Jakarta Sans', fontWeight: 600, fontSize: 13 }}>
            <LogOut size={16} /> {t('nav.logout')}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden', position: 'relative', zIndex: 10 }}>
        <header className="kip-mobile-header" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingTop: 'max(env(safe-area-inset-top,0px),10px)',
          paddingBottom: 10, paddingLeft: 14, paddingRight: 14,
          flexShrink: 0, minHeight: 54,
        }}>
          <button onClick={() => setMobileOpen(true)} style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '7px 9px', cursor: 'pointer', color: 'var(--text)', display: 'flex' }}>
            <Menu size={19} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src={KIP_LOGO} alt="KIP" style={{ width: 28, height: 28, borderRadius: 8, objectFit: 'cover' }} className="animate-logo-glow" />
            <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 15, letterSpacing: '0.1em', color: 'var(--text)' }}>KIP</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <ThemeBtn size={16} />
            {alerts > 0 && (
              <Link to="/news" style={{ position: 'relative', color: 'var(--muted)', display: 'flex' }}>
                <Newspaper size={20} />
                <span style={{ position: 'absolute', top: -4, right: -4, background: 'var(--gold)', color: '#040C18', fontSize: 8, fontWeight: 800, width: 14, height: 14, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{alerts}</span>
              </Link>
            )}
          </div>
        </header>

{/*         <OfflineBanner /> */}
        <main ref={mainRef} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 64px)', WebkitOverflowScrolling: 'touch' }} className="kip-main-content">
          {children}
        </main>

        <nav className="kip-bottom-nav" style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, paddingBottom: 'env(safe-area-inset-bottom,0px)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-around', zIndex: 50, minHeight: 56,
          transform: navHidden ? 'translateY(100%)' : 'translateY(0)',
          transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
        }}>
          {BOTTOM_NAV.map(({ to, icon: Icon, label }) => {
            const active = location.pathname.startsWith(to)
            const badge  = to === '/news' ? alerts : 0
            return (
              <Link key={to} to={to} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '8px 10px', textDecoration: 'none', flex: 1, position: 'relative' }}>
                <div style={{ position: 'relative' }}>
                  <Icon size={21} style={{ color: active ? 'var(--blue-bright)' : 'var(--faint)', transition: 'color 0.2s' }} />
                  {badge > 0 && <span style={{ position: 'absolute', top: -4, right: -4, background: 'var(--gold)', color: '#040C18', fontSize: 7, fontWeight: 800, width: 13, height: 13, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{badge}</span>}
                </div>
                <span style={{ fontSize: 9.5, fontFamily: 'Syne', fontWeight: active ? 700 : 500, color: active ? 'var(--blue-bright)' : 'var(--faint)', transition: 'color 0.2s' }}>{label}</span>
                {active && <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 20, height: 2, borderRadius: 2, background: 'linear-gradient(90deg,var(--blue),var(--teal))' }} />}
              </Link>
            )
          })}
        </nav>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .kip-sidebar-desktop { display: flex !important; }
          .kip-bottom-nav      { display: none  !important; }
          .kip-mobile-header   { display: none  !important; }
          .kip-main-content    { padding-bottom: 0 !important; }
        }
      `}</style>
    </div>
  )
}

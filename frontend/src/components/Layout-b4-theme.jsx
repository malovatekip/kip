import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import {
  LayoutDashboard, MessageSquare, Lightbulb, LogOut,
  Newspaper, ChevronRight, PanelLeftClose, PanelLeftOpen,
  FileText, Globe, X, Menu
} from 'lucide-react'
import api from '../lib/api'
import KIP_LOGO from '../kipLogo'

const NAV = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard'  },
  { to: '/chat',       icon: MessageSquare,   label: 'Ask KIP'    },
  { to: '/news',       icon: Newspaper,       label: 'News'       },
  { to: '/ideas',      icon: Lightbulb,       label: 'My Ideas'   },
  { to: '/templates',  icon: FileText,        label: 'Templates'  },
  { to: '/survey',     icon: Globe,           label: 'Survey'     },
]

export default function Layout({ children }) {
  const { user, logout }  = useAuth()
  const location          = useLocation()
  const navigate          = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed]   = useState(() => {
    try { return localStorage.getItem('kip_sb') === '1' } catch { return false }
  })
  const [alerts, setAlerts] = useState(0)

  useEffect(() => {
    try { localStorage.setItem('kip_sb', collapsed ? '1' : '0') } catch {}
  }, [collapsed])

  useEffect(() => {
    api.get('/news/alerts/count').then(r => setAlerts(r.data?.unread || 0)).catch(() => {})
    const iv = setInterval(() => {
      api.get('/news/alerts/count').then(r => setAlerts(r.data?.unread || 0)).catch(() => {})
    }, 300000)
    return () => clearInterval(iv)
  }, [])

  // Close mobile sidebar on route change
  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  const initial = user?.full_name?.[0]?.toUpperCase() || '?'

  // Bottom nav items (mobile) — 5 max
  const BOTTOM_NAV = NAV.slice(0, 5)

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden', background: 'var(--base)', position: 'relative' }}>
      <div className="mesh-bg" />

      {/* ═══ MOBILE OVERLAY ═══ */}
      {mobileOpen && (
        <div onClick={() => setMobileOpen(false)} style={{
          position: 'fixed', inset: 0, zIndex: 60,
          background: 'rgba(4,12,24,0.8)', backdropFilter: 'blur(8px)',
        }} />
      )}

      {/* ═══ SIDEBAR (desktop) ═══ */}
      <aside style={{
        width: collapsed ? 68 : 256,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(180deg,rgba(11,22,40,0.97),rgba(6,12,22,0.99))',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        transition: 'width 0.28s cubic-bezier(0.4,0,0.2,1)',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 10,
        // Hide on mobile — use bottom nav instead
        display: 'none',
      }}
      className="kip-sidebar-desktop"
      >
        <SidebarContent
          collapsed={collapsed} setCollapsed={setCollapsed}
          nav={NAV} location={location} alerts={alerts}
          user={user} initial={initial} navigate={navigate} logout={logout}
        />
      </aside>

      {/* ═══ MOBILE DRAWER ═══ */}
      <aside style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 70,
        width: 280, transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
        background: 'linear-gradient(180deg,rgba(8,14,26,0.99),rgba(5,10,18,0.99))',
        borderRight: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(40px)',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src={KIP_LOGO} alt="KIP" style={{ width: 34, height: 34, borderRadius: 9, objectFit: 'cover' }} className="animate-logo-glow" />
            <div>
              <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 15, letterSpacing: '0.1em', color: '#fff' }}>KIP</div>
              <div style={{ fontSize: 9, color: 'var(--muted)' }}>Business Intelligence</div>
            </div>
          </div>
          <button onClick={() => setMobileOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 4 }}>
            <X size={20} />
          </button>
        </div>
        <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 10px' }}>
          {NAV.map(({ to, icon: Icon, label }) => {
            const active = location.pathname.startsWith(to)
            const badge  = label === 'News' ? alerts : 0
            return (
              <Link key={to} to={to} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 12, marginBottom: 4,
                textDecoration: 'none',
                color: active ? '#fff' : 'var(--muted)',
                background: active
                  ? 'linear-gradient(135deg,rgba(43,127,255,0.25),rgba(0,240,200,0.07))'
                  : 'transparent',
                border: `1px solid ${active ? 'rgba(43,127,255,0.3)' : 'transparent'}`,
                fontFamily: 'Plus Jakarta Sans', fontWeight: 600, fontSize: 14,
                position: 'relative',
              }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <Icon size={19} style={{ color: active ? 'var(--blue-bright)' : 'var(--muted)' }} />
                  {badge > 0 && (
                    <span style={{ position: 'absolute', top: -5, right: -5, background: 'var(--gold)', color: '#040C18', fontSize: 8, fontWeight: 800, width: 14, height: 14, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </div>
                {label}
                {active && <ChevronRight size={14} style={{ marginLeft: 'auto', opacity: 0.5 }} />}
              </Link>
            )
          })}
        </nav>
        {/* User + logout in drawer */}
        <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', marginBottom: 4 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,var(--blue),var(--mid))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: 'Syne' }}>
              {initial}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.full_name}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'capitalize' }}>{user?.plan_tier} plan</div>
            </div>
          </div>
          <button onClick={() => { logout(); navigate('/') }} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px', borderRadius: 10, background: 'rgba(255,77,106,0.08)',
            border: '1px solid rgba(255,77,106,0.2)', color: 'var(--red)',
            cursor: 'pointer', fontFamily: 'Plus Jakarta Sans', fontWeight: 600, fontSize: 13,
          }}>
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* ═══ MAIN CONTENT ═══ */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        minWidth: 0, overflow: 'hidden', position: 'relative', zIndex: 10,
      }}>

        {/* Mobile top bar */}
        <header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: 'env(safe-area-inset-top, 0) 16px 0',
          paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)',
          paddingBottom: 10,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(8,11,16,0.85)', backdropFilter: 'blur(20px)',
          flexShrink: 0, zIndex: 20,
          minHeight: 56,
        }}
        className="kip-mobile-header"
        >
          <button onClick={() => setMobileOpen(true)} style={{
            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10, padding: '7px 9px', cursor: 'pointer', color: 'var(--text)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Menu size={19} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src={KIP_LOGO} alt="KIP" style={{ width: 28, height: 28, borderRadius: 8, objectFit: 'cover' }} className="animate-logo-glow" />
            <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 15, letterSpacing: '0.1em', color: '#fff' }}>KIP</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {alerts > 0 && (
              <Link to="/news" style={{ position: 'relative', color: 'var(--muted)', display: 'flex' }}>
                <Newspaper size={20} />
                <span style={{ position: 'absolute', top: -4, right: -4, background: 'var(--gold)', color: '#040C18', fontSize: 8, fontWeight: 800, width: 14, height: 14, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {alerts > 9 ? '9+' : alerts}
                </span>
              </Link>
            )}
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,var(--blue),var(--mid))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'Syne' }}>
              {initial}
            </div>
          </div>
        </header>

        {/* Desktop sidebar toggle (shown on larger screens via CSS) */}
        <div className="kip-desktop-only" style={{ display: 'none' }}>
          {/* Desktop sidebar is handled above */}
        </div>

        {/* Page content */}
        <main style={{
          flex: 1, overflowY: 'auto', overflowX: 'hidden',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 64px)',
          WebkitOverflowScrolling: 'touch',
        }}
        className="kip-main-content"
        >
          {children}
        </main>

        {/* ═══ BOTTOM NAVIGATION (mobile) ═══ */}
        <nav style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          background: 'rgba(8,11,16,0.96)', backdropFilter: 'blur(24px)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-around',
          zIndex: 50, minHeight: 56,
        }}
        className="kip-bottom-nav"
        >
          {BOTTOM_NAV.map(({ to, icon: Icon, label }) => {
            const active = location.pathname.startsWith(to)
            const badge  = label === 'News' ? alerts : 0
            return (
              <Link key={to} to={to} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 3, padding: '8px 12px', textDecoration: 'none', flex: 1,
                position: 'relative',
              }}>
                <div style={{ position: 'relative' }}>
                  <Icon size={22} style={{ color: active ? 'var(--blue-bright)' : 'var(--faint)', transition: 'color 0.2s' }} />
                  {badge > 0 && (
                    <span style={{ position: 'absolute', top: -4, right: -4, background: 'var(--gold)', color: '#040C18', fontSize: 7, fontWeight: 800, width: 13, height: 13, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {badge}
                    </span>
                  )}
                </div>
                <span style={{
                  fontSize: 9.5, fontFamily: 'Syne', fontWeight: active ? 700 : 500,
                  color: active ? 'var(--blue-bright)' : 'var(--faint)',
                  transition: 'color 0.2s',
                }}>
                  {label}
                </span>
                {active && (
                  <div style={{
                    position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                    width: 20, height: 2, borderRadius: 2,
                    background: 'linear-gradient(90deg, var(--blue), var(--teal))',
                  }} />
                )}
              </Link>
            )
          })}
        </nav>

      </div>

      {/* ═══ CSS for desktop sidebar ═══ */}
      <style>{`
        @media (min-width: 768px) {
          .kip-sidebar-desktop { display: flex !important; }
          .kip-bottom-nav      { display: none !important; }
          .kip-mobile-header   { display: none !important; }
          .kip-main-content    { padding-bottom: 0 !important; }
        }
      `}</style>
    </div>
  )
}

/* Desktop sidebar content — extracted for reuse */
function SidebarContent({ collapsed, setCollapsed, nav, location, alerts, user, initial, navigate, logout }) {
  return (
    <>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 10, padding: collapsed ? '0 14px' : '0 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', height: 64, flexShrink: 0 }}>
        <img src={KIP_LOGO} alt="KIP" style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} className="animate-logo-glow" />
        {!collapsed && (
          <div>
            <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 15, letterSpacing: '0.12em', color: '#fff' }}>KIP</div>
            <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 1 }}>Business Intelligence</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 10px' }}>
        {nav.map(({ to, icon: Icon, label }) => {
          const active = location.pathname.startsWith(to)
          const badge  = label === 'News' ? alerts : 0
          return (
            <div key={to} style={{ position: 'relative' }} className="group">
              <Link to={to} className={`nav-item ${active ? 'active' : ''}`}
                style={{ justifyContent: collapsed ? 'center' : 'flex-start', marginBottom: 4 }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <Icon size={18} />
                  {badge > 0 && (
                    <span style={{ position: 'absolute', top: -5, right: -5, background: 'var(--gold)', color: '#040C18', fontSize: 8, fontWeight: 800, width: 14, height: 14, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </div>
                {!collapsed && <span style={{ flex: 1 }}>{label}</span>}
                {!collapsed && active && <ChevronRight size={14} style={{ opacity: 0.5 }} />}
              </Link>
              {collapsed && <span className="kip-tooltip">{label}</span>}
            </div>
          )
        })}
      </nav>

      {/* Bottom */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '10px 10px' }}>
        <div className="relative group" style={{ marginBottom: 4 }}>
          <button onClick={() => setCollapsed(c => !c)} className="nav-item" style={{ width: '100%', justifyContent: collapsed ? 'center' : 'flex-start' }}>
            {collapsed ? <PanelLeftOpen size={17} /> : <><PanelLeftClose size={17} /><span style={{ fontSize: 12 }}>Collapse</span></>}
          </button>
          {collapsed && <span className="kip-tooltip">Expand</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 8, padding: '6px 10px', justifyContent: collapsed ? 'center' : 'flex-start' }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: 'linear-gradient(135deg,var(--blue),var(--mid))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', fontFamily: 'Syne', flexShrink: 0 }}>
            {initial}
          </div>
          {!collapsed && (
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.full_name}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'capitalize' }}>{user?.plan_tier} plan</div>
            </div>
          )}
        </div>
        <div className="relative group">
          <button onClick={() => { logout(); navigate('/') }} className="nav-item" style={{ width: '100%', justifyContent: collapsed ? 'center' : 'flex-start', color: 'var(--faint)' }}>
            <LogOut size={17} />
            {!collapsed && <span style={{ fontSize: 12 }}>Sign Out</span>}
          </button>
          {collapsed && <span className="kip-tooltip">Sign Out</span>}
        </div>
      </div>
    </>
  )
}

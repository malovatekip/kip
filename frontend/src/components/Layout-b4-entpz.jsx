import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import {
  LayoutDashboard, MessageSquare, Lightbulb, LogOut,
  Newspaper, ChevronRight, PanelLeftClose, PanelLeftOpen,
  FileText, Globe, X, Menu, Sun, Moon
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
  const { user, logout }    = useAuth()
  const { theme, toggle, isDark } = useTheme()
  const location            = useLocation()
  const navigate            = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed,  setCollapsed]  = useState(() => {
    try { return localStorage.getItem('kip_sb') === '1' } catch { return false }
  })
  const [alerts, setAlerts] = useState(0)

  useEffect(() => {
    try { localStorage.setItem('kip_sb', collapsed ? '1' : '0') } catch {}
  }, [collapsed])

  useEffect(() => {
    const fetch = () => api.get('/news/alerts/count').then(r => setAlerts(r.data?.unread || 0)).catch(() => {})
    fetch()
    const iv = setInterval(fetch, 300000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  const initial   = user?.full_name?.[0]?.toUpperCase() || '?'
  const BOTTOM_NAV = NAV.slice(0, 5)

  /* ── Theme toggle button ── */
  const ThemeBtn = ({ size = 18 }) => (
    <button onClick={toggle} className="theme-toggle" title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
      {isDark ? <Sun size={size} /> : <Moon size={size} />}
    </button>
  )

  /* ── Shared nav link ── */
  const NavLink = ({ to, icon: Icon, label, badge = 0, mobile = false }) => {
    const active = location.pathname.startsWith(to)
    return (
      <Link to={to} style={{
        display: 'flex', alignItems: 'center',
        gap: mobile ? 12 : (collapsed ? 0 : 12),
        padding: mobile ? '12px 14px' : '10px 12px',
        borderRadius: 10, marginBottom: 3, textDecoration: 'none',
        color: active ? 'var(--blue-bright)' : 'var(--muted)',
        background: active ? 'var(--nav-active-bg)' : 'transparent',
        border: `1px solid ${active ? 'var(--nav-active-border)' : 'transparent'}`,
        fontFamily: 'Plus Jakarta Sans', fontWeight: active ? 600 : 500, fontSize: 13.5,
        justifyContent: (!mobile && collapsed) ? 'center' : 'flex-start',
        transition: 'all 0.2s ease',
        position: 'relative',
      }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <Icon size={mobile ? 19 : 18} />
          {badge > 0 && (
            <span style={{ position: 'absolute', top: -5, right: -5, background: 'var(--gold)', color: '#040C18', fontSize: 8, fontWeight: 800, width: 14, height: 14, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {badge > 9 ? '9+' : badge}
            </span>
          )}
        </div>
        {(mobile || !collapsed) && <span style={{ flex: 1 }}>{label}</span>}
        {(mobile || !collapsed) && active && <ChevronRight size={13} style={{ opacity: 0.4 }} />}
      </Link>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden', background: 'var(--base)', position: 'relative' }}>
      <div className="mesh-bg" />

      {/* ═══ MOBILE OVERLAY ═══ */}
      {mobileOpen && (
        <div onClick={() => setMobileOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }} />
      )}

      {/* ═══ DESKTOP SIDEBAR ═══ */}
      <aside className="kip-sidebar-desktop" style={{
        width: collapsed ? 68 : 256, flexShrink: 0,
        display: 'none', flexDirection: 'column',
        transition: 'width 0.28s cubic-bezier(0.4,0,0.2,1)',
        overflow: 'hidden', position: 'relative', zIndex: 10,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 10, padding: collapsed ? '0 14px' : '0 14px', height: 64, borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <img src={KIP_LOGO} alt="KIP" style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} className="animate-logo-glow" />
          {!collapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 15, letterSpacing: '0.1em', color: 'var(--text)' }}>KIP</div>
              <div style={{ fontSize: 9, color: 'var(--muted)' }}>Business Intelligence</div>
            </div>
          )}
          {!collapsed && <ThemeBtn size={16} />}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 8px' }}>
          {NAV.map(({ to, icon, label }) => (
            <div key={to} style={{ position: 'relative' }} className="group">
              <NavLink to={to} icon={icon} label={label} badge={label === 'News' ? alerts : 0} />
              {collapsed && <span className="kip-tooltip">{label}</span>}
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div style={{ borderTop: '1px solid var(--border)', padding: '10px 8px' }}>
          {/* Theme toggle when collapsed */}
          {collapsed && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
              <ThemeBtn />
            </div>
          )}
          {/* Collapse toggle */}
          <div style={{ position: 'relative' }} className="group">
            <button onClick={() => setCollapsed(c => !c)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 10, background: 'none', border: 'none',
              color: 'var(--muted)', cursor: 'pointer', justifyContent: collapsed ? 'center' : 'flex-start',
              fontSize: 12, fontFamily: 'Plus Jakarta Sans',
            }}>
              {collapsed ? <PanelLeftOpen size={17} /> : <><PanelLeftClose size={17} /><span>Collapse</span></>}
            </button>
            {collapsed && <span className="kip-tooltip">Expand</span>}
          </div>
          {/* User */}
          <div style={{ display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 8, padding: '8px 10px', justifyContent: collapsed ? 'center' : 'flex-start' }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: 'linear-gradient(135deg,var(--blue),var(--blue-mid))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', fontFamily: 'Syne', flexShrink: 0 }}>
              {initial}
            </div>
            {!collapsed && (
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.full_name}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'capitalize' }}>{user?.plan_tier} plan</div>
              </div>
            )}
          </div>
          {/* Logout */}
          <div style={{ position: 'relative' }} className="group">
            <button onClick={() => { logout(); navigate('/') }} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 10, background: 'none', border: 'none',
              color: 'var(--muted)', cursor: 'pointer', justifyContent: collapsed ? 'center' : 'flex-start',
              fontSize: 12, fontFamily: 'Plus Jakarta Sans',
            }}>
              <LogOut size={17} />
              {!collapsed && <span>Sign Out</span>}
            </button>
            {collapsed && <span className="kip-tooltip">Sign Out</span>}
          </div>
        </div>
      </aside>

      {/* ═══ MOBILE DRAWER ═══ */}
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
              <div style={{ fontSize: 9, color: 'var(--muted)' }}>Business Intelligence</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <ThemeBtn />
            <button onClick={() => setMobileOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>
        </div>
        <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 10px' }}>
          {NAV.map(({ to, icon, label }) => (
            <NavLink key={to} to={to} icon={icon} label={label} badge={label === 'News' ? alerts : 0} mobile />
          ))}
        </nav>
        <div style={{ padding: '12px 10px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', marginBottom: 6 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,var(--blue),var(--blue-mid))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: 'Syne' }}>
              {initial}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{user?.full_name}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'capitalize' }}>{user?.plan_tier} plan</div>
            </div>
          </div>
          <button onClick={() => { logout(); navigate('/') }} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '11px 14px', borderRadius: 10,
            background: 'rgba(224,38,62,0.08)', border: '1px solid rgba(224,38,62,0.2)',
            color: 'var(--red)', cursor: 'pointer', fontFamily: 'Plus Jakarta Sans', fontWeight: 600, fontSize: 13,
          }}>
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* ═══ MAIN CONTENT ═══ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden', position: 'relative', zIndex: 10 }}>

        {/* Mobile header */}
        <header className="kip-mobile-header" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingTop: 'max(env(safe-area-inset-top,0px),10px)',
          paddingBottom: 10, paddingLeft: 14, paddingRight: 14,
          flexShrink: 0, minHeight: 54,
        }}>
          <button onClick={() => setMobileOpen(true)} style={{
            background: 'var(--input-bg)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '7px 9px', cursor: 'pointer', color: 'var(--text)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Menu size={19} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src={KIP_LOGO} alt="KIP" style={{ width: 28, height: 28, borderRadius: 8, objectFit: 'cover' }} className="animate-logo-glow" />
            <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 15, letterSpacing: '0.1em', color: 'var(--text)' }}>KIP</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ThemeBtn size={16} />
            {alerts > 0 && (
              <Link to="/news" style={{ position: 'relative', color: 'var(--muted)', display: 'flex' }}>
                <Newspaper size={20} />
                <span style={{ position: 'absolute', top: -4, right: -4, background: 'var(--gold)', color: '#040C18', fontSize: 8, fontWeight: 800, width: 14, height: 14, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {alerts}
                </span>
              </Link>
            )}
          </div>
        </header>

        {/* Page */}
        <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 64px)', WebkitOverflowScrolling: 'touch' }}
          className="kip-main-content">
          {children}
        </main>

        {/* Bottom nav */}
        <nav className="kip-bottom-nav" style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          paddingBottom: 'env(safe-area-inset-bottom,0px)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-around',
          zIndex: 50, minHeight: 56,
        }}>
          {BOTTOM_NAV.map(({ to, icon: Icon, label }) => {
            const active = location.pathname.startsWith(to)
            const badge  = label === 'News' ? alerts : 0
            return (
              <Link key={to} to={to} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 3, padding: '8px 10px', textDecoration: 'none', flex: 1, position: 'relative',
              }}>
                <div style={{ position: 'relative' }}>
                  <Icon size={21} style={{ color: active ? 'var(--blue-bright)' : 'var(--faint)', transition: 'color 0.2s' }} />
                  {badge > 0 && (
                    <span style={{ position: 'absolute', top: -4, right: -4, background: 'var(--gold)', color: '#040C18', fontSize: 7, fontWeight: 800, width: 13, height: 13, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {badge}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 9.5, fontFamily: 'Syne', fontWeight: active ? 700 : 500, color: active ? 'var(--blue-bright)' : 'var(--faint)', transition: 'color 0.2s' }}>
                  {label}
                </span>
                {active && (
                  <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 20, height: 2, borderRadius: 2, background: 'linear-gradient(90deg,var(--blue),var(--teal))' }} />
                )}
              </Link>
            )
          })}
        </nav>
      </div>

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

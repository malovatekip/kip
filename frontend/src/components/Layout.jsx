import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import {
  LayoutDashboard, MessageSquare, Lightbulb, LogOut,
  Menu, X, Newspaper, ChevronRight,
  PanelLeftClose, PanelLeftOpen, FileText, Globe
} from 'lucide-react'
import api from '../lib/api'
import KIP_LOGO from '../kipLogo'

const NAV = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard'   },
  { to: '/chat',         icon: MessageSquare,   label: 'Ask KIP'     },
  { to: '/news',         icon: Newspaper,       label: 'News Feed'   },
  { to: '/ideas',        icon: Lightbulb,       label: 'My Ideas'    },
  { to: '/templates',    icon: FileText,        label: 'Templates'   },
  { to: '/survey',       icon: Globe,           label: 'Area Survey' },
]

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const location  = useLocation()
  const navigate  = useNavigate()
  const [mobile,    setMobile]    = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('kip_sb') === '1' } catch { return false }
  })
  const [alerts, setAlerts] = useState(0)

  useEffect(() => {
    try { localStorage.setItem('kip_sb', collapsed ? '1' : '0') } catch {}
  }, [collapsed])

  useEffect(() => {
    const f = () => api.get('/news/alerts/count').then(r => setAlerts(r.data?.unread || 0)).catch(() => {})
    f()
    const iv = setInterval(f, 300000)
    return () => clearInterval(iv)
  }, [])

  const initial = user?.full_name?.[0]?.toUpperCase() || '?'

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--base)' }}>

      {/* Mesh background */}
      <div className="mesh-bg" />

      {/* Mobile backdrop */}
      {mobile && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'rgba(4,12,24,0.75)', backdropFilter: 'blur(8px)' }}
          onClick={() => setMobile(false)}
        />
      )}

      {/* ═══ SIDEBAR ═══ */}
      <aside
        className={`sidebar ${collapsed ? 'collapsed' : ''} fixed top-0 left-0 z-50 h-screen flex flex-col
          ${mobile ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:relative`}
        style={{
          background: 'linear-gradient(180deg, rgba(11,22,40,0.97) 0%, rgba(6,12,22,0.99) 100%)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(40px)',
        }}
      >
        {/* Logo area */}
        <div
          className="flex items-center border-b flex-shrink-0 h-16"
          style={{
            borderColor: 'rgba(255,255,255,0.06)',
            padding: collapsed ? '0 14px' : '0 18px',
            gap: collapsed ? 0 : 12,
          }}
        >
          <div className="relative flex-shrink-0">
            <img
              src={KIP_LOGO}
              alt="KIP"
              className="animate-logo-glow"
              style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover' }}
            />
            <span
              className="absolute -bottom-0.5 -right-0.5 live-dot"
              style={{ width: 10, height: 10, border: '2px solid var(--surface)' }}
            />
          </div>
          {!collapsed && (
            <div className="animate-fade-in overflow-hidden">
              <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 15, letterSpacing: '0.12em', color: '#fff', lineHeight: 1 }}>KIP</div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2, letterSpacing: '0.04em' }}>Business Intelligence</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 space-y-0.5" style={{ padding: '16px 10px' }}>
          {NAV.map(({ to, icon: Icon, label }) => {
            const active = location.pathname.startsWith(to)
            const badge  = label === 'News Feed' ? alerts : 0
            return (
              <div key={to} className="relative group">
                <Link
                  to={to}
                  onClick={() => setMobile(false)}
                  className={`nav-item ${active ? 'active' : ''}`}
                  style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
                >
                  <div className="relative flex-shrink-0">
                    <Icon size={18} />
                    {badge > 0 && (
                      <span style={{
                        position: 'absolute', top: -6, right: -6,
                        background: 'var(--gold)', color: '#040C18',
                        fontSize: 9, fontWeight: 800, fontFamily: 'Syne',
                        width: 16, height: 16, borderRadius: 8,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {badge > 9 ? '9+' : badge}
                      </span>
                    )}
                  </div>
                  {!collapsed && <span className="flex-1 animate-fade-in">{label}</span>}
                  {!collapsed && active && <ChevronRight size={14} style={{ opacity: 0.5 }} />}
                </Link>
                {collapsed && <span className="kip-tooltip">{label}</span>}
              </div>
            )
          })}
        </nav>

        {/* Bottom area */}
        <div className="flex-shrink-0 space-y-1" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '12px 10px' }}>
          {/* Collapse toggle */}
          <div className="relative group">
            <button
              onClick={() => setCollapsed(c => !c)}
              className="nav-item hidden lg:flex w-full"
              style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
            >
              {collapsed
                ? <PanelLeftOpen size={17} />
                : <><PanelLeftClose size={17} /><span className="text-xs animate-fade-in">Collapse</span></>
              }
            </button>
            {collapsed && <span className="kip-tooltip">Expand</span>}
          </div>

          {/* User */}
          <div className="flex items-center rounded-xl" style={{
            gap: collapsed ? 0 : 10,
            padding: collapsed ? '8px 15px' : '8px 10px',
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: 'linear-gradient(135deg, var(--blue), var(--mid))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, fontFamily: 'Syne', color: '#fff', flexShrink: 0,
              boxShadow: '0 2px 8px rgba(27,110,243,0.3)',
            }}>
              {initial}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1 animate-fade-in">
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.full_name}
                </div>
                <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'capitalize' }}>
                  {user?.plan_tier} plan
                </div>
              </div>
            )}
          </div>

          {/* Logout */}
          <div className="relative group">
            <button
              onClick={() => { logout(); navigate('/') }}
              className="nav-item w-full"
              style={{ justifyContent: collapsed ? 'center' : 'flex-start', color: 'var(--faint)' }}
            >
              <LogOut size={17} className="flex-shrink-0" />
              {!collapsed && <span className="text-xs animate-fade-in">Sign Out</span>}
            </button>
            {collapsed && <span className="kip-tooltip">Sign Out</span>}
          </div>
        </div>
      </aside>

      {/* ═══ MAIN ═══ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-4 h-14 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(8,15,30,0.8)', backdropFilter: 'blur(20px)' }}>
          <div className="flex items-center gap-2">
            <img src={KIP_LOGO} alt="KIP" style={{ width: 32, height: 32, borderRadius: 9, objectFit: 'cover' }} className="animate-logo-glow" />
            <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 14, letterSpacing: '0.12em', color: '#fff' }}>KIP</span>
          </div>
          <div className="flex items-center gap-1">
            {alerts > 0 && (
              <Link to="/news" className="relative p-2" style={{ color: 'var(--muted)' }}>
                <Newspaper size={20} />
                <span style={{ position: 'absolute', top: 4, right: 4, background: 'var(--gold)', color: '#040C18', width: 16, height: 16, borderRadius: 8, fontSize: 9, fontWeight: 800, fontFamily: 'Syne', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {alerts > 9 ? '9+' : alerts}
                </span>
              </Link>
            )}
            <button onClick={() => setMobile(!mobile)} className="p-2 rounded-lg" style={{ color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
              {mobile ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="animate-fade-in h-full">{children}</div>
        </main>
      </div>
    </div>
  )
}

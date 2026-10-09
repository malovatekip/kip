import { TranslationProvider } from './context/TranslationContext'
import React, { Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './hooks/useAuth'
// import { LoginPage, RegisterPage } from './pages/AuthPages'
import { ThemeProvider } from './hooks/useTheme'

import LandingPage           from './pages/LandingPage'
import LoginPage             from './pages/LoginPage'
import RegisterPage          from './pages/RegisterPage'
import VerifyEmailPage       from './pages/VerifyEmailPage'
import ForgotPasswordPage    from './pages/ForgotPasswordPage'
import ResetPasswordPage     from './pages/ResetPasswordPage'
import SettingsPage          from './pages/SettingsPage'
import DashboardPage         from './pages/DashboardPage'
import ChatPage              from './pages/ChatPage'
import NewsPage              from './pages/NewsPage'
import IdeasPage             from './pages/IdeasPage'
import BusinessDashboardPage from './pages/BusinessDashboardPage'
import EnhancedLogPage       from './pages/EnhancedLogPage'
import TemplatesPage         from './pages/TemplatesPage'
import EnterprisePage        from './pages/EnterprisePage'

// Legal pages
import TermsPage             from './pages/legal/TermsPage'
import PrivacyPage           from './pages/legal/PrivacyPage'
import { CookiePage, AboutPage, ContactPage } from './pages/legal/OtherPages'

import CapitalAccessPage from './pages/CapitalAccessPage'
import SimulatePage from './pages/SimulatePage'
import AdminUsagePage from './pages/AdminUsagePage'
const AdminMapPage = React.lazy(() => import('./pages/AdminMapPage'))

// ── NEW: Startup guidance page (CTO addition — business registration roadmap) ──
import StartupPage     from './pages/StartupPage'
import StartupChatPage from './pages/StartupChatPage'




// Field data collection (collector staff only). Loaded on demand so the map
// library stays out of the main bundle.
import { FieldGuard } from './components/field/fieldUi'
const FieldHomePage    = React.lazy(() => import('./pages/field/FieldHomePage'))
const FieldCapturePage = React.lazy(() => import('./pages/field/FieldCapturePage'))
const FieldMarketPage  = React.lazy(() => import('./pages/field/FieldMarketPage'))
const FieldReviewPage  = React.lazy(() => import('./pages/field/FieldReviewPage'))

function Protected({ children }) {
  const token =
    localStorage.getItem('kip_token') ||
    localStorage.getItem('token') ||
    localStorage.getItem('access_token')
  return token ? children : <Navigate to="/login" replace />
}

function AppRoutes() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--surface)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            fontSize: '13px',
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          },
          success: { iconTheme: { primary: '#0DAD55', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#E0263E', secondary: '#fff' } },
        }}
      />
      <Suspense fallback={null}>
      <Routes>
        {/* Public */}
        <Route path="/"              element={<LandingPage />} />
        <Route path="/login"         element={<LoginPage />} />
        <Route path="/register"      element={<RegisterPage />} />
        <Route path="/verify-email"  element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password"  element={<ResetPasswordPage />} />

        {/* Legal — public, no auth required */}
        <Route path="/legal/terms"   element={<TermsPage />} />
        <Route path="/legal/privacy" element={<PrivacyPage />} />
        <Route path="/legal/cookies" element={<CookiePage />} />
        <Route path="/about"         element={<AboutPage />} />
        <Route path="/contact"       element={<ContactPage />} />

        {/* Protected */}
        <Route path="/dashboard"   element={<Protected><DashboardPage /></Protected>} />
        <Route path="/chat"        element={<Protected><ChatPage /></Protected>} />
        <Route path="/chat/:id"    element={<Protected><ChatPage /></Protected>} />
        <Route path="/news"        element={<Protected><NewsPage /></Protected>} />
        <Route path="/ideas"       element={<Protected><IdeasPage /></Protected>} />
        <Route path="/templates"   element={<Protected><TemplatesPage /></Protected>} />
        <Route path="/enterprise"  element={<Protected><EnterprisePage /></Protected>} />
        <Route path="/capital" element={<Protected><CapitalAccessPage /></Protected>} />
        {/* Dev-only replay of a recorded engine session, viewable without the backend. */}
        {import.meta.env.DEV && <Route path="/simulate/demo" element={<SimulatePage demo />} />}
        <Route path="/simulate/:ideaId" element={<Protected><SimulatePage /></Protected>} />
        <Route path="/settings" element={<Protected><SettingsPage /></Protected>} />
        {/* Admin only: the page itself redirects non-admins to /dashboard. */}
        <Route path="/admin/usage" element={<Protected><AdminUsagePage /></Protected>} />
        <Route path="/admin/map" element={<Protected><AdminMapPage /></Protected>} />

        {/* ── NEW: Startup guidance — protected, business registration roadmap ── */}
        <Route path="/startup"            element={<Protected><StartupPage /></Protected>} />
        <Route path="/startup/chat"       element={<Protected><StartupChatPage /></Protected>} />
        <Route path="/startup/chat/:stepId" element={<Protected><StartupChatPage /></Protected>} />

        {/* Business */}
        <Route path="/business/:planId"        element={<Protected><BusinessDashboardPage /></Protected>} />
        <Route path="/business/:planId/log"    element={<Protected><EnhancedLogPage /></Protected>} />

        {/* Field data collection — collectors and supervisors only */}
        <Route path="/field"         element={<FieldGuard><FieldHomePage /></FieldGuard>} />
        <Route path="/field/capture" element={<FieldGuard><FieldCapturePage /></FieldGuard>} />
        <Route path="/field/market"  element={<FieldGuard><FieldMarketPage /></FieldGuard>} />
        <Route path="/field/review"  element={<FieldGuard supervisor><FieldReviewPage /></FieldGuard>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </>
  )
}

export default function App() {
  return (
    <ThemeProvider>
        <TranslationProvider>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </TranslationProvider>
    </ThemeProvider>
  )
}

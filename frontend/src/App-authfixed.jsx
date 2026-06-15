import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { ThemeProvider } from './hooks/useTheme'

import LandingPage           from './pages/LandingPage'
import LoginPage             from './pages/LoginPage'
import RegisterPage          from './pages/RegisterPage'
import DashboardPage         from './pages/DashboardPage'
import ChatPage              from './pages/ChatPage'
import NewsPage              from './pages/NewsPage'
import IdeasPage             from './pages/IdeasPage'
import BusinessDashboardPage from './pages/BusinessDashboardPage'
import EnhancedLogPage       from './pages/EnhancedLogPage'
import SurveyPage            from './pages/SurveyPage'
import TemplatesPage         from './pages/TemplatesPage'
import GeneralSurveyPage     from './pages/GeneralSurveyPage'
import EnterprisePage        from './pages/EnterprisePage'
import TermsPage             from './pages/legal/TermsPage'
import PrivacyPage           from './pages/legal/PrivacyPage'
import { CookiePage, AboutPage, ContactPage } from './pages/legal/OtherPages'
import { PricingPage, BillingPage }           from './pages/PricingAndBilling'

function Protected({ children }) {
  const { token } = useAuth()
  if (!token) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
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
          <Routes>
            {/* Public */}
            <Route path="/"              element={<LandingPage />} />
            <Route path="/login"         element={<LoginPage />} />
            <Route path="/register"      element={<RegisterPage />} />
            <Route path="/pricing"       element={<PricingPage />} />
            <Route path="/legal/terms"   element={<TermsPage />} />
            <Route path="/legal/privacy" element={<PrivacyPage />} />
            <Route path="/legal/cookies" element={<CookiePage />} />
            <Route path="/about"         element={<AboutPage />} />
            <Route path="/contact"       element={<ContactPage />} />

            {/* Protected */}
            <Route path="/dashboard"  element={<Protected><DashboardPage /></Protected>} />
            <Route path="/chat"       element={<Protected><ChatPage /></Protected>} />
            <Route path="/chat/:id"   element={<Protected><ChatPage /></Protected>} />
            <Route path="/news"       element={<Protected><NewsPage /></Protected>} />
            <Route path="/ideas"      element={<Protected><IdeasPage /></Protected>} />
            <Route path="/templates"  element={<Protected><TemplatesPage /></Protected>} />
            <Route path="/survey"     element={<Protected><GeneralSurveyPage /></Protected>} />
            <Route path="/enterprise" element={<Protected><EnterprisePage /></Protected>} />
            <Route path="/billing"    element={<Protected><BillingPage /></Protected>} />

            {/* Business */}
            <Route path="/business/:planId"        element={<Protected><BusinessDashboardPage /></Protected>} />
            <Route path="/business/:planId/log"    element={<Protected><EnhancedLogPage /></Protected>} />
            <Route path="/business/:planId/survey" element={<Protected><SurveyPage /></Protected>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

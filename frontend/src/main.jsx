import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './hooks/useAuth'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#0A1628', color: '#fff', border: '1px solid #1565C0' },
            success: { iconTheme: { primary: '#42A5F5', secondary: '#0A1628' } },
            error:   { iconTheme: { primary: '#EF5350', secondary: '#fff' } }
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)

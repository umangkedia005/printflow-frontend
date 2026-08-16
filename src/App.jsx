import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import HomePage from './pages/HomePage'
import SuccessPage from './pages/SuccessPage'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import PrivacyPage from './pages/PrivacyPage'
import TermsPage from './pages/TermsPage'
import ProtectedRoute from './components/ProtectedRoute'
import { exchangeToken } from './utils/api'
import './App.css'

// When Shopify loads this app embedded (from the merchant's Shopify admin),
// it appends ?shop=...&host=...&embedded=1. In that case we use App Bridge
// to get a session token and exchange it server-side for a Shopify-compliant
// offline access token, replacing whatever token is currently stored for
// this shop, then redirect into the normal standalone dashboard flow.
function isEmbeddedLoad() {
  const params = new URLSearchParams(window.location.search)
  return !!(
    params.get('shop') &&
    params.get('host') &&
    params.get('embedded') === '1' &&
    window.top !== window.self
  )
}

function EmbeddedTokenExchange() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const shop = params.get('shop')
    let cancelled = false

    function waitForBridge() {
      if (cancelled) return
      if (window.shopify?.idToken) {
        window.shopify.idToken()
          .then(sessionToken => exchangeToken(shop, sessionToken))
          .then(() => { window.location.href = '/dashboard' })
          .catch(() => { window.location.href = '/dashboard' })
      } else {
        setTimeout(waitForBridge, 100)
      }
    }
    waitForBridge()

    return () => { cancelled = true }
  }, [])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', color: '#555' }}>
      Connecting your store...
    </div>
  )
}

function App() {
  if (isEmbeddedLoad()) {
    return <EmbeddedTokenExchange />
  }

  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/" element={<HomePage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route
            path="/success"
            element={
              <ProtectedRoute>
                <SuccessPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App

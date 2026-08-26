import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import HomePage from './pages/HomePage'
import SuccessPage from './pages/SuccessPage'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import BillingConfirmPage from './pages/BillingConfirmPage'
import PrivacyPage from './pages/PrivacyPage'
import TermsPage from './pages/TermsPage'
import ProtectedRoute from './components/ProtectedRoute'
import { exchangeToken } from './utils/api'
import './App.css'

// When Shopify loads this app embedded (from the merchant's Shopify admin),
// it appends ?shop=...&host=... In that case we use App Bridge to get a
// session token and exchange it server-side for a Shopify-compliant offline
// access token, replacing whatever token is currently stored for this shop,
// then redirect into the normal standalone dashboard flow.
//
// Note: embedded=1 is not always present on the iframe URL, so running inside
// a frame with shop+host is what identifies an embedded load. Gating on
// embedded=1 makes Shopify bounce the frame back to the admin in a loop.
function isEmbeddedLoad() {
  const params = new URLSearchParams(window.location.search)
  return !!(
    params.get('shop') &&
    params.get('host') &&
    window.top !== window.self
  )
}

// App Bridge can fail to initialise (app not installed, client ID mismatch,
// blocked frame). Give it a bounded window rather than polling forever, so a
// failure surfaces as a message instead of an endless "Connecting..." screen.
const BRIDGE_TIMEOUT_MS = 10000

function EmbeddedTokenExchange() {
  const [error, setError] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const shop = params.get('shop')
    const deadline = Date.now() + BRIDGE_TIMEOUT_MS
    let cancelled = false

    function waitForBridge() {
      if (cancelled) return
      if (window.shopify?.idToken) {
        window.shopify.idToken()
          .then(sessionToken => exchangeToken(shop, sessionToken))
          .then(() => {
            // The shop is verified at this point, but it can only be linked to
            // an account once one exists — the merchant may still have to sign
            // up. Hand it to the dashboard, which links it when that happens.
            localStorage.setItem('pf_shop', shop)
            localStorage.setItem('pf_pending_link', shop)
            window.location.href = '/dashboard'
          })
          .catch(err => { if (!cancelled) setError(err.message || 'Could not connect your store.') })
      } else if (Date.now() < deadline) {
        setTimeout(waitForBridge, 100)
      } else {
        setError('Shopify App Bridge did not load. Try reopening the app from your Shopify admin.')
      }
    }
    waitForBridge()

    return () => { cancelled = true }
  }, [])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center', fontFamily: 'Inter, sans-serif', color: error ? '#b42318' : '#555' }}>
      {error || 'Connecting your store...'}
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
          <Route
            path="/billing/confirm"
            element={
              <ProtectedRoute>
                <BillingConfirmPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App

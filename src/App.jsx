import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
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
// we use App Bridge to get a session token and exchange it server-side for a
// Shopify-compliant offline access token, replacing whatever token is stored
// for this shop, before rendering the app.
//
// Deliberately not driven by the query string. Shopify appends shop/host to
// the iframe URL, but App Bridge strips them via history.replaceState during
// its own init — and its script tag runs before this bundle, so by the time
// we look, location.search is usually empty. Running inside a frame with App
// Bridge present is the signal that survives that race.
function isEmbeddedLoad() {
  return window.top !== window.self && !!window.shopify
}

// Same reason: read the shop from App Bridge's config, falling back to the
// query string on the first load where it is still present.
function embeddedShop() {
  return (
    window.shopify?.config?.shop ||
    new URLSearchParams(window.location.search).get('shop') ||
    null
  )
}

// App Bridge can fail to initialise (app not installed, client ID mismatch,
// blocked frame). Give it a bounded window rather than polling forever, so a
// failure surfaces as a message instead of an endless "Connecting..." screen.
const BRIDGE_TIMEOUT_MS = 10000

function Splash({ error }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center', fontFamily: 'Inter, sans-serif', color: error ? '#b42318' : '#555' }}>
      {error || 'Connecting your store...'}
    </div>
  )
}

// Runs the exchange, then renders the app in place. Deliberately no redirect
// afterwards: an embedded load is now identified by the frame and App Bridge
// rather than by query params, so navigating would re-enter this path and
// exchange forever.
function useEmbeddedTokenExchange(enabled) {
  const [done, setDone] = useState(!enabled)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!enabled) return
    const shop = embeddedShop()
    const deadline = Date.now() + BRIDGE_TIMEOUT_MS
    let cancelled = false

    function waitForBridge() {
      if (cancelled) return
      if (window.shopify?.idToken && shop) {
        window.shopify.idToken()
          .then(sessionToken => exchangeToken(shop, sessionToken))
          .then(() => {
            if (cancelled) return
            // The shop is verified at this point, but it can only be linked to
            // an account once one exists — the merchant may still have to sign
            // up. Hand it to the dashboard, which links it when that happens.
            localStorage.setItem('pf_shop', shop)
            localStorage.setItem('pf_pending_link', shop)
            setDone(true)
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
  }, [enabled])

  return { done, error }
}

function App() {
  const embedded = isEmbeddedLoad()
  const { done, error } = useEmbeddedTokenExchange(embedded)

  if (embedded && !done) {
    return <Splash error={error} />
  }

  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          {/* Embedded in the admin, the marketing homepage is never the right
              landing page — send the merchant to their dashboard instead. */}
          <Route path="/" element={embedded ? <Navigate to="/dashboard" replace /> : <HomePage />} />
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

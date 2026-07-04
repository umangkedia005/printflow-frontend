import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function AuthPage() {
  const [isLogin, setIsLogin]   = useState(true)
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [showPass, setShowPass] = useState(false)

  const { currentUser, login, signup, loginWithGoogle, loginWithApple } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (currentUser) navigate('/dashboard', { replace: true })
  }, [currentUser, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isLogin) await login(email, password)
      else await signup(email, password)
    } catch (err) {
      setError(isLogin ? 'Invalid email or password.' : err.message)
      setLoading(false)
    }
  }

  async function handleSocialLogin(provider) {
    setError('')
    setLoading(true)
    try {
      if (provider === 'google') await loginWithGoogle()
      if (provider === 'apple')  await loginWithApple()
    } catch (err) {
      setError(`${provider} sign-in failed. ${err.message}`)
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>

      {/* ── Left: Form panel ── */}
      <div style={{
        width: '50%', flexShrink: 0,
        background: '#ffffff',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '48px 64px',
      }} className="auth-form-panel">

        <div style={{ width: '100%', maxWidth: '360px' }}>

          {/* Logo */}
          <div style={{ marginBottom: '36px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img 
              src="/images/logo.jpg" 
              alt="No Limits Studio" 
              style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} 
            />
            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '18px', color: '#172B15', letterSpacing: '-0.5px' }}>
              No Limits Studio
            </span>
          </div>

          {/* Heading */}
          <h1 style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: '26px', fontWeight: 800,
            color: '#172B15', letterSpacing: '-0.4px',
            marginBottom: '6px',
          }}>
            {isLogin ? 'Welcome back!' : 'Create account'}
          </h1>
          <p style={{ fontSize: '14px', color: '#71717A', marginBottom: '32px', lineHeight: 1.5 }}>
            {isLogin ? 'Login to your dashboard.' : 'Start your print-on-demand journey.'}
          </p>

          {/* Error */}
          {error && (
            <div style={{
              background: '#FFF5F5', border: '1px solid #FED7D7',
              borderRadius: '8px', padding: '10px 14px',
              marginBottom: '20px', fontSize: '13px', color: '#C53030',
              display: 'flex', alignItems: 'center', gap: '7px',
              fontWeight: 500
            }}>
              <span>⚠</span> {error}
            </div>
          )}

          {/* Google button */}
          <button
            onClick={() => handleSocialLogin('google')}
            disabled={loading}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              padding: '13px',
              background: '#FFFFFF', border: '1.5px solid rgba(23,43,21,0.12)', borderRadius: '10px',
              fontSize: '14px', fontWeight: 600, color: '#172B15',
              cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              marginBottom: '12px',
              transition: 'all 0.2s',
            }}
            onMouseOver={e => { e.currentTarget.style.borderColor = '#172B15'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.04)' }}
            onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(23,43,21,0.12)'; e.currentTarget.style.boxShadow = 'none' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          {/* Apple button */}
          <button
            onClick={() => handleSocialLogin('apple')}
            disabled={loading}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              padding: '13px',
              background: '#172B15', border: '1.5px solid #172B15', borderRadius: '10px',
              fontSize: '14px', fontWeight: 600, color: '#ffffff',
              cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              marginBottom: '24px',
              transition: 'opacity 0.15s',
            }}
            onMouseOver={e => e.currentTarget.style.opacity = '0.9'}
            onMouseOut={e => e.currentTarget.style.opacity = '1'}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="white">
              <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701z"/>
            </svg>
            Continue with Apple
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{ flex: 1, height: '1px', background: '#EFEFED' }} />
            <span style={{ fontSize: '11px', color: '#A1A1AA', fontWeight: 700, letterSpacing: '0.06em' }}>OR</span>
            <div style={{ flex: 1, height: '1px', background: '#EFEFED' }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '14px' }}>
              <input
                type="email" required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter Username or Email"
                style={{
                  width: '100%', padding: '14px 16px', boxSizing: 'border-box',
                  border: '1.5px solid rgba(23,43,21,0.12)', borderRadius: '10px',
                  fontSize: '14px', color: '#172B15', outline: 'none',
                  fontFamily: 'Inter, sans-serif', background: '#FAFAF8',
                  transition: 'all 0.2s',
                }}
                onFocus={e => { e.target.style.borderColor = '#39B54A'; e.target.style.boxShadow = '0 0 0 3px rgba(57,181,74,0.08)' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(23,43,21,0.12)'; e.target.style.boxShadow = 'none' }}
              />
            </div>

            <div style={{ marginBottom: '8px', position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'} required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter Password"
                style={{
                  width: '100%', padding: '14px 44px 14px 16px', boxSizing: 'border-box',
                  border: '1.5px solid rgba(23,43,21,0.12)', borderRadius: '10px',
                  fontSize: '14px', color: '#172B15', outline: 'none',
                  fontFamily: 'Inter, sans-serif', background: '#FAFAF8',
                  transition: 'all 0.2s',
                }}
                onFocus={e => { e.target.style.borderColor = '#39B54A'; e.target.style.boxShadow = '0 0 0 3px rgba(57,181,74,0.08)' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(23,43,21,0.12)'; e.target.style.boxShadow = 'none' }}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#A1A1AA', fontSize: '13px', padding: 0,
                }}
              >{showPass ? '○' : '●'}</button>
            </div>

            <div style={{ textAlign: 'right', marginBottom: '24px' }}>
              <button type="button" style={{ background: 'none', border: 'none', fontSize: '12px', color: '#39B54A', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '14px',
                background: '#B9F95D', color: '#172B15',
                border: 'none', borderRadius: '10px',
                fontSize: '14px', fontWeight: 750,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'Inter, sans-serif',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                transition: 'all 0.2s',
                boxShadow: '0 4px 12px rgba(185,249,93,0.2)',
                marginBottom: '14px',
              }}
              onMouseOver={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(185,249,93,0.3)' } }}
              onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(185,249,93,0.2)' }}
            >
              {loading ? (
                <>
                  <span style={{ width: '14px', height: '14px', border: '2px solid rgba(23,43,21,0.2)', borderTop: '2px solid #172B15', borderRadius: '50%', animation: 'pf-spin 0.7s linear infinite' }} />
                  {isLogin ? 'Signing in...' : 'Creating account...'}
                </>
              ) : (
                isLogin ? 'Login →' : 'Create account →'
              )}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: '13px', color: '#71717A', marginTop: '8px' }}>
            {isLogin ? 'New to No Limits Studio? ' : 'Already have an account? '}
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError('') }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#39B54A', fontWeight: 700, fontSize: '13px', fontFamily: 'Inter, sans-serif' }}
            >
              {isLogin ? 'Signup' : 'Log in'}
            </button>
          </p>

        </div>
      </div>

      {/* ── Right: Visual panel (Deep Forest Gradient + Lime Glowing elements) ── */}
      <div style={{
        flex: 1,
        background: 'linear-gradient(135deg, #172B15 0%, #0C180E 100%)',
        position: 'relative', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }} className="auth-visual-panel">

        {/* Ambient Lime Background glows */}
        <div style={{ position: 'absolute', top: '10%', right: '10%', width: '360px', height: '360px', background: 'radial-gradient(circle, rgba(185,249,93,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '15%', left: '5%', width: '280px', height: '280px', background: 'radial-gradient(circle, rgba(57,181,74,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* T-shirt mockup SVG */}
        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '40px' }}>
          <svg width="280" height="280" viewBox="0 0 280 280" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: '40px', filter: 'drop-shadow(0 20px 60px rgba(185,249,93,0.15))' }}>
            {/* T-shirt shape */}
            <path d="M85 40 L40 80 L70 95 L65 220 L215 220 L210 95 L240 80 L195 40 Q175 55 140 55 Q105 55 85 40Z"
              fill="#111A13" stroke="rgba(185,249,93,0.15)" strokeWidth="1.5"/>
            {/* Collar */}
            <path d="M85 40 Q105 70 140 70 Q175 70 195 40" fill="none" stroke="rgba(185,249,93,0.2)" strokeWidth="1.5"/>
            {/* Design on shirt */}
            <rect x="108" y="110" width="64" height="64" rx="8" fill="rgba(185,249,93,0.06)" stroke="rgba(185,249,93,0.25)" strokeWidth="1"/>
            <text x="140" y="138" textAnchor="middle" fill="rgba(185,249,93,0.9)" fontSize="11" fontFamily="system-ui" fontWeight="600">YOUR</text>
            <text x="140" y="153" textAnchor="middle" fill="rgba(185,249,93,0.9)" fontSize="11" fontFamily="system-ui" fontWeight="600">DESIGN</text>
            <text x="140" y="168" textAnchor="middle" fill="rgba(185,249,93,0.9)" fontSize="11" fontFamily="system-ui" fontWeight="600">HERE</text>
          </svg>

          <h2 style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: '28px', fontWeight: 800,
            color: 'white', letterSpacing: '-0.5px',
            marginBottom: '12px', lineHeight: 1.2,
          }}>
            Your brand.<br/>
            <span style={{ color: '#B9F95D' }}>Printed & shipped.</span>
          </h2>
          <p style={{ fontSize: '14px', color: '#A1A8A3', lineHeight: 1.6, maxWidth: '280px', margin: '0 auto 32px' }}>
            Connect your Shopify store and let No Limits Studio handle manufacturing, printing, and delivery.
          </p>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: '32px', justifyContent: 'center' }}>
            {[['10K+', 'Stores'], ['2M+', 'Orders'], ['24h', 'Fulfillment']].map(([val, label]) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '20px', fontWeight: 800, color: '#B9F95D', marginBottom: '2px' }}>{val}</div>
                <div style={{ fontSize: '11px', color: '#A1A8A3', fontWeight: 550 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Floating badges */}
        <div style={{ 
          position: 'absolute', top: '18%', left: '8%', 
          background: 'rgba(17,26,19,0.7)', 
          border: '1.5px solid rgba(185,249,93,0.15)', 
          borderRadius: '12px', padding: '10px 16px', 
          backdropFilter: 'blur(12px)',
          boxShadow: '0 8px 32px rgba(9,26,14,0.3)'
        }}>
          <div style={{ fontSize: '11px', color: '#889B8E', marginBottom: '2px', fontWeight: 600 }}>New order</div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF' }}>Classic Hoodie × 2</div>
        </div>
        <div style={{ 
          position: 'absolute', bottom: '22%', right: '6%', 
          background: 'rgba(57,181,74,0.1)', 
          border: '1px solid rgba(57,181,74,0.3)', 
          borderRadius: '12px', padding: '10px 16px', 
          backdropFilter: 'blur(12px)',
          boxShadow: '0 8px 32px rgba(9,26,14,0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#B9F95D', boxShadow: '0 0 8px #B9F95D' }} />
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#B9F95D' }}>Shipped · On the way</div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pf-spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .auth-visual-panel { display: none !important; }
          .auth-form-panel { width: 100% !important; padding: 40px 24px !important; }
        }
      `}</style>
    </div>
  )
}

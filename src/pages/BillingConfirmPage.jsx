import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { confirmShopifySubscription } from '../utils/api'

const BillingConfirmPage = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('confirming')
  const [error, setError] = useState('')

  useEffect(() => {
    const shop = searchParams.get('shop')
    const plan = searchParams.get('plan')
    if (!shop || !plan) {
      setStatus('error')
      setError('Missing shop or plan in confirmation link.')
      return
    }
    confirmShopifySubscription(shop, plan)
      .then(() => {
        localStorage.setItem('pf_shop', shop)
        localStorage.setItem('pf_plan', plan)
        setStatus('success')
        setTimeout(() => navigate(`/dashboard?upgraded=${encodeURIComponent(plan)}`, { replace: true }), 1500)
      })
      .catch(err => {
        setStatus('error')
        setError(err.message || 'Subscription could not be confirmed.')
      })
  }, [searchParams, navigate])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', background: '#FAFAF8' }}>
      <div style={{ background: '#fff', border: '1px solid #E8E8E4', borderRadius: '16px', padding: '40px', textAlign: 'center', maxWidth: '420px' }}>
        {status === 'confirming' && <p style={{ color: '#555' }}>Confirming your subscription...</p>}
        {status === 'success' && <p style={{ color: '#166534', fontWeight: 600 }}>✅ Subscription activated! Redirecting to your dashboard...</p>}
        {status === 'error' && (
          <>
            <p style={{ color: '#C53030' }}>⚠ {error}</p>
            <button
              className="pf-btn"
              onClick={() => navigate('/dashboard')}
              style={{ marginTop: '16px', padding: '10px 20px' }}
            >
              Go to Dashboard →
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default BillingConfirmPage

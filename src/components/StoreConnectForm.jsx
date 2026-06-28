import { useState } from 'react'

const StoreConnectForm = () => {
  const [shopDomain, setShopDomain] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const validateShopDomain = (domain) => {
    const clean = domain.replace(/^https?:\/\//, '').replace(/\/$/, '')
    if (!clean.endsWith('.myshopify.com')) return false
    return clean.replace('.myshopify.com', '').length > 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    if (!shopDomain.trim()) {
      setError('Please enter your Shopify store domain')
      return
    }

    const clean = shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, '')

    if (!validateShopDomain(clean)) {
      setError('Enter a valid domain — e.g. yourstore.myshopify.com')
      return
    }

    setIsLoading(true)
    const apiUrl = import.meta.env.VITE_API_URL || 'https://85q0wnxzx3.execute-api.ap-south-1.amazonaws.com/dev'
    window.location.href = `${apiUrl}/auth?shop=${clean}`
  }

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%' }}>
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#555', marginBottom: '6px' }}>
          Shopify store URL
        </label>
        <input
          type="text"
          value={shopDomain}
          onChange={e => { setShopDomain(e.target.value); setError('') }}
          placeholder="yourstore.myshopify.com"
          disabled={isLoading}
          className="pf-input"
        />
        {error && (
          <p style={{ marginTop: '7px', fontSize: '12px', color: '#C53030', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span>⚠</span> {error}
          </p>
        )}
      </div>

      <button type="submit" disabled={isLoading} className="pf-btn" style={{ width: '100%', padding: '13px', fontSize: '14px', marginTop: '4px' }}>
        {isLoading ? (
          <>
            <span style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'pf-spin 0.7s linear infinite', flexShrink: 0 }} />
            Connecting...
          </>
        ) : (
          'Connect My Store →'
        )}
      </button>
    </form>
  )
}

export default StoreConnectForm

import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { openRazorpaySubscription } from '../utils/razorpay'
import { fetchOrders, fetchSubscription, updateSubscription, fetchMyStore } from '../utils/api'

// ── Data ─────────────────────────────────────────────────────────────────────

const MOCK_PRODUCTS = [
  { id: 'p1', shopifyId: '8234567890', name: 'Classic Black Tee', variants: ['S','M','L','XL','XXL'], printFile: 'black-tee-design-v2.png', factorySku: 'GILDAN-64000-BLK', status: 'ready' },
  { id: 'p2', shopifyId: '8234567891', name: 'Premium Hoodie',    variants: ['S','M','L','XL'],     printFile: null,                   factorySku: null,                  status: 'incomplete' },
  { id: 'p3', shopifyId: '8234567892', name: 'White Mug 11oz',    variants: ['Standard'],           printFile: 'mug-art-v1.png',       factorySku: 'ORCA-MUG-11-WHT',     status: 'ready' },
  { id: 'p4', shopifyId: '8234567893', name: 'A3 Poster Print',   variants: ['A3'],                 printFile: 'poster-final.png',     factorySku: 'PRINTFUL-POSTER-A3',  status: 'ready' },
  { id: 'p5', shopifyId: '8234567894', name: 'Classic White Tee', variants: ['S','M','L','XL'],     printFile: null,                   factorySku: 'GILDAN-64000-WHT',    status: 'incomplete' },
]

const PLANS = [
  {
    id: 'starter', name: 'Starter',
    monthlyPrice: 999, annualPrice: 799,
    stores: '1 store', orders: '500 orders/mo',
    features: ['Email notifications', 'Manual fulfillment', 'Order tracking', 'Email support'],
  },
  {
    id: 'growth', name: 'Growth',
    monthlyPrice: 2499, annualPrice: 1999,
    stores: '3 stores', orders: 'Unlimited orders',
    features: ['Everything in Starter', 'Auto-fulfillment', '3 Shopify stores', 'Priority support'],
    recommended: true,
  },
  {
    id: 'agency', name: 'Agency',
    monthlyPrice: 6999, annualPrice: 5599,
    stores: 'Unlimited stores', orders: 'Unlimited orders',
    features: ['Everything in Growth', 'White-label mode', 'Unlimited stores', 'Dedicated manager'],
  },
]

const PLAN_LIMITS  = { free: 50, starter: 500, growth: Infinity, agency: Infinity }
const PLAN_LABELS  = { free: 'Free', starter: 'Starter', growth: 'Growth', agency: 'Agency' }
const ORDERS_USED  = 42 // mock — replace with real API value

const STATUS = {
  queued:    { label: 'Queued',    bg: '#FFF7ED', color: '#C2410C', dot: '#F97316' },
  printing:  { label: 'Printing',  bg: '#EFF6FF', color: '#1D4ED8', dot: '#3B82F6' },
  shipped:   { label: 'Shipped',   bg: '#F5F3FF', color: '#5B21B6', dot: '#8B5CF6' },
  delivered: { label: 'Delivered', bg: '#F0FDF4', color: '#166534', dot: '#22C55E' },
}

const TIMELINE_STEPS = ['queued', 'printing', 'shipped', 'delivered']

// ── Shared UI components ──────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const s = STATUS[status]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: s.bg, color: s.color, padding: '3px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 600 }}>
      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
      {s.label}
    </span>
  )
}

function Toggle({ on, onChange }) {
  return (
    <div onClick={onChange} style={{ width: '38px', height: '22px', background: on ? '#0A0A0A' : '#E8E8E4', borderRadius: '100px', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: '3px', left: on ? '19px' : '3px', width: '16px', height: '16px', background: 'white', borderRadius: '50%', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </div>
  )
}

function SectionCard({ title, children }) {
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E8E8E4', borderRadius: '14px', overflow: 'hidden', marginBottom: '16px' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #E8E8E4' }}>
        <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#0A0A0A' }}>{title}</h3>
      </div>
      <div style={{ padding: '20px' }}>{children}</div>
    </div>
  )
}

function DetailRow({ label, value, mono }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', padding: '10px 14px', borderBottom: '1px solid #F0F0EC' }}>
      <span style={{ fontSize: '12px', color: '#999', fontWeight: 500, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '12px', color: '#0A0A0A', fontWeight: 500, textAlign: 'right', fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</span>
    </div>
  )
}

function InfoSection({ title, children }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#BABAB6', marginBottom: '8px' }}>{title}</div>
      <div style={{ background: '#FAFAF8', border: '1px solid #E8E8E4', borderRadius: '10px', overflow: 'hidden' }}>{children}</div>
    </div>
  )
}

// ── Nav icons ─────────────────────────────────────────────────────────────────

const IconDashboard = () => <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="9.5" y="1" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="1" y="9.5" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="9.5" y="9.5" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.5"/></svg>
const IconOrders   = () => <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h12M2 12h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
const IconProducts = () => <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M8 1.5L14 4.5V11.5L8 14.5L2 11.5V4.5L8 1.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M8 1.5V14.5M2 4.5L8 7.5L14 4.5" stroke="currentColor" strokeWidth="1.5"/></svg>
const IconSettings = () => <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5"/><path d="M8 1.5V3M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1.06 1.06M11.54 11.54l1.06 1.06M3.4 12.6l1.06-1.06M11.54 4.46l1.06-1.06" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
const IconBilling  = () => <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="1" y="3.5" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><path d="M1 6.5h14" stroke="currentColor" strokeWidth="1.5"/><path d="M4 10h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', Icon: IconDashboard },
  { id: 'orders',    label: 'Orders',    Icon: IconOrders },
  { id: 'products',  label: 'Products',  Icon: IconProducts },
  { id: 'billing',   label: 'Billing',   Icon: IconBilling },
  { id: 'settings',  label: 'Settings',  Icon: IconSettings },
]

// ── Upgrade Modal ─────────────────────────────────────────────────────────────

function UpgradeModal({ currentPlan, onClose, onSuccess }) {
  const [cycle, setCycle] = useState('monthly')
  const [loadingPlan, setLoadingPlan] = useState(null)
  const { currentUser } = useAuth()

  async function handleSubscribe(plan) {
    setLoadingPlan(plan.id)
    await openRazorpaySubscription({
      planName: `No Limit Studio ${plan.name}`,
      amount: cycle === 'annual' ? plan.annualPrice * 12 : plan.monthlyPrice,
      billingCycle: cycle,
      email: currentUser?.email,
      onSuccess: () => { setLoadingPlan(null); onSuccess(plan.id) },
      onDismiss: () => setLoadingPlan(null),
    })
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
    >
      <div style={{ background: '#FFFFFF', borderRadius: '20px', width: '100%', maxWidth: '880px', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.2)', animation: 'pf-fade-up 0.25s ease' }}>

        {/* Modal header */}
        <div style={{ padding: '24px 32px', borderBottom: '1px solid #E8E8E4', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '20px', fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.3px', marginBottom: '3px' }}>
              Choose your plan
            </h2>
            <p style={{ fontSize: '13px', color: '#999' }}>Upgrade anytime. Cancel anytime. Billed in INR.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Billing cycle toggle */}
            <div style={{ display: 'flex', background: '#F4F4F0', borderRadius: '10px', padding: '3px', border: '1px solid #E8E8E4' }}>
              {['monthly', 'annual'].map(c => (
                <button key={c} onClick={() => setCycle(c)} style={{
                  padding: '6px 14px', borderRadius: '8px', border: 'none',
                  background: cycle === c ? '#FFFFFF' : 'transparent',
                  color: cycle === c ? '#0A0A0A' : '#999',
                  fontSize: '12px', fontWeight: cycle === c ? 600 : 400,
                  cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                  boxShadow: cycle === c ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: '5px',
                }}>
                  {c === 'monthly' ? 'Monthly' : (
                    <>Annual <span style={{ background: '#DCFCE7', color: '#166534', fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px' }}>−20%</span></>
                  )}
                </button>
              ))}
            </div>
            <button onClick={onClose} style={{ width: '30px', height: '30px', background: '#F4F4F0', border: 'none', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: '#888', cursor: 'pointer' }}
              onMouseOver={e => e.currentTarget.style.background = '#EBEBEB'}
              onMouseOut={e => e.currentTarget.style.background = '#F4F4F0'}
            >✕</button>
          </div>
        </div>

        {/* Plan cards */}
        <div style={{ padding: '28px 32px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {PLANS.map(plan => {
            const price = cycle === 'annual' ? plan.annualPrice : plan.monthlyPrice
            const isLoading = loadingPlan === plan.id
            const isCurrent = currentPlan === plan.id

            return (
              <div key={plan.id} style={{
                background: plan.recommended ? '#FFFFFF' : '#FAFAF8',
                border: plan.recommended ? '2px solid #0A0A0A' : '1px solid #E8E8E4',
                borderRadius: '16px', padding: '24px',
                position: 'relative',
                display: 'flex', flexDirection: 'column',
              }}>
                {plan.recommended && (
                  <div style={{ position: 'absolute', top: '-11px', left: '50%', transform: 'translateX(-50%)', background: '#0A0A0A', color: 'white', fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', padding: '3px 12px', borderRadius: '100px', whiteSpace: 'nowrap' }}>
                    MOST POPULAR
                  </div>
                )}

                {/* Plan name */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0A0A0A', marginBottom: '12px' }}>{plan.name}</div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', marginBottom: '4px' }}>
                    <span style={{ fontFamily: 'Syne, sans-serif', fontSize: '32px', fontWeight: 800, color: '#0A0A0A', lineHeight: 1 }}>
                      ₹{price.toLocaleString('en-IN')}
                    </span>
                    <span style={{ fontSize: '13px', color: '#999', marginBottom: '4px' }}>/mo</span>
                  </div>
                  {cycle === 'annual' && (
                    <div style={{ fontSize: '11px', color: '#22C55E', fontWeight: 500 }}>
                      Billed ₹{(price * 12).toLocaleString('en-IN')}/year
                    </div>
                  )}
                </div>

                {/* Limits */}
                <div style={{ display: 'flex', gap: '6px', marginBottom: '18px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', fontWeight: 500, color: '#555', background: '#F0F0EC', border: '1px solid #E8E8E4', borderRadius: '5px', padding: '2px 8px' }}>{plan.stores}</span>
                  <span style={{ fontSize: '11px', fontWeight: 500, color: '#555', background: '#F0F0EC', border: '1px solid #E8E8E4', borderRadius: '5px', padding: '2px 8px' }}>{plan.orders}</span>
                </div>

                {/* Features */}
                <div style={{ flex: 1, marginBottom: '20px' }}>
                  {plan.features.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#F0FDF4', border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4L3.5 6L6.5 2" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                      <span style={{ fontSize: '12px', color: '#555' }}>{f}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                {isCurrent ? (
                  <div style={{ padding: '11px', borderRadius: '10px', border: '1px solid #E8E8E4', textAlign: 'center', fontSize: '13px', fontWeight: 500, color: '#999' }}>
                    Current plan
                  </div>
                ) : (
                  <button
                    onClick={() => handleSubscribe(plan)}
                    disabled={isLoading}
                    style={{
                      padding: '12px', borderRadius: '10px', border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer',
                      background: plan.recommended ? '#0A0A0A' : '#F4F4F0',
                      color: plan.recommended ? 'white' : '#0A0A0A',
                      fontSize: '13px', fontWeight: 600, fontFamily: 'Inter, sans-serif',
                      transition: 'opacity 0.15s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    }}
                    onMouseOver={e => { if (!isLoading) e.currentTarget.style.opacity = '0.82' }}
                    onMouseOut={e => { e.currentTarget.style.opacity = '1' }}
                  >
                    {isLoading ? (
                      <>
                        <span style={{ width: '13px', height: '13px', border: `2px solid ${plan.recommended ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.15)'}`, borderTop: `2px solid ${plan.recommended ? 'white' : '#0A0A0A'}`, borderRadius: '50%', animation: 'pf-spin 0.7s linear infinite' }} />
                        Processing...
                      </>
                    ) : (
                      `Subscribe to ${plan.name} →`
                    )}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Modal footer */}
        <div style={{ padding: '16px 32px', borderTop: '1px solid #E8E8E4', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
          <span style={{ fontSize: '12px', color: '#BABAB6' }}>🔒 Secured by Razorpay</span>
          <span style={{ fontSize: '12px', color: '#BABAB6' }}>· UPI, Cards, Net Banking</span>
          <span style={{ fontSize: '12px', color: '#BABAB6' }}>· Cancel anytime</span>
          <span style={{ fontSize: '12px', color: '#BABAB6' }}>· No setup fee</span>
        </div>
      </div>
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()

  const [activeNav, setActiveNav]           = useState('dashboard')
  const [statusFilter, setStatusFilter]     = useState('all')
  const [selectedOrder, setSelectedOrder]   = useState(null)
  const [notifs, setNotifs]                 = useState({ orderReceived: true, orderShipped: true, orderDelivered: false })
  const [autoFulfill, setAutoFulfill]       = useState(false)
  const [currentPlan, setCurrentPlan]       = useState(() => localStorage.getItem('pf_plan') || 'free')

  useEffect(() => {
    async function resolveShop() {
      let shop = localStorage.getItem('pf_shop')
      if (!shop && currentUser?.email) {
        shop = await fetchMyStore(currentUser.email)
        if (shop) localStorage.setItem('pf_shop', shop)
      }
      if (shop) {
        setShopDomain(shop)
        fetchSubscription(shop).then(plan => { setCurrentPlan(plan); localStorage.setItem('pf_plan', plan) })
      }
    }
    resolveShop()
  }, [currentUser])
  const [showUpgrade, setShowUpgrade]       = useState(false)
  const [upgradeSuccess, setUpgradeSuccess] = useState(null)
  const [orders, setOrders]                 = useState([])
  const [ordersLoading, setOrdersLoading]   = useState(true)
  const [ordersError, setOrdersError]       = useState(null)

  const [shopDomain, setShopDomain] = useState(localStorage.getItem('pf_shop') || '')
  const planLimit  = PLAN_LIMITS[currentPlan]
  const ordersUsed = orders.length
  const usagePct   = planLimit === Infinity ? 0 : Math.round((ordersUsed / planLimit) * 100)
  const isNearLimit  = currentPlan === 'free' && usagePct >= 80
  const isOverLimit  = currentPlan === 'free' && usagePct >= 100

  const loadOrders = useCallback(async () => {
    if (!shopDomain) return
    setOrdersLoading(true)
    setOrdersError(null)
    try {
      const data = await fetchOrders(shopDomain)
      setOrders(data)
    } catch (err) {
      setOrdersError(err.message)
    } finally {
      setOrdersLoading(false)
    }
  }, [shopDomain])

  useEffect(() => {
    document.body.style.background = '#FAFAF8'
    loadOrders()
    return () => { document.body.style.background = '' }
  }, [loadOrders])

  function handleUpgradeSuccess(planId) {
    setCurrentPlan(planId)
    localStorage.setItem('pf_plan', planId)
    const shop = localStorage.getItem('pf_shop')
    if (shop) updateSubscription(shop, planId)
    setShowUpgrade(false)
    setUpgradeSuccess(planId)
    setActiveNav('billing')
    setTimeout(() => setUpgradeSuccess(null), 4000)
  }

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const firstName = currentUser?.displayName?.split(' ')[0] || currentUser?.email?.split('@')[0] || 'there'

  const filtered = statusFilter === 'all' ? orders : orders.filter(o => o.status === statusFilter)

  const counts = {
    total:     orders.length,
    queued:    orders.filter(o => o.status === 'queued').length,
    printing:  orders.filter(o => o.status === 'printing').length,
    shipped:   orders.filter(o => o.status === 'shipped').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
  }

  // ── Views ──────────────────────────────────────────────────────────────────

  const OrdersView = () => (
    <>
      {/* Usage warning banner */}
      {(isNearLimit || isOverLimit) && (
        <div style={{
          background: isOverLimit ? '#FFF5F5' : '#FFFBEB',
          border: `1px solid ${isOverLimit ? '#FED7D7' : '#FDE68A'}`,
          borderRadius: '10px', padding: '12px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '20px', gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '16px' }}>{isOverLimit ? '🔴' : '⚠️'}</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: isOverLimit ? '#C53030' : '#92400E', marginBottom: '2px' }}>
                {isOverLimit ? 'Order limit reached — new orders are paused' : `${ORDERS_USED} of ${planLimit} orders used this month`}
              </div>
              <div style={{ fontSize: '12px', color: isOverLimit ? '#FC8181' : '#B45309' }}>
                {isOverLimit ? 'Upgrade now to resume fulfillment.' : 'Upgrade to Starter for 500 orders/month.'}
              </div>
            </div>
          </div>
          <button onClick={() => setShowUpgrade(true)} style={{ background: isOverLimit ? '#C53030' : '#0A0A0A', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap', transition: 'opacity 0.15s' }}
            onMouseOver={e => e.currentTarget.style.opacity = '0.82'}
            onMouseOut={e => e.currentTarget.style.opacity = '1'}
          >Upgrade →</button>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '28px' }}>
        {[
          { label: 'Total Orders', value: counts.total,     accent: '#E8E8E4', color: '#0A0A0A' },
          { label: 'Queued',       value: counts.queued,    accent: '#FED7AA', color: '#C2410C' },
          { label: 'Printing',     value: counts.printing,  accent: '#BFDBFE', color: '#1D4ED8' },
          { label: 'Shipped',      value: counts.shipped,   accent: '#DDD6FE', color: '#5B21B6' },
          { label: 'Delivered',    value: counts.delivered, accent: '#BBF7D0', color: '#166534' },
        ].map(s => (
          <div key={s.label} style={{ background: '#FFFFFF', border: '1px solid #E8E8E4', borderTop: `3px solid ${s.accent}`, borderRadius: '12px', padding: '18px 20px 14px' }}>
            <div style={{ fontSize: '30px', fontWeight: 800, color: s.color, fontFamily: 'Syne, sans-serif', lineHeight: 1, marginBottom: '6px' }}>{s.value}</div>
            <div style={{ fontSize: '11px', color: '#BABAB6', fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Orders table */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E8E8E4', borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #E8E8E4', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {['all', 'queued', 'printing', 'shipped', 'delivered'].map(f => (
              <button key={f} onClick={() => setStatusFilter(f)} style={{ padding: '5px 13px', borderRadius: '100px', border: '1px solid', borderColor: statusFilter === f ? '#0A0A0A' : '#E8E8E4', background: statusFilter === f ? '#0A0A0A' : 'transparent', color: statusFilter === f ? '#FFFFFF' : '#888', fontSize: '12px', fontWeight: statusFilter === f ? 600 : 400, cursor: 'pointer', fontFamily: 'Inter, sans-serif', textTransform: 'capitalize', transition: 'all 0.12s' }}>
                {f === 'all' ? 'All orders' : f}
                {f !== 'all' && <span style={{ marginLeft: '5px', opacity: 0.55 }}>{counts[f]}</span>}
              </button>
            ))}
          </div>
          <span style={{ fontSize: '12px', color: '#C8C8C4' }}>{filtered.length} order{filtered.length !== 1 ? 's' : ''}</span>
        </div>
        {ordersLoading ? (
          <div style={{ padding: '72px 32px', textAlign: 'center' }}>
            <div style={{ width: '20px', height: '20px', border: '2px solid #E8E8E4', borderTop: '2px solid #0A0A0A', borderRadius: '50%', animation: 'pf-spin 0.7s linear infinite', margin: '0 auto 16px' }} />
            <div style={{ fontSize: '13px', color: '#BABAB6' }}>Loading orders...</div>
          </div>
        ) : ordersError ? (
          <div style={{ padding: '72px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>⚠️</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#0A0A0A', marginBottom: '6px' }}>Failed to load orders</div>
            <div style={{ fontSize: '13px', color: '#BABAB6', marginBottom: '16px' }}>{ordersError}</div>
            <button onClick={loadOrders} className="pf-btn" style={{ padding: '9px 20px', fontSize: '13px' }}>Retry</button>
          </div>
        ) : filtered.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['Order','Customer','Items','Status','Date','Amount',''].map(h => <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: '10px', fontWeight: 600, color: '#C8C8C4', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid #E8E8E4', background: '#FCFCFB' }}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.map((order, i) => (
                <tr key={order.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid #F4F4F0' : 'none', cursor: 'pointer', transition: 'background 0.1s' }} onMouseOver={e => e.currentTarget.style.background = '#FAFAF8'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '14px 20px', fontSize: '13px', fontWeight: 600, color: '#0A0A0A', fontFamily: 'monospace', letterSpacing: '0.02em' }}>{order.id}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: '#0A0A0A' }}>{order.customer.name}</div>
                    <div style={{ fontSize: '11px', color: '#C8C8C4', marginTop: '1px' }}>{order.customer.email}</div>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ fontSize: '13px', color: '#444' }}>{order.items.reduce((a,b)=>a+b.qty,0)} item{order.items.reduce((a,b)=>a+b.qty,0)>1?'s':''}</div>
                    <div style={{ fontSize: '10px', color: '#C8C8C4', marginTop: '2px', fontFamily: 'monospace' }}>{order.items[0].sku}{order.items.length>1?` +${order.items.length-1}`:''}</div>
                  </td>
                  <td style={{ padding: '14px 20px' }}><StatusBadge status={order.status} /></td>
                  <td style={{ padding: '14px 20px', fontSize: '12px', color: '#C8C8C4' }}>{order.date}</td>
                  <td style={{ padding: '14px 20px', fontSize: '13px', fontWeight: 600, color: '#0A0A0A' }}>{order.amount}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <button onClick={() => setSelectedOrder(order)} style={{ background: 'transparent', border: '1px solid #E8E8E4', borderRadius: '7px', padding: '6px 14px', fontSize: '11px', fontWeight: 500, color: '#666', cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'border-color 0.12s, color 0.12s' }} onMouseOver={e=>{e.currentTarget.style.borderColor='#0A0A0A';e.currentTarget.style.color='#0A0A0A'}} onMouseOut={e=>{e.currentTarget.style.borderColor='#E8E8E4';e.currentTarget.style.color='#666'}}>View →</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: '72px 32px', textAlign: 'center' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#F4F4F0', border: '1px solid #E8E8E4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '18px' }}>📭</div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#0A0A0A', marginBottom: '6px' }}>No orders yet</div>
            <div style={{ fontSize: '13px', color: '#BABAB6', maxWidth: '300px', margin: '0 auto', lineHeight: 1.6 }}>When a customer places an order on your Shopify store, it'll appear here automatically.</div>
          </div>
        )}
      </div>
    </>
  )

  const ProductsView = () => {
    const ready   = MOCK_PRODUCTS.filter(p => p.status === 'ready').length
    const missing = MOCK_PRODUCTS.filter(p => p.status === 'incomplete').length
    return (
      <>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
          <div>
            <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '26px', fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.5px', marginBottom: '4px' }}>Products</h1>
            <p style={{ fontSize: '13px', color: '#BABAB6' }}>Map each Shopify product to a print file and factory SKU.</p>
          </div>
          <button className="pf-btn" style={{ padding: '9px 18px', fontSize: '13px', flexShrink: 0 }}>↻ Sync from Shopify</button>
        </div>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          {[{ label: 'Total products', value: MOCK_PRODUCTS.length, color: '#0A0A0A' }, { label: 'Ready to print', value: ready, color: '#166534' }, { label: 'Needs setup', value: missing, color: '#C2410C' }].map(s => (
            <div key={s.label} style={{ background: '#FFFFFF', border: '1px solid #E8E8E4', borderRadius: '10px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px', fontWeight: 800, color: s.color, fontFamily: 'Syne, sans-serif' }}>{s.value}</span>
              <span style={{ fontSize: '12px', color: '#999' }}>{s.label}</span>
            </div>
          ))}
        </div>
        <div style={{ background: '#FFFFFF', border: '1px solid #E8E8E4', borderRadius: '16px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Product','Variants','Print File','Factory SKU','Status',''].map(h=><th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: '10px', fontWeight: 600, color: '#C8C8C4', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid #E8E8E4', background: '#FCFCFB' }}>{h}</th>)}</tr></thead>
            <tbody>
              {MOCK_PRODUCTS.map((p, i) => (
                <tr key={p.id} style={{ borderBottom: i < MOCK_PRODUCTS.length-1 ? '1px solid #F4F4F0' : 'none', transition: 'background 0.1s' }} onMouseOver={e=>e.currentTarget.style.background='#FAFAF8'} onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0A0A0A' }}>{p.name}</div>
                    <div style={{ fontSize: '10px', color: '#C8C8C4', marginTop: '2px', fontFamily: 'monospace' }}>#{p.shopifyId}</div>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>{p.variants.map(v=><span key={v} style={{ fontSize: '10px', fontWeight: 500, color: '#555', background: '#F4F4F0', border: '1px solid #E8E8E4', borderRadius: '4px', padding: '2px 6px' }}>{v}</span>)}</div>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    {p.printFile ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '28px', height: '28px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>🖼</div>
                        <span style={{ fontSize: '11px', color: '#166534', fontWeight: 500, fontFamily: 'monospace' }}>{p.printFile}</span>
                      </div>
                    ) : <button className="pf-btn" style={{ padding: '5px 12px', fontSize: '11px', borderRadius: '7px' }}>↑ Upload</button>}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    {p.factorySku ? <span style={{ fontSize: '11px', color: '#555', fontFamily: 'monospace', background: '#F4F4F0', padding: '3px 8px', borderRadius: '5px' }}>{p.factorySku}</span>
                      : <button style={{ background: 'transparent', border: '1px solid #E8E8E4', borderRadius: '7px', padding: '5px 12px', fontSize: '11px', color: '#888', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>+ Map SKU</button>}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    {p.status === 'ready'
                      ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#F0FDF4', color: '#166534', padding: '3px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 600 }}><span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#22C55E' }}/>Ready</span>
                      : <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#FFF7ED', color: '#C2410C', padding: '3px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 600 }}><span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#F97316' }}/>Needs setup</span>}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <button style={{ background: 'transparent', border: '1px solid #E8E8E4', borderRadius: '7px', padding: '6px 14px', fontSize: '11px', fontWeight: 500, color: '#666', cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'border-color 0.12s, color 0.12s' }} onMouseOver={e=>{e.currentTarget.style.borderColor='#0A0A0A';e.currentTarget.style.color='#0A0A0A'}} onMouseOut={e=>{e.currentTarget.style.borderColor='#E8E8E4';e.currentTarget.style.color='#666'}}>Edit →</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    )
  }

  const BillingView = () => {
    const planInfo = PLANS.find(p => p.id === currentPlan)
    const isPaid = currentPlan !== 'free'

    return (
      <>
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '26px', fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.5px', marginBottom: '4px' }}>Billing</h1>
          <p style={{ fontSize: '13px', color: '#BABAB6' }}>Manage your subscription and payment details.</p>
        </div>

        {/* Upgrade success banner */}
        {upgradeSuccess && (
          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', animation: 'pf-fade-up 0.3s ease' }}>
            <div style={{ width: '28px', height: '28px', background: '#DCFCE7', border: '1px solid #BBF7D0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#22C55E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#166534' }}>You're now on {PLAN_LABELS[upgradeSuccess]} — welcome!</div>
              <div style={{ fontSize: '12px', color: '#4ADE80' }}>Your new limits are active immediately.</div>
            </div>
          </div>
        )}

        {/* Current plan card */}
        <SectionCard title="Current Plan">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', paddingBottom: isPaid ? '16px' : '0', borderBottom: isPaid ? '1px solid #F4F4F0' : 'none', marginBottom: isPaid ? '16px' : '0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '44px', height: '44px', background: '#0A0A0A', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: 'white', flexShrink: 0 }}>✦</div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#0A0A0A', marginBottom: '3px' }}>{PLAN_LABELS[currentPlan]} Plan</div>
                <div style={{ fontSize: '13px', color: '#999' }}>
                  {currentPlan === 'free' ? '1 store · 50 orders/month · Free forever' : `${planInfo?.stores} · ${planInfo?.orders}`}
                </div>
              </div>
            </div>
            {!isPaid && (
              <button onClick={() => setShowUpgrade(true)} className="pf-btn" style={{ padding: '9px 20px', fontSize: '13px', flexShrink: 0 }}>
                Upgrade Plan →
              </button>
            )}
            {isPaid && (
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#0A0A0A', fontFamily: 'Syne, sans-serif' }}>
                    ₹{planInfo?.monthlyPrice.toLocaleString('en-IN')}<span style={{ fontSize: '12px', fontWeight: 400, color: '#999' }}>/mo</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#BABAB6', marginTop: '2px' }}>Next charge: 1 Jul 2026</div>
                </div>
                <button onClick={() => setShowUpgrade(true)} style={{ background: 'transparent', border: '1px solid #E8E8E4', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', fontWeight: 500, color: '#555', cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'border-color 0.15s, color 0.15s', whiteSpace: 'nowrap' }} onMouseOver={e=>{e.currentTarget.style.borderColor='#0A0A0A';e.currentTarget.style.color='#0A0A0A'}} onMouseOut={e=>{e.currentTarget.style.borderColor='#E8E8E4';e.currentTarget.style.color='#555'}}>
                  Change Plan
                </button>
              </div>
            )}
          </div>
          {isPaid && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#555' }}>
                <div style={{ width: '30px', height: '20px', background: '#1a1a2e', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', color: 'white', fontWeight: 700 }}>VISA</div>
                <span>Visa ending in 4242</span>
                <span style={{ color: '#BABAB6' }}>·</span>
                <button style={{ background: 'none', border: 'none', color: '#3B1F6B', fontSize: '13px', fontWeight: 500, cursor: 'pointer', padding: 0, fontFamily: 'Inter, sans-serif' }}>Update card</button>
              </div>
              <button onClick={() => { setCurrentPlan('free'); }} style={{ background: 'none', border: 'none', color: '#C8C8C4', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', padding: 0 }} onMouseOver={e=>e.currentTarget.style.color='#C53030'} onMouseOut={e=>e.currentTarget.style.color='#C8C8C4'}>Cancel subscription</button>
            </div>
          )}
        </SectionCard>

        {/* Usage meter */}
        <SectionCard title={`Order Usage — ${new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' })}`}>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 500, color: '#0A0A0A' }}>
                {ORDERS_USED} of {planLimit === Infinity ? '∞' : planLimit} orders used
              </span>
              {planLimit !== Infinity && (
                <span style={{ fontSize: '12px', color: usagePct >= 100 ? '#C53030' : usagePct >= 80 ? '#C2410C' : '#999', fontWeight: 600 }}>
                  {usagePct}%
                </span>
              )}
            </div>
            {planLimit !== Infinity && (
              <div style={{ height: '8px', background: '#F0F0EC', borderRadius: '100px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: '100px',
                  width: `${Math.min(usagePct, 100)}%`,
                  background: usagePct >= 100 ? '#C53030' : usagePct >= 80 ? '#F97316' : '#0A0A0A',
                  transition: 'width 0.5s ease',
                }} />
              </div>
            )}
            {planLimit === Infinity && (
              <div style={{ height: '8px', background: '#F0FDF4', borderRadius: '100px', border: '1px solid #BBF7D0' }}>
                <div style={{ height: '100%', width: '100%', background: 'linear-gradient(90deg, #22C55E, #4ADE80)', borderRadius: '100px', opacity: 0.6 }} />
              </div>
            )}
          </div>
          {isNearLimit && !isOverLimit && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', padding: '10px 14px' }}>
              <span style={{ fontSize: '12px', color: '#92400E' }}>⚠ You're approaching your monthly limit.</span>
              <button onClick={() => setShowUpgrade(true)} style={{ background: 'none', border: 'none', color: '#B45309', fontSize: '12px', fontWeight: 600, cursor: 'pointer', padding: 0, fontFamily: 'Inter, sans-serif' }}>Upgrade →</button>
            </div>
          )}
          {isOverLimit && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: '8px', padding: '10px 14px' }}>
              <span style={{ fontSize: '12px', color: '#C53030' }}>🔴 Limit reached — new orders are paused.</span>
              <button onClick={() => setShowUpgrade(true)} style={{ background: 'none', border: 'none', color: '#C53030', fontSize: '12px', fontWeight: 600, cursor: 'pointer', padding: 0, fontFamily: 'Inter, sans-serif' }}>Upgrade →</button>
            </div>
          )}
          {planLimit === Infinity && (
            <div style={{ fontSize: '12px', color: '#22C55E', fontWeight: 500 }}>✓ Unlimited orders — no restrictions on your plan</div>
          )}
        </SectionCard>

        {/* Invoices */}
        <SectionCard title="Invoices">
          {!isPaid ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: '24px', marginBottom: '10px' }}>🧾</div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: '#0A0A0A', marginBottom: '4px' }}>No invoices yet</div>
              <div style={{ fontSize: '13px', color: '#BABAB6', marginBottom: '16px' }}>Upgrade to a paid plan to see billing history.</div>
              <button onClick={() => setShowUpgrade(true)} className="pf-btn" style={{ padding: '9px 20px', fontSize: '13px' }}>View Plans →</button>
            </div>
          ) : (
            [
              { id: 'INV-002', date: '1 Jun 2026', amount: `₹${planInfo?.monthlyPrice.toLocaleString('en-IN')}`, plan: planInfo?.name, status: 'paid' },
              { id: 'INV-001', date: '1 May 2026', amount: `₹${planInfo?.monthlyPrice.toLocaleString('en-IN')}`, plan: planInfo?.name, status: 'paid' },
            ].map((inv, i, arr) => (
              <div key={inv.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < arr.length-1 ? '1px solid #F4F4F0' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ fontSize: '12px', fontFamily: 'monospace', color: '#999' }}>{inv.id}</div>
                  <div style={{ fontSize: '13px', color: '#0A0A0A', fontWeight: 500 }}>{inv.plan} Plan</div>
                  <div style={{ fontSize: '12px', color: '#BABAB6' }}>{inv.date}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#F0FDF4', color: '#166534', padding: '3px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 600 }}><span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#22C55E' }}/>Paid</span>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0A0A0A' }}>{inv.amount}</div>
                  <button style={{ background: 'transparent', border: '1px solid #E8E8E4', borderRadius: '7px', padding: '5px 12px', fontSize: '11px', color: '#666', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>↓ PDF</button>
                </div>
              </div>
            ))
          )}
        </SectionCard>
      </>
    )
  }

  const SettingsView = () => (
    <>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '26px', fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.5px', marginBottom: '4px' }}>Settings</h1>
        <p style={{ fontSize: '13px', color: '#BABAB6' }}>Manage your store, notifications, and fulfillment.</p>
      </div>
      <SectionCard title="Connected Store">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', background: '#F4F4F0', border: '1px solid #E8E8E4', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🛍</div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#0A0A0A' }}>{shopDomain}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22C55E' }}/>
                <span style={{ fontSize: '11px', color: '#22C55E', fontWeight: 600 }}>Active · Connected 27 Jun 2026</span>
              </div>
            </div>
          </div>
          <button onClick={() => navigate('/')} style={{ background: 'transparent', border: '1px solid #E8E8E4', borderRadius: '8px', padding: '7px 14px', fontSize: '12px', color: '#888', cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'border-color 0.15s, color 0.15s' }} onMouseOver={e=>{e.currentTarget.style.borderColor='#CCC';e.currentTarget.style.color='#555'}} onMouseOut={e=>{e.currentTarget.style.borderColor='#E8E8E4';e.currentTarget.style.color='#888'}}>+ Add Store</button>
        </div>
      </SectionCard>
      <SectionCard title="Email Notifications">
        {[
          { key: 'orderReceived', label: 'Order received',  desc: 'When a new Shopify order arrives in No Limit Studio' },
          { key: 'orderShipped',  label: 'Order shipped',   desc: 'When tracking is confirmed and pushed to Shopify' },
          { key: 'orderDelivered',label: 'Order delivered', desc: 'When the carrier marks an order as delivered' },
        ].map(({ key, label, desc }) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '14px 0', borderBottom: '1px solid #F4F4F0' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 500, color: '#0A0A0A', marginBottom: '2px' }}>{label}</div>
              <div style={{ fontSize: '12px', color: '#999' }}>{desc}</div>
            </div>
            <Toggle on={notifs[key]} onChange={() => setNotifs(n => ({ ...n, [key]: !n[key] }))} />
          </div>
        ))}
        <div style={{ paddingTop: '14px' }}>
          <p style={{ fontSize: '12px', color: '#BABAB6' }}>Sent to <strong style={{ color: '#555' }}>{currentUser?.email}</strong></p>
        </div>
      </SectionCard>
      <SectionCard title="Fulfillment">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', paddingBottom: '16px', borderBottom: '1px solid #F4F4F0', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 500, color: '#0A0A0A', marginBottom: '3px' }}>Auto-fulfillment</div>
            <div style={{ fontSize: '12px', color: '#999', lineHeight: 1.5 }}>
              Automatically send orders to the print factory when received.<br/>
              <span style={{ color: '#F97316', fontWeight: 500 }}>Coming in Phase 3 — currently manual only.</span>
            </div>
          </div>
          <Toggle on={autoFulfill} onChange={() => setAutoFulfill(v => !v)} />
        </div>
        <div style={{ background: '#FAFAF8', border: '1px solid #E8E8E4', borderRadius: '10px', padding: '14px 16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#0A0A0A', marginBottom: '4px' }}>Current mode: Manual</div>
          <div style={{ fontSize: '12px', color: '#999' }}>Open an order → click "Send to Print Factory" to fulfill manually.</div>
        </div>
      </SectionCard>
      <SectionCard title="Account">
        <div style={{ paddingBottom: '16px', borderBottom: '1px solid #F4F4F0', marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>Signed in as</div>
          <div style={{ fontSize: '14px', fontWeight: 500, color: '#0A0A0A' }}>{currentUser?.email}</div>
        </div>
        <button onClick={logout} style={{ background: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: 500, color: '#C53030', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Sign out of No Limit Studio</button>
      </SectionCard>
    </>
  )

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#FAFAF8', fontFamily: 'Inter, -apple-system, sans-serif', color: '#0A0A0A' }}>

      {/* Sidebar */}
      <aside style={{ width: '232px', flexShrink: 0, background: '#FFFFFF', borderRight: '1px solid #E8E8E4', position: 'fixed', top: 0, left: 0, bottom: 0, display: 'flex', flexDirection: 'column', zIndex: 100 }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #E8E8E4' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: 'white', flexShrink: 0 }}>✦</div>
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: '#0A0A0A', letterSpacing: '-0.2px' }}>No Limit Studio</span>
          </div>
        </div>
        <nav style={{ flex: 1, padding: '12px 10px' }}>
          <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C8C8C4', padding: '8px 10px 6px', marginBottom: '2px' }}>Menu</div>
          {NAV_ITEMS.map(({ id, label, Icon }) => {
            const active = activeNav === id
            return (
              <button key={id} onClick={() => setActiveNav(id)} style={{ display: 'flex', alignItems: 'center', gap: '9px', width: '100%', padding: '9px 10px', borderRadius: '8px', border: 'none', background: active ? '#F4F0FF' : 'transparent', color: active ? '#3B1F6B' : '#666', fontSize: '13px', fontWeight: active ? 600 : 400, cursor: 'pointer', textAlign: 'left', marginBottom: '1px', fontFamily: 'Inter, sans-serif', transition: 'background 0.12s, color 0.12s', justifyContent: 'space-between' }}
                onMouseOver={e => { if (!active) e.currentTarget.style.background = '#F7F7F5' }}
                onMouseOut={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '9px' }}><Icon />{label}</span>
                {id === 'billing' && currentPlan !== 'free' && (
                  <span style={{ fontSize: '9px', fontWeight: 700, background: '#0A0A0A', color: 'white', padding: '2px 6px', borderRadius: '4px', letterSpacing: '0.04em' }}>{PLAN_LABELS[currentPlan].toUpperCase()}</span>
                )}
                {id === 'billing' && currentPlan === 'free' && isNearLimit && (
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#F97316', flexShrink: 0 }} />
                )}
              </button>
            )
          })}
        </nav>
        <div style={{ padding: '12px 14px 16px', borderTop: '1px solid #E8E8E4' }}>
          <div style={{ background: '#FAFAF8', border: '1px solid #E8E8E4', borderRadius: '10px', padding: '11px 13px', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22C55E', flexShrink: 0 }}/>
              <span style={{ fontSize: '10px', fontWeight: 600, color: '#22C55E', letterSpacing: '0.04em' }}>CONNECTED</span>
            </div>
            <div style={{ fontSize: '12px', fontWeight: 500, color: '#0A0A0A', wordBreak: 'break-all', lineHeight: 1.4 }}>{shopDomain}</div>
          </div>
          <button onClick={logout} style={{ width: '100%', padding: '8px', background: 'transparent', border: '1px solid #E8E8E4', borderRadius: '8px', fontSize: '12px', fontWeight: 500, color: '#999', cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'border-color 0.15s, color 0.15s' }} onMouseOver={e=>{e.currentTarget.style.borderColor='#CCC';e.currentTarget.style.color='#555'}} onMouseOut={e=>{e.currentTarget.style.borderColor='#E8E8E4';e.currentTarget.style.color='#999'}}>Sign out</button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ marginLeft: '232px', flex: 1, minWidth: 0 }}>
        <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(250,250,248,0.9)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: '1px solid #E8E8E4', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px' }}>
          <span style={{ fontSize: '14px', color: '#0A0A0A' }}>{greeting()}, <strong style={{ fontWeight: 600 }}>{firstName}</strong></span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '12px', color: '#C8C8C4' }}>{new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
            <button onClick={() => navigate('/')} className="pf-btn" style={{ padding: '7px 16px', fontSize: '12px', borderRadius: '8px' }}>+ Connect Store</button>
          </div>
        </div>

        <div style={{ padding: '32px' }}>
          {(activeNav === 'dashboard' || activeNav === 'orders') && (
            <div style={{ marginBottom: '28px' }}>
              <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '26px', fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.5px', marginBottom: '4px' }}>Dashboard</h1>
              <p style={{ fontSize: '13px', color: '#BABAB6' }}>Orders from <span style={{ color: '#666', fontWeight: 500 }}>{shopDomain}</span> appear here in real time.</p>
            </div>
          )}
          {(activeNav === 'dashboard' || activeNav === 'orders') && <OrdersView />}
          {activeNav === 'products' && <ProductsView />}
          {activeNav === 'billing'  && <BillingView />}
          {activeNav === 'settings' && <SettingsView />}
        </div>
      </main>

      {/* Order detail panel */}
      {selectedOrder && (
        <div onClick={e => { if (e.target === e.currentTarget) setSelectedOrder(null) }} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)' }}>
          <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '500px', background: '#FFFFFF', borderLeft: '1px solid #E8E8E4', overflowY: 'auto', animation: 'pf-slide-in 0.22s cubic-bezier(0.22,1,0.36,1)' }}>
            <div style={{ position: 'sticky', top: 0, background: '#FFFFFF', zIndex: 10, padding: '18px 24px', borderBottom: '1px solid #E8E8E4', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: '#0A0A0A', marginBottom: '2px' }}>Order {selectedOrder.id}</div>
                <div style={{ fontSize: '12px', color: '#BABAB6' }}>{selectedOrder.date}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <StatusBadge status={selectedOrder.status} />
                <button onClick={() => setSelectedOrder(null)} style={{ width: '28px', height: '28px', background: '#F4F4F0', border: 'none', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: '#888', cursor: 'pointer' }} onMouseOver={e=>e.currentTarget.style.background='#EBEBEB'} onMouseOut={e=>e.currentTarget.style.background='#F4F4F0'}>✕</button>
              </div>
            </div>
            {/* Timeline */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E8E8E4' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                {TIMELINE_STEPS.map((step, i) => {
                  const idx = TIMELINE_STEPS.indexOf(selectedOrder.status)
                  const done = i <= idx; const active = i === idx
                  return (
                    <React.Fragment key={step}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: done ? '#0A0A0A' : '#F4F4F0', border: `2px solid ${done ? '#0A0A0A' : '#E8E8E4'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: done ? 'white' : '#C8C8C4', fontWeight: 700 }}>
                          {done && !active ? '✓' : i+1}
                        </div>
                        <div style={{ fontSize: '9px', color: done ? '#0A0A0A' : '#C8C8C4', marginTop: '5px', fontWeight: done ? 600 : 400, textTransform: 'capitalize' }}>{step}</div>
                      </div>
                      {i < TIMELINE_STEPS.length-1 && <div style={{ flex: 1, height: '2px', background: i < TIMELINE_STEPS.indexOf(selectedOrder.status) ? '#0A0A0A' : '#E8E8E4', margin: '12px 4px 0' }}/>}
                    </React.Fragment>
                  )
                })}
              </div>
            </div>
            <div style={{ padding: '24px' }}>
              <InfoSection title="Customer">
                <DetailRow label="Name"    value={selectedOrder.customer.name} />
                <DetailRow label="Email"   value={selectedOrder.customer.email} />
                <DetailRow label="Address" value={selectedOrder.customer.address} />
              </InfoSection>
              <InfoSection title={`Items (${selectedOrder.items.length})`}>
                {selectedOrder.items.map((item, i) => (
                  <div key={i} style={{ padding: '14px', borderBottom: i < selectedOrder.items.length-1 ? '1px solid #F0F0EC' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#0A0A0A' }}>{item.name}</div>
                        <div style={{ fontSize: '10px', color: '#BABAB6', marginTop: '3px', fontFamily: 'monospace' }}>{item.sku}</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '12px', color: '#555', fontWeight: 500 }}>Qty: {item.qty}</div>
                        <div style={{ fontSize: '11px', color: '#BABAB6', marginTop: '2px' }}>{item.size} · {item.color}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 11px', background: item.printFile ? '#F0FDF4' : '#FAFAF8', border: `1px solid ${item.printFile ? '#BBF7D0' : '#E8E8E4'}`, borderRadius: '8px' }}>
                      {item.printFile ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '28px', height: '28px', background: '#DCFCE7', border: '1px solid #BBF7D0', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px' }}>🖼</div>
                          <div>
                            <div style={{ fontSize: '11px', fontWeight: 600, color: '#166534' }}>Print file ready</div>
                            <div style={{ fontSize: '10px', color: '#86EFAC', fontFamily: 'monospace', marginTop: '1px' }}>{item.printFile}</div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <span style={{ fontSize: '11px', color: '#C2410C', fontWeight: 500 }}>⚠ No print file</span>
                          <button className="pf-btn" style={{ padding: '5px 12px', fontSize: '11px', borderRadius: '6px' }}>↑ Upload</button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </InfoSection>
              {selectedOrder.tracking && (
                <InfoSection title="Shipment">
                  <DetailRow label="Carrier" value={selectedOrder.carrier} />
                  <DetailRow label="Tracking" value={selectedOrder.tracking} mono />
                </InfoSection>
              )}
              <div style={{ paddingTop: '4px', borderTop: '1px solid #E8E8E4', marginTop: '8px' }}>
                {selectedOrder.status === 'queued' && <button className="pf-btn" style={{ width: '100%', padding: '13px', marginBottom: '10px', marginTop: '16px' }} onMouseOver={e=>e.currentTarget.style.opacity='0.82'} onMouseOut={e=>e.currentTarget.style.opacity='1'}>Send to Print Factory →</button>}
                {selectedOrder.status === 'printing' && <button style={{ width: '100%', padding: '13px', background: '#1D4ED8', color: 'white', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', marginBottom: '10px', marginTop: '16px', transition: 'opacity 0.15s' }} onMouseOver={e=>e.currentTarget.style.opacity='0.82'} onMouseOut={e=>e.currentTarget.style.opacity='1'}>Mark as Shipped</button>}
                <a href={`https://${shopDomain}/admin/orders/${selectedOrder.shopifyId}`} target="_blank" rel="noopener noreferrer" className="pf-btn-outline" style={{ display: 'flex', padding: '12px', marginTop: selectedOrder.status === 'queued' || selectedOrder.status === 'printing' ? '0' : '16px' }}>View in Shopify Admin ↗</a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade modal */}
      {showUpgrade && (
        <UpgradeModal
          currentPlan={currentPlan}
          onClose={() => setShowUpgrade(false)}
          onSuccess={handleUpgradeSuccess}
        />
      )}
    </div>
  )
}

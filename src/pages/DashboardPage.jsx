import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { openRazorpaySubscription } from '../utils/razorpay'
import { fetchOrders, fetchSubscription, updateSubscription, fetchMyStore } from '../utils/api'

// ── Data ─────────────────────────────────────────────────────────────────────

const MOCK_PRODUCTS = [
  { id: 'p1', shopifyId: '8234567890', name: 'Classic Black Tee',   variants: ['S','M','L','XL','XXL'], printFile: 'black-tee-design-v2.png', factorySku: 'GILDAN-64000-BLK', status: 'ready' },
  { id: 'p2', shopifyId: '8234567891', name: 'Pet T-Shirt',         variants: ['XS','S','M','L','XL'],  printFile: 'pet-tee-paws.png',        factorySku: 'PETX-TEE-STD',     status: 'ready' },
  { id: 'p3', shopifyId: '8234567892', name: 'Premium Hoodie',      variants: ['S','M','L','XL'],       printFile: null,                      factorySku: null,               status: 'incomplete' },
  { id: 'p4', shopifyId: '8234567893', name: 'Kids T-Shirt',        variants: ['2-4Y','5-7Y','8-10Y'],  printFile: 'kids-tee-fun.png',        factorySku: 'GILDAN-KIDS-64B',  status: 'ready' },
  { id: 'p5', shopifyId: '8234567894', name: 'A3 Poster & Frame',   variants: ['A3','A4'],               printFile: 'poster-final.png',        factorySku: 'PRINTFUL-POSTER-A3', status: 'ready' },
  { id: 'p6', shopifyId: '8234567895', name: 'Classic White Tee',   variants: ['S','M','L','XL'],       printFile: null,                      factorySku: 'GILDAN-64000-WHT', status: 'incomplete' },
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
  delivered: { label: 'Delivered', bg: '#E6F4EA', color: '#137333', dot: '#39B54A' },
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
const IconNotifications = () => <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M8 1.5a3 3 0 00-3 3v3.5l-1.5 2h9l-1.5-2V4.5a3 3 0 00-3-3zM5.5 12.5a2.5 2.5 0 005 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
const IconTrends        = () => <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M1.5 12l4-4 3 3 6-7M14.5 4h-3M14.5 4v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
const IconOrders   = () => <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h12M2 12h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
const IconProducts = () => <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M8 1.5L14 4.5V11.5L8 14.5L2 11.5V4.5L8 1.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M8 1.5V14.5M2 4.5L8 7.5L14 4.5" stroke="currentColor" strokeWidth="1.5"/></svg>
const IconSettings = () => <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5"/><path d="M8 1.5V3M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1.06 1.06M11.54 11.54l1.06 1.06M3.4 12.6l1.06-1.06M11.54 4.46l1.06-1.06" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
const IconBilling  = () => <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="1" y="3.5" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><path d="M1 6.5h14" stroke="currentColor" strokeWidth="1.5"/><path d="M4 10h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
const IconHelp     = () => <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5"/><path d="M8 10.5v-.5M8 8a1.5 1.5 0 10-1.5-1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>

// ── Stat icons ────────────────────────────────────────────────────────────────

const StatIconTotal    = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 8l9-5 9 5-9 5-9-5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M3 8v8l9 5 9-5V8" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M12 13v8" stroke="currentColor" strokeWidth="1.6"/></svg>
const StatIconQueued   = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6"/><path d="M12 7v5l3.5 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
const StatIconPrinting = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 9V3h12v6" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><rect x="4" y="9" width="16" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.6"/><rect x="7" y="14" width="10" height="7" stroke="currentColor" strokeWidth="1.6"/></svg>
const StatIconShipped  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M2 7h11v10H2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M13 10h4l4 3.5V17h-8z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><circle cx="6.5" cy="19" r="1.6" stroke="currentColor" strokeWidth="1.5"/><circle cx="17" cy="19" r="1.6" stroke="currentColor" strokeWidth="1.5"/></svg>
const StatIconDelivered= () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6"/><path d="M8 12.5l2.5 2.5L16 9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>

function productEmoji(name) {
  if (/pet/i.test(name)) return '🐾'
  if (/kid/i.test(name)) return '🧒'
  if (/hoodie|sweat/i.test(name)) return '🧥'
  if (/tee|shirt/i.test(name)) return '👕'
  if (/poster|frame|print|art/i.test(name)) return '🖼️'
  return '📦'
}
const BLOG_ARTICLES = [
  {
    id: 'b1',
    category: 'Business tips & ideas',
    title: 'How to start a small clothing business from home in 2025',
    excerpt: 'Learn all you need to know about starting an online clothing business, from finding suppliers to market research and selecting the perfect blank apparel mockups.',
    date: 'October 24, 2024 · 12 min read',
    img: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=600&q=80',
    content: `
      <h2>1. Choose Your Print-on-Demand Niche</h2>
      <p>Building a clothing business from home requires a clear focus. Rather than launching a generic store, focus on a specific segment (e.g., eco-friendly pet streetwear, minimalist graphic tees, space-themed oversized hoodies).</p>
      <h2>2. Design Custom Vector Art</h2>
      <p>Leverage tools like Figma, Illustrator, or Canva to generate vector decals. Ensure your artwork has transparent backgrounds and high contrast to pop cleanly on fabric.</p>
      <h2>3. Partner with No Limit Studio</h2>
      <p>By connecting your Shopify store to No Limit Studio, you bypass inventory risks. We handle the printing, quality control, packaging, and global logistics, enabling you to focus on marketing and scaling.</p>
    `
  },
  {
    id: 'b2',
    category: 'Business tips & ideas',
    title: 'How to start an online boutique in 10 easy steps',
    excerpt: "What if we told you there's a super low-cost way to start an online boutique? Print-on-demand dropshipping is the perfect, risk-free model to test custom apparel markets.",
    date: 'December 2, 2024 · 12 min read',
    img: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=600&q=80',
    content: `
      <h2>1. Set Up Your E-commerce Store</h2>
      <p>Use Shopify to launch your online showcase in under an hour. Keep the styling clean, typography simple, and product grids easy to navigate.</p>
      <h2>2. Mockup Customization</h2>
      <p>Using the No Limit Studio dashboard, preview vector graphics on lifestyle model shots. Make sure mockup photo lighting feels authentic and fits a premium brand aesthetic.</p>
      <h2>3. Test Orders and Quality Assurance</h2>
      <p>Always place self-test orders to inspect stitching, color accuracy, and delivery speeds. A successful brand is built on premium customer experiences.</p>
    `
  },
  {
    id: 'b3',
    category: 'Business tips & ideas',
    title: 'The 10 best online selling sites for 2025',
    excerpt: 'Find answers to your questions regarding eCommerce platforms and marketplaces, and pick the best option to showcase, market, and sell your print-on-demand garments.',
    date: 'November 27, 2024 · 16 min read',
    img: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=600&q=80',
    content: `
      <h2>1. Shopify (Highly Recommended)</h2>
      <p>Shopify remains the absolute gold standard for custom clothing brands. It offers complete domain ownership, deep analytics, and native integrations with No Limit Studio fulfillment.</p>
      <h2>2. Etsy Marketplace</h2>
      <p>Excellent for hand-crafted, vintage, and creative merchandise. Ideal for reaching an active, design-focused consumer base without hefty marketing costs.</p>
      <h2>3. WooCommerce & Squarespace</h2>
      <p> WooCommerce is built on WordPress and offers unlimited code customizability. Squarespace is perfect for visually-driven creator brands looking for simple layouts.</p>
    `
  }
]

const MEDIUM_TRENDS = [
  {
    id: 'm1',
    author: 'The POD Insider',
    publication: 'Medium',
    title: 'Why Print on Demand Is the Best Way to Start an Ecommerce Business',
    description: 'A look at why print-on-demand remains one of the lowest-risk ways to launch an online store, without holding inventory.',
    url: 'https://medium.com/the-pod-insider/print-on-demand-best-way-ecommerce-business-04bc99d20968',
    tags: ['Print on Demand', 'E-Commerce']
  },
  {
    id: 'm2',
    author: 'Derek Ryans',
    publication: 'Not Zero Yet',
    title: 'How Does Print on Demand Work in 2024',
    description: 'A breakdown of the print-on-demand supply chain, from order placement to production and shipping.',
    url: 'https://medium.com/not-zero-yet/how-does-print-on-demand-work-in-2024-4f1d09a7c331',
    tags: ['Print on Demand', 'Supply Chain']
  },
  {
    id: 'm3',
    author: 'Mehdi Aoussiad',
    publication: 'Medium',
    title: '7+ Best Shopify Dropshipping Apps and Suppliers',
    description: 'A roundup of Shopify apps and suppliers merchants use to source and fulfill dropshipping and POD orders.',
    url: 'https://mehdiouss.medium.com/best-shopify-dropshipping-apps-and-suppliers-f0dce58a945f',
    tags: ['Shopify', 'Dropshipping']
  }
]

// Hashing helper to generate pseudo-dynamic trends data on-the-fly
function getStringHash(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash)
}

function generateTrendsData(query) {
  if (!query || !query.trim()) {
    return [
      { title: 'Retro Groovy T-Shirts', rate: '+340%', volume: '120K searches', hot: true, platforms: 'Etsy, Shopify, Amazon' },
      { title: 'Oversized Carbon Wash Hoodies', rate: '+190%', volume: '82K searches', hot: false, platforms: 'Shopify, Amazon Merch' },
      { title: 'Vintage Custom Pet Collars', rate: '+220%', volume: '65K searches', hot: true, platforms: 'Shopify, Etsy, WooCommerce' }
    ]
  }
  
  const h = getStringHash(query.trim().toLowerCase())
  const platforms = [
    'Shopify, Etsy', 
    'Shopify, Amazon Merch', 
    'Etsy, Redbubble, eBay', 
    'TeePublic, Shopify, WooCommerce',
    'Shopify, Etsy, Printify'
  ]
  
  return [
    { 
      title: `Custom "${query}" T-Shirts`, 
      rate: `+${(h % 220) + 80}%`, 
      volume: `${(h % 140) + 15}K searches`, 
      hot: (h % 2 === 0), 
      platforms: platforms[h % platforms.length] 
    },
    { 
      title: `Oversized "${query}" Hoodies`, 
      rate: `+${(h % 160) + 60}%`, 
      volume: `${(h % 90) + 10}K searches`, 
      hot: (h % 3 === 0), 
      platforms: platforms[(h + 1) % platforms.length] 
    },
    { 
      title: `Vintage "${query}" Poster Art`, 
      rate: `+${(h % 280) + 100}%`, 
      volume: `${(h % 200) + 20}K searches`, 
      hot: true, 
      platforms: platforms[(h + 2) % platforms.length] 
    }
  ]
}

function generateDynamicSVGPath(query) {
  if (!query || !query.trim()) {
    return "M 0 130 Q 80 120 160 90 T 320 70 Q 400 40 500 10"
  }
  const h = getStringHash(query.trim().toLowerCase())
  const y1 = 120 - (h % 35)
  const y2 = 95 - ((h >> 2) % 35)
  const y3 = 65 - ((h >> 4) % 40)
  const y4 = 20 + ((h >> 6) % 20)
  return `M 0 130 Q 80 ${y1} 160 ${y2} T 320 ${y3} Q 400 ${y4} 500 10`
}

const PRODUCT_GRADIENTS = [
  'linear-gradient(135deg, #FDE68A, #F97316)',
  'linear-gradient(135deg, #BFDBFE, #3B82F6)',
  'linear-gradient(135deg, #DDD6FE, #8B5CF6)',
  'linear-gradient(135deg, #BBF7D0, #22C55E)',
  'linear-gradient(135deg, #FBCFE8, #EC4899)',
]

const NAV_ITEMS = [
  { id: 'dashboard',     label: 'Dashboard',     Icon: IconDashboard },
  { id: 'notifications', label: 'Notifications', Icon: IconNotifications },
  { id: 'trends',        label: 'Trends',        Icon: IconTrends },
  { id: 'orders',        label: 'Orders',        Icon: IconOrders },
  { id: 'products',      label: 'Products',      Icon: IconProducts },
  { id: 'billing',       label: 'Billing',       Icon: IconBilling },
  { id: 'settings',      label: 'Settings',      Icon: IconSettings },
  { id: 'help',          label: 'Help Center',   Icon: IconHelp },
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
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '20px', fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.3px', marginBottom: '3px' }}>
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
                    <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '32px', fontWeight: 800, color: '#0A0A0A', lineHeight: 1 }}>
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
  const [blogOffset, setBlogOffset]         = useState(0)
  const [activeArticle, setActiveArticle]   = useState(null)

  // Interactive notifications state
  const [customNotifTitle, setCustomNotifTitle] = useState('')
  const [customNotifDesc, setCustomNotifDesc]   = useState('')
  const [customNotifType, setCustomNotifType]   = useState('success')
  const [activeNotifs, setActiveNotifs]         = useState([
    { id: 1, title: 'Shopify Store Synced', desc: 'Store domain synced successfully.', type: 'success', time: 'Just now' },
    { id: 2, title: 'Fulfillment Active', desc: 'No Limit printing queue operational.', type: 'info', time: '1 hour ago' },
    { id: 3, title: 'Low order limit warning', desc: 'Starter plan order quota is at 84%.', type: 'warning', time: '4 hours ago' }
  ])

  // Google trends keyword filters
  const [trendFilter, setTrendFilter] = useState('apparel')
  const [searchQuery, setSearchQuery] = useState('')
  const [trendTab, setTrendTab]       = useState('social') // 'market' or 'social'
  const [socialTrends, setSocialTrends] = useState([])
  const [trendsDate, setTrendsDate] = useState(null)
  const [loadingTrends, setLoadingTrends] = useState(false)
  const [trendsError, setTrendsError] = useState(null)

  useEffect(() => {
    if (activeNav !== 'trends') return
    
    function fetchDayArticles(daysAgo) {
      const targetDate = new Date()
      targetDate.setDate(targetDate.getDate() - daysAgo)
      const yyyy = targetDate.getFullYear()
      const mm = String(targetDate.getMonth() + 1).padStart(2, '0')
      const dd = String(targetDate.getDate()).padStart(2, '0')
      return fetch(`https://wikimedia.org/api/rest_v1/metrics/pageviews/top/en.wikipedia.org/all-access/${yyyy}/${mm}/${dd}`)
        .then(res => { if (!res.ok) throw new Error('Failed to fetch daily trending streams.'); return res.json() })
    }

    async function fetchLiveTrends() {
      setLoadingTrends(true)
      setTrendsError(null)
      try {
        // Wikimedia logs daily top articles — go 2 days back to guarantee availability,
        // and pull the day before that too so we can compute a real rank change.
        const [todayData, prevData] = await Promise.all([fetchDayArticles(2), fetchDayArticles(3)])

        const rawArticles = todayData.items[0]?.articles || []
        const prevArticles = prevData.items[0]?.articles || []
        const prevRankByArticle = {}
        prevArticles.forEach((a, idx) => { prevRankByArticle[a.article] = idx + 1 })

        const filtered = rawArticles
          .filter(a => {
            const name = a.article
            return !name.includes(':') &&
                   !name.includes('Main_Page') &&
                   !name.includes('Special') &&
                   !name.includes('404') &&
                   name !== 'Search'
          })
          .slice(0, 10) // take top 10 real trending topics
          .map((a, idx) => {
            const name = a.article.replace(/_/g, ' ')
            let category = 'General English'
            if (/football|fifa|cup|player|game|kane|mbappe|sports|tennis/i.test(name)) category = 'Sports'
            else if (/movie|show|series|actor|actress|singer|song|album|music|tv/i.test(name)) category = 'Entertainment'
            else if (/politics|court|president|minister|election|war/i.test(name)) category = 'Politics'
            else if (/tech|apple|phone|software|ai|computer|space/i.test(name)) category = 'Technology'

            const volumeStr = a.views >= 1000000
              ? `${(a.views / 1000000).toFixed(1)}M`
              : `${(a.views / 1000).toFixed(1)}K`

            const rank = idx + 1
            const prevRank = prevRankByArticle[a.article]
            const isNew = prevRank === undefined
            // Real comparison: rose in rank vs. yesterday, or is new to the top 10
            const trendState = (isNew || prevRank > rank) ? 'Growing' : 'Fading'

            return {
              rank,
              topic: name,
              category,
              volume: volumeStr,
              trendState,
              isNew,
              articleUrl: `https://en.wikipedia.org/wiki/${a.article}`
            }
          })

        const dataDate = new Date()
        dataDate.setDate(dataDate.getDate() - 2)
        setTrendsDate(dataDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }))
        setSocialTrends(filtered)
      } catch (err) {
        console.error(err)
        setTrendsError('Failed to load live trends feed.')
      } finally {
        setLoadingTrends(false)
      }
    }
    
    fetchLiveTrends()
  }, [activeNav])

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

  const DashboardOverview = () => {
    // Generate sales coordinates or metrics
    const salesData = [
      { day: 'Mon', sales: 4200 },
      { day: 'Tue', sales: 6800 },
      { day: 'Wed', sales: 5100 },
      { day: 'Thu', sales: 9400 },
      { day: 'Fri', sales: 8300 },
      { day: 'Sat', sales: 12500 },
      { day: 'Sun', sales: 11000 }
    ]
    const topProducts = [
      { name: 'Cream Streetwear Hoodie', sold: 48, percentage: 80 },
      { name: 'White Custom Graphic Tee', sold: 36, percentage: 60 },
      { name: 'Frenchie Custom Pet Shirt', sold: 18, percentage: 30 }
    ]

    return (
      <>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '32px', position: 'relative', zIndex: 1 }}>
          {[
            { label: 'Total Orders', value: counts.total, bgGrad: 'linear-gradient(135deg, #172B15 0%, #39B54A 100%)', color: '#172B15', Icon: StatIconTotal, iconShadow: '0 6px 16px rgba(57,181,74,0.15)' },
            { label: 'Queued',       value: counts.queued, bgGrad: 'linear-gradient(135deg, #F97316 0%, #FF9E3D 100%)', color: '#C2410C', Icon: StatIconQueued, iconShadow: '0 6px 16px rgba(249,115,22,0.15)' },
            { label: 'Printing',     value: counts.printing, bgGrad: 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)', color: '#1D4ED8', Icon: StatIconPrinting, iconShadow: '0 6px 16px rgba(59,130,246,0.15)' },
            { label: 'Shipped',      value: counts.shipped, bgGrad: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)', color: '#5B21B6', Icon: StatIconShipped, iconShadow: '0 6px 16px rgba(139,92,246,0.15)' },
            { label: 'Delivered',    value: counts.delivered, bgGrad: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)', color: '#137333', Icon: StatIconDelivered, iconShadow: '0 6px 16px rgba(16,185,129,0.15)' },
          ].map(s => (
            <div key={s.label} style={{ background: '#FFFFFF', border: '1px solid rgba(23,43,21,0.06)', borderRadius: '20px', padding: '20px', transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)', boxShadow: '0 8px 30px rgba(23,43,21,0.015)' }}
              className="pf-dashboard-card"
            >
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: s.bgGrad, color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', boxShadow: s.iconShadow }}>
                <s.Icon />
              </div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: s.color, fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1, marginBottom: '5px' }}>{s.value}</div>
              <div style={{ fontSize: '11px', color: '#BABAB6', fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Analytics Section */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '28px', marginBottom: '32px', position: 'relative', zIndex: 1 }}>
          
          {/* Sales chart */}
          <div style={{ background: '#FFFFFF', border: '1px solid rgba(23,43,21,0.06)', borderRadius: '24px', padding: '24px', boxShadow: '0 8px 30px rgba(23,43,21,0.015)' }}>
            <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '15px', fontWeight: 800, color: '#172B15', marginBottom: '16px' }}>Weekly Sales Revenue</h3>
            <div style={{ width: '100%', height: '180px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 10px', background: '#FAFAF9', borderRadius: '16px', border: '1px dashed rgba(23,43,21,0.05)', position: 'relative' }}>
              {salesData.map((d, i) => {
                const height = `${(d.sales / 14000) * 100}%`
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', height: '100%', justifyContent: 'flex-end', paddingBottom: '12px' }}>
                    <div style={{ width: '28px', height: height, background: 'linear-gradient(180deg, #B9F95D 0%, #39B54A 100%)', borderRadius: '6px', position: 'relative', minHeight: '10px', cursor: 'pointer', transition: 'all 0.2s' }}
                      onMouseOver={e => e.currentTarget.style.filter = 'brightness(1.05)'}
                      onMouseOut={e => e.currentTarget.style.filter = 'none'}
                      title={`₹${d.sales}`}
                    />
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#71717A' }}>{d.day}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Top Products */}
          <div style={{ background: '#FFFFFF', border: '1px solid rgba(23,43,21,0.06)', borderRadius: '24px', padding: '24px', boxShadow: '0 8px 30px rgba(23,43,21,0.015)' }}>
            <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '15px', fontWeight: 800, color: '#172B15', marginBottom: '16px' }}>Best Sellers</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {topProducts.map((p, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', fontWeight: 700, color: '#172B15', marginBottom: '6px' }}>
                    <span style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden', maxWidth: '170px' }}>{p.name}</span>
                    <span style={{ color: '#39B54A' }}>{p.sold} sold</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: '#FAFAF9', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(23,43,21,0.04)' }}>
                    <div style={{ width: `${p.percentage}%`, height: '100%', background: '#39B54A', borderRadius: '10px' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Start something great today (Blog & Tutorials Carousel) */}
        <div style={{ marginTop: '40px', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justify: 'space-between', marginBottom: '20px' }}>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '20px', fontWeight: 800, color: '#172B15', letterSpacing: '-0.3px' }}>
              Start something great today
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button 
                onClick={() => setBlogOffset(prev => Math.max(prev - 1, 0))}
                disabled={blogOffset === 0}
                style={{ 
                  width: '32px', height: '32px', borderRadius: '50%', border: '1px solid #E8E8E4', 
                  background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  cursor: blogOffset === 0 ? 'not-allowed' : 'pointer', color: '#172B15', opacity: blogOffset === 0 ? 0.4 : 1,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)', transition: 'all 0.2s', outline: 'none'
                }}
                onMouseOver={e => { if (blogOffset > 0) e.currentTarget.style.borderColor = '#39B54A' }}
                onMouseOut={e => { e.currentTarget.style.borderColor = '#E8E8E4' }}
              >
                ←
              </button>
              <button 
                onClick={() => setBlogOffset(prev => Math.min(prev + 1, BLOG_ARTICLES.length - 1))}
                disabled={blogOffset >= BLOG_ARTICLES.length - 1}
                style={{ 
                  width: '32px', height: '32px', borderRadius: '50%', border: '1px solid #E8E8E4', 
                  background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  cursor: blogOffset >= BLOG_ARTICLES.length - 1 ? 'not-allowed' : 'pointer', color: '#172B15', opacity: blogOffset >= BLOG_ARTICLES.length - 1 ? 0.4 : 1,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)', transition: 'all 0.2s', outline: 'none'
                }}
                onMouseOver={e => { if (blogOffset < BLOG_ARTICLES.length - 1) e.currentTarget.style.borderColor = '#39B54A' }}
                onMouseOut={e => { e.currentTarget.style.borderColor = '#E8E8E4' }}
              >
                →
              </button>
            </div>
          </div>

          {/* Carousel Container */}
          <div style={{ overflow: 'hidden', padding: '4px 0' }}>
            <div style={{ 
              display: 'flex', gap: '20px', 
              transform: `translateX(-${blogOffset * 320}px)`, 
              transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
              {BLOG_ARTICLES.map(article => (
                <div 
                  key={article.id}
                  onClick={() => setActiveArticle(article)}
                  className="pf-blog-card"
                  style={{ 
                    flex: '0 0 320px', background: '#FFFFFF', 
                    border: '1px solid rgba(23,43,21,0.06)', borderRadius: '16px', overflow: 'hidden', 
                    cursor: 'pointer', display: 'flex', flexDirection: 'column',
                    boxShadow: '0 4px 14px rgba(23,43,21,0.01)'
                  }}
                >
                  <div style={{ height: '150px', overflow: 'hidden', position: 'relative' }}>
                    <img 
                      src={article.img} 
                      alt={article.title} 
                      className="pf-blog-img"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  </div>
                  <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#39B54A', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                      {article.category}
                    </span>
                    <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#172B15', lineHeight: 1.4, marginBottom: '8px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: '38px' }}>
                      {article.title}
                    </h3>
                    <p style={{ fontSize: '12px', color: '#71717A', lineHeight: 1.5, marginBottom: '16px', flex: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {article.excerpt}
                    </p>
                    <div style={{ fontSize: '11px', color: '#A1A1AA', fontWeight: 500 }}>
                      {article.date}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </>
    )
  }

  const OrdersManagement = () => {
    const [searchOrder, setSearchOrder] = useState('')
    
    // Filter orders by status tab and customer/ID searches
    const filteredOrders = filtered.filter(o => {
      const matchText = searchOrder.trim().toLowerCase()
      if (!matchText) return true
      return o.id.toLowerCase().includes(matchText) || o.customer.name.toLowerCase().includes(matchText)
    })

    return (
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
                  {isOverLimit ? 'Order limit reached — new orders are paused' : `${ordersUsed} of ${planLimit} orders used this month`}
                </div>
                <div style={{ fontSize: '12px', color: isOverLimit ? '#FC8181' : '#B45309' }}>
                  {isOverLimit ? 'Upgrade now to resume fulfillment.' : 'Upgrade to Starter for 500 orders/month.'}
                </div>
              </div>
            </div>
            <button onClick={() => setShowUpgrade(true)} style={{ background: isOverLimit ? '#C53030' : '#172B15', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap', transition: 'opacity 0.15s' }}>
              Upgrade →
            </button>
          </div>
        )}

        {/* Filter bar and search panel */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', gap: '6px', background: '#FFFFFF', border: '1px solid rgba(23,43,21,0.06)', borderRadius: '14px', padding: '4px', boxShadow: '0 4px 14px rgba(23,43,21,0.008)' }}>
            {['all', 'queued', 'printing', 'shipped', 'delivered'].map(f => (
              <button key={f} onClick={() => setStatusFilter(f)} style={{ padding: '6px 14px', borderRadius: '10px', border: 'none', background: statusFilter === f ? '#172B15' : 'transparent', color: statusFilter === f ? '#FFFFFF' : '#71717A', fontSize: '12.5px', fontWeight: statusFilter === f ? 700 : 500, cursor: 'pointer', fontFamily: 'Inter, sans-serif', textTransform: 'capitalize', transition: 'all 0.15s' }}>
                {f === 'all' ? 'All orders' : f}
                {f !== 'all' && <span style={{ marginLeft: '6px', opacity: 0.6, fontSize: '11px' }}>{counts[f]}</span>}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px', flex: 1, maxWidth: '380px' }}>
            <input 
              type="text" 
              placeholder="Search by Order ID or Customer Name..."
              value={searchOrder}
              onChange={e => setSearchOrder(e.target.value)}
              style={{
                width: '100%', padding: '10px 14px', border: '1px solid rgba(23,43,21,0.1)', 
                borderRadius: '10px', fontSize: '13px', outline: 'none', background: '#FFFFFF',
                transition: 'all 0.2s', fontFamily: 'Inter, sans-serif', color: '#172B15'
              }}
              onFocus={e => e.target.style.borderColor = '#39B54A'}
              onBlur={e => e.target.style.borderColor = 'rgba(23,43,21,0.1)'}
            />
          </div>
        </div>

        {/* Detailed Orders table */}
        <div style={{ background: '#FFFFFF', border: '1px solid rgba(23,43,21,0.06)', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 12px 40px rgba(23,43,21,0.02)', position: 'relative', zIndex: 1 }}>
          {ordersLoading ? (
            <div style={{ padding: '72px 32px', textAlign: 'center' }}>
              <div style={{ width: '20px', height: '20px', border: '2px solid #E8E8E4', borderTop: '2px solid #39B54A', borderRadius: '50%', animation: 'pf-spin 0.7s linear infinite', margin: '0 auto 16px' }} />
              <div style={{ fontSize: '13px', color: '#BABAB6' }}>Loading orders...</div>
            </div>
          ) : ordersError ? (
            <div style={{ padding: '72px 32px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', marginBottom: '12px' }}>⚠️</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#0A0A0A', marginBottom: '6px' }}>Failed to load orders</div>
              <div style={{ fontSize: '13px', color: '#BABAB6', marginBottom: '16px' }}>{ordersError}</div>
              <button onClick={loadOrders} className="pf-btn" style={{ padding: '9px 20px', fontSize: '13px' }}>Retry</button>
            </div>
          ) : filteredOrders.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>{['Order','Customer','Items','Status','Date','Amount',''].map(h => <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: '10px', fontWeight: 600, color: '#C8C8C4', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid #E8E8E4', background: '#FCFCFB' }}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {filteredOrders.map((order, i) => (
                  <tr key={order.id} className="pf-table-row" style={{ borderBottom: i < filteredOrders.length - 1 ? '1px solid #F4F4F0' : 'none', cursor: 'pointer' }}>
                    <td style={{ padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: '#172B15', fontFamily: 'monospace', letterSpacing: '0.02em' }}>{order.id}</td>
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
                      <button onClick={() => setSelectedOrder(order)} style={{ background: 'transparent', border: '1px solid #E8E8E4', borderRadius: '7px', padding: '6px 14px', fontSize: '11px', fontWeight: 600, color: '#52525B', cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all 0.2s' }} onMouseOver={e=>{e.currentTarget.style.borderColor='#39B54A';e.currentTarget.style.color='#39B54A';e.currentTarget.style.background='rgba(57,181,74,0.04)'}} onMouseOut={e=>{e.currentTarget.style.borderColor='#E8E8E4';e.currentTarget.style.color='#52525B';e.currentTarget.style.background='transparent'}}>View →</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: '64px 32px', textAlign: 'center' }}>
              <svg width="140" height="110" viewBox="0 0 140 110" fill="none" style={{ margin: '0 auto 20px' }}>
                <ellipse cx="70" cy="98" rx="46" ry="7" fill="#F0F0EC" />
                <rect x="30" y="38" width="80" height="52" rx="6" fill="#F4F4F0" stroke="#E8E8E4" strokeWidth="1.5" />
                <path d="M30 50h80" stroke="#E8E8E4" strokeWidth="1.5" />
                <path d="M55 38V26a15 15 0 0130 0v12" stroke="#D8D8D2" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="70" cy="68" r="12" fill="#FFFFFF" stroke="#E0E0DA" strokeWidth="1.5" />
                <path d="M65 68l3.5 3.5L76 64" stroke="#C8C8C2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="34" cy="30" r="3" fill="#E8E8E4" />
                <circle cx="108" cy="26" r="2" fill="#E8E8E4" />
                <circle cx="112" cy="60" r="2.5" fill="#E8E8E4" />
              </svg>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#0A0A0A', marginBottom: '6px' }}>No orders found</div>
              <div style={{ fontSize: '13px', color: '#BABAB6', maxWidth: '300px', margin: '0 auto', lineHeight: 1.6 }}>We couldn't find any orders matching your active filters or text queries.</div>
            </div>
          )}
        </div>
      </>
    )
  }

  const ProductsView = () => {
    const ready   = MOCK_PRODUCTS.filter(p => p.status === 'ready').length
    const missing = MOCK_PRODUCTS.filter(p => p.status === 'incomplete').length
    return (
      <>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
          <div>
            <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '26px', fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.5px', marginBottom: '4px' }}>Products</h1>
            <p style={{ fontSize: '13px', color: '#BABAB6' }}>Map each Shopify product to a print file and factory SKU.</p>
          </div>
          <button className="pf-btn" style={{ padding: '9px 18px', fontSize: '13px', flexShrink: 0 }}>↻ Sync from Shopify</button>
        </div>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          {[{ label: 'Total products', value: MOCK_PRODUCTS.length, color: '#0A0A0A' }, { label: 'Ready to print', value: ready, color: '#166534' }, { label: 'Needs setup', value: missing, color: '#C2410C' }].map(s => (
            <div key={s.label} style={{ background: '#FFFFFF', border: '1px solid #E8E8E4', borderRadius: '10px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px', fontWeight: 800, color: s.color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{s.value}</span>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '38px', height: '38px', borderRadius: '9px', flexShrink: 0,
                        background: PRODUCT_GRADIENTS[i % PRODUCT_GRADIENTS.length],
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '17px', boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                      }}>{productEmoji(p.name)}</div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#0A0A0A' }}>{p.name}</div>
                        <div style={{ fontSize: '10px', color: '#C8C8C4', marginTop: '2px', fontFamily: 'monospace' }}>#{p.shopifyId}</div>
                      </div>
                    </div>
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
          <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '26px', fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.5px', marginBottom: '4px' }}>Billing</h1>
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
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
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
        <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '26px', fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.5px', marginBottom: '4px' }}>Settings</h1>
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

      {/* Sidebar (Warm Stone-Beige Sellers Club layout) */}
      <aside style={{ width: '260px', flexShrink: 0, background: '#EAEAE2', borderRight: '1px solid rgba(23,43,21,0.08)', position: 'fixed', top: 0, left: 0, bottom: 0, display: 'flex', flexDirection: 'column', zIndex: 100 }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(23,43,21,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            <img 
              src="/images/logo.jpeg" 
              alt="No Limit Studio" 
              style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} 
            />
            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '15px', color: '#172B15', letterSpacing: '-0.3px' }}>
              No Limit Studio
            </span>
          </div>
        </div>
        <nav style={{ flex: 1, padding: '24px 16px', overflowY: 'auto' }}>
          
          {/* Section 1: Start Here */}
          <div style={{ fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7A7A70', padding: '0 18px 8px', marginBottom: '4px' }}>Start Here</div>
          {NAV_ITEMS.slice(0, 3).map(({ id, label, Icon }) => {
            const active = activeNav === id
            return (
              <button key={id} onClick={() => setActiveNav(id)} style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 18px', border: 'none', background: active ? '#FFFFFF' : 'transparent', color: '#172B15', fontSize: '14.5px', fontWeight: active ? 800 : 600, cursor: 'pointer', textAlign: 'left', marginBottom: '6px', fontFamily: 'Inter, sans-serif', transition: 'all 0.2s', justifyContent: 'space-between', borderRadius: '12px', boxShadow: active ? '0 4px 12px rgba(23,43,21,0.04)' : 'none' }}
                onMouseOver={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.45)' } }}
                onMouseOut={e => { if (!active) { e.currentTarget.style.background = 'transparent' } }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><Icon />{label}</span>
              </button>
            )
          })}

          {/* Section 2: Store Hub */}
          <div style={{ fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7A7A70', padding: '20px 18px 8px', marginBottom: '4px' }}>Store Hub</div>
          {NAV_ITEMS.slice(3, 5).map(({ id, label, Icon }) => {
            const active = activeNav === id
            return (
              <button key={id} onClick={() => setActiveNav(id)} style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 18px', border: 'none', background: active ? '#FFFFFF' : 'transparent', color: '#172B15', fontSize: '14.5px', fontWeight: active ? 800 : 600, cursor: 'pointer', textAlign: 'left', marginBottom: '6px', fontFamily: 'Inter, sans-serif', transition: 'all 0.2s', justifyContent: 'space-between', borderRadius: '12px', boxShadow: active ? '0 4px 12px rgba(23,43,21,0.04)' : 'none' }}
                onMouseOver={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.45)' } }}
                onMouseOut={e => { if (!active) { e.currentTarget.style.background = 'transparent' } }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><Icon />{label}</span>
              </button>
            )
          })}

          {/* Section 3: Settings & Support */}
          <div style={{ fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7A7A70', padding: '20px 18px 8px', marginBottom: '4px' }}>Settings & Support</div>
          {NAV_ITEMS.slice(5).map(({ id, label, Icon }) => {
            const active = activeNav === id
            return (
              <button key={id} onClick={() => setActiveNav(id)} style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 18px', border: 'none', background: active ? '#FFFFFF' : 'transparent', color: '#172B15', fontSize: '14.5px', fontWeight: active ? 800 : 600, cursor: 'pointer', textAlign: 'left', marginBottom: '6px', fontFamily: 'Inter, sans-serif', transition: 'all 0.2s', justifyContent: 'space-between', borderRadius: '12px', boxShadow: active ? '0 4px 12px rgba(23,43,21,0.04)' : 'none' }}
                onMouseOver={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.45)' } }}
                onMouseOut={e => { if (!active) { e.currentTarget.style.background = 'transparent' } }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><Icon />{label}</span>
                {id === 'billing' && currentPlan !== 'free' && (
                  <span style={{ fontSize: '9px', fontWeight: 700, background: '#172B15', color: '#B9F95D', padding: '2px 6px', borderRadius: '4px', letterSpacing: '0.04em' }}>{PLAN_LABELS[currentPlan].toUpperCase()}</span>
                )}
                {id === 'billing' && currentPlan === 'free' && isNearLimit && (
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#F97316', flexShrink: 0 }} />
                )}
              </button>
            )
          })}
        </nav>
        <div style={{ padding: '12px 14px 16px', borderTop: '1px solid rgba(23,43,21,0.06)' }}>
          <div style={{ background: '#FFFFFF', border: '1px solid rgba(23,43,21,0.06)', borderRadius: '12px', padding: '11px 13px', marginBottom: '10px', boxShadow: '0 4px 12px rgba(23,43,21,0.015)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#39B54A', flexShrink: 0, boxShadow: '0 0 6px #39B54A' }}/>
              <span style={{ fontSize: '10px', fontWeight: 750, color: '#39B54A', letterSpacing: '0.04em' }}>CONNECTED</span>
            </div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#172B15', wordBreak: 'break-all', lineHeight: 1.4 }}>{shopDomain}</div>
          </div>
          <button onClick={logout} style={{ width: '100%', padding: '9px', background: 'transparent', border: '1px solid rgba(23,43,21,0.12)', borderRadius: '8px', fontSize: '12px', fontWeight: 600, color: '#7A7A70', cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all 0.2s' }} onMouseOver={e=>{e.currentTarget.style.borderColor='#EF4444';e.currentTarget.style.color='#EF4444';e.currentTarget.style.background='rgba(239,68,68,0.04)'}} onMouseOut={e=>{e.currentTarget.style.borderColor='rgba(23,43,21,0.12)';e.currentTarget.style.color='#7A7A70';e.currentTarget.style.background='transparent'}}>Sign out</button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ marginLeft: '232px', flex: 1, minWidth: 0 }}>
        <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(250,250,248,0.9)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: '1px solid #E8E8E4', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px' }}>
          <span style={{ fontSize: '14px', color: '#172B15', fontWeight: 550 }}>{greeting()}, <strong style={{ fontWeight: 700 }}>{firstName}</strong></span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '12px', color: '#71717A' }}>{new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
            <button 
              onClick={() => navigate('/')} 
              style={{ 
                background: '#B9F95D', color: '#172B15', border: 'none', borderRadius: '8px', 
                padding: '8px 16px', fontSize: '12px', fontWeight: 750, cursor: 'pointer', 
                fontFamily: 'Inter, sans-serif', boxShadow: '0 2px 8px rgba(185,249,93,0.15)',
                transition: 'all 0.2s' 
              }}
              onMouseOver={e => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(185,249,93,0.3)';
              }}
              onMouseOut={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(185,249,93,0.15)';
              }}
            >
              + Connect Store
            </button>
          </div>
        </div>

        <div style={{ padding: '36px 40px', position: 'relative' }}>
          {/* Ambient light-green background radial glows */}
          <div style={{ position: 'absolute', top: '10%', right: '5%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(185,249,93,0.03) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
          <div style={{ position: 'absolute', bottom: '10%', left: '5%', width: '350px', height: '350px', background: 'radial-gradient(circle, rgba(57,181,74,0.02) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

          {activeNav === 'dashboard' && (
            <>
              <div style={{ marginBottom: '28px', position: 'relative', zIndex: 1 }}>
                <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '26px', fontWeight: 800, color: '#172B15', letterSpacing: '-0.5px', marginBottom: '4px' }}>Dashboard Overview</h1>
                <p style={{ fontSize: '13px', color: '#889B8E', fontWeight: 500 }}>Welcome back! Here is your weekly store performance and insights.</p>
              </div>
              <DashboardOverview />
            </>
          )}
          {activeNav === 'orders' && (
            <>
              <div style={{ marginBottom: '28px', position: 'relative', zIndex: 1 }}>
                <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '26px', fontWeight: 800, color: '#172B15', letterSpacing: '-0.5px', marginBottom: '4px' }}>Order Management</h1>
                <p style={{ fontSize: '13px', color: '#889B8E', fontWeight: 500 }}>Fulfillment status and print orders synced directly from <span style={{ color: '#172B15', fontWeight: 600 }}>{shopDomain}</span>.</p>
              </div>
              <OrdersManagement />
            </>
          )}
          {activeNav === 'products' && <div style={{ position: 'relative', zIndex: 1 }}><ProductsView /></div>}
          {activeNav === 'billing'  && <div style={{ position: 'relative', zIndex: 1 }}><BillingView /></div>}
          {activeNav === 'settings' && <div style={{ position: 'relative', zIndex: 1 }}><SettingsView /></div>}
          
          {/* Notifications Panel View (With custom sender) */}
          {activeNav === 'notifications' && (
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ marginBottom: '28px' }}>
                <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '26px', fontWeight: 800, color: '#172B15', letterSpacing: '-0.5px', marginBottom: '4px' }}>Notifications</h1>
                <p style={{ fontSize: '13px', color: '#889B8E', fontWeight: 500 }}>Broadcast center to test live system alerts and manage customer updates.</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '28px', alignItems: 'start' }}>
                {/* Left panel: Trigger custom message console */}
                <div style={{ background: '#FFFFFF', border: '1px solid rgba(23,43,21,0.06)', borderRadius: '20px', padding: '24px', boxShadow: '0 8px 30px rgba(23,43,21,0.015)' }}>
                  <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '16px', fontWeight: 800, color: '#172B15', marginBottom: '16px' }}>Send Test System Alert</h3>
                  
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#889B8E', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Alert Title</label>
                    <input 
                      type="text" placeholder="e.g. Printer maintenance"
                      value={customNotifTitle} onChange={e=>setCustomNotifTitle(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', boxSizing: 'border-box', border: '1px solid rgba(23,43,21,0.1)', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                    />
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#889B8E', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Description</label>
                    <textarea 
                      placeholder="Enter custom alert text message"
                      value={customNotifDesc} onChange={e=>setCustomNotifDesc(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', boxSizing: 'border-box', border: '1px solid rgba(23,43,21,0.1)', borderRadius: '8px', fontSize: '13px', height: '80px', fontFamily: 'Inter, sans-serif', outline: 'none', resize: 'none' }}
                    />
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#889B8E', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Alert Priority</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {['success', 'info', 'warning'].map(t => (
                        <button key={t} onClick={() => setCustomNotifType(t)} style={{ flex: 1, padding: '8px', border: '1px solid', borderColor: customNotifType === t ? '#172B15' : 'rgba(23,43,21,0.1)', background: customNotifType === t ? '#172B15' : 'transparent', color: customNotifType === t ? '#FFFFFF' : '#71717A', borderRadius: '8px', fontSize: '12px', textTransform: 'capitalize', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      if (!customNotifTitle.trim()) return
                      const newNotif = {
                        id: Date.now(),
                        title: customNotifTitle,
                        desc: customNotifDesc || 'Custom developer system broadcast.',
                        type: customNotifType,
                        time: 'Just now'
                      }
                      setActiveNotifs([newNotif, ...activeNotifs])
                      setCustomNotifTitle('')
                      setCustomNotifDesc('')
                    }}
                    style={{ width: '100%', padding: '12px', background: '#B9F95D', color: '#172B15', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 750, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(185,249,93,0.15)' }}
                    onMouseOver={e => e.currentTarget.style.boxShadow = '0 6px 16px rgba(185,249,93,0.3)'}
                    onMouseOut={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(185,249,93,0.15)'}
                  >
                    Broadcast System Alert
                  </button>
                </div>

                {/* Right panel: Alerts feed */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {activeNotifs.map(n => {
                    let dotColor = '#22C55E'
                    let bg = '#F0FDF4'
                    if (n.type === 'info') { dotColor = '#3B82F6'; bg = '#EFF6FF' }
                    if (n.type === 'warning') { dotColor = '#F97316'; bg = '#FFF7ED' }

                    return (
                      <div key={n.id} style={{ background: '#FFFFFF', border: '1px solid rgba(23,43,21,0.06)', borderRadius: '16px', padding: '16px 20px', display: 'flex', gap: '14px', alignItems: 'start', transition: 'transform 0.2s', boxShadow: '0 4px 14px rgba(23,43,21,0.008)' }} onMouseOver={e=>e.currentTarget.style.transform='translateX(2px)'} onMouseOut={e=>e.currentTarget.style.transform='translateX(0)'}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: dotColor }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <h4 style={{ fontSize: '13.5px', fontWeight: 750, color: '#172B15', margin: 0 }}>{n.title}</h4>
                            <span style={{ fontSize: '11px', color: '#A1A1AA', fontWeight: 500 }}>{n.time}</span>
                          </div>
                          <p style={{ fontSize: '12.5px', color: '#71717A', lineHeight: 1.5, margin: 0 }}>{n.desc}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Trends Dashboard View (Google Trends & Live Social Trends) */}
          {activeNav === 'trends' && (
            <div style={{ position: 'relative', zIndex: 1 }}>
              
              {/* Header Toggle Row */}
              <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '26px', fontWeight: 800, color: '#172B15', letterSpacing: '-0.5px', marginBottom: '4px' }}>
                    {trendTab === 'social' ? "What's trending" : 'Market trends'}
                  </h1>
                  <p style={{ fontSize: '13px', color: '#889B8E', fontWeight: 500 }}>
                    {trendTab === 'social' ? 'Real trending topics from Wikipedia readership, for design inspiration.' : 'Live search metrics parsed directly from Google Trends APIs.'}
                  </p>
                </div>

                <div style={{ display: 'flex', background: '#F4F4F0', borderRadius: '12px', padding: '4px', border: '1px solid #E8E8E4' }}>
                  <button 
                    onClick={() => setTrendTab('market')} 
                    style={{ padding: '8px 18px', border: 'none', background: trendTab === 'market' ? '#FFFFFF' : 'transparent', color: '#172B15', fontSize: '13px', fontWeight: trendTab === 'market' ? 750 : 550, borderRadius: '8px', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'Inter, sans-serif', boxShadow: trendTab === 'market' ? '0 2px 8px rgba(23,43,21,0.05)' : 'none' }}
                  >
                    Market trends
                  </button>
                  <button 
                    onClick={() => setTrendTab('social')} 
                    style={{ padding: '8px 18px', border: 'none', background: trendTab === 'social' ? '#FFFFFF' : 'transparent', color: '#172B15', fontSize: '13px', fontWeight: trendTab === 'social' ? 750 : 550, borderRadius: '8px', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'Inter, sans-serif', boxShadow: trendTab === 'social' ? '0 2px 8px rgba(23,43,21,0.05)' : 'none' }}
                  >
                    Social trends
                  </button>
                </div>
              </div>

              {/* ────────────────── SOCIAL TRENDS TAB ────────────────── */}
              {trendTab === 'social' && (
                <>
                  {/* Social Buzz Inspiration Banner */}
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', background: '#FFFFFF', border: '1px solid rgba(23,43,21,0.06)', borderRadius: '24px', padding: '32px', marginBottom: '28px', alignItems: 'center', boxShadow: '0 8px 30px rgba(23,43,21,0.01)' }}>
                    <div>
                      <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '22px', fontWeight: 800, color: '#172B15', marginBottom: '10px', letterSpacing: '-0.3px' }}>
                        Turn social media buzz into inspiration
                      </h2>
                      <p style={{ fontSize: '13.5px', color: '#71717A', lineHeight: 1.6, marginBottom: '0px', maxWidth: '460px' }}>
                        Explore what people are talking about online and spot the next trend before your competition. <a href="#" onClick={e=>e.preventDefault()} style={{ color: '#172B15', fontWeight: 700, textDecoration: 'underline' }}>Learn more</a>
                      </p>
                    </div>
                    {/* Illustration bubble container */}
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', height: '100px' }}>
                      <div style={{ width: '80px', height: '80px', background: '#39B54A', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', transform: 'rotate(-8deg)', boxShadow: '0 10px 24px rgba(57,181,74,0.25)' }}>
                        {/* TikTok Icon */}
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>
                      </div>
                      <div style={{ position: 'absolute', top: '-10px', right: '35px', width: '36px', height: '36px', borderRadius: '50%', background: '#FFFFFF', border: '1px solid rgba(23,43,21,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#172B15', boxShadow: '0 4px 12px rgba(23,43,21,0.06)' }}>
                        {/* Instagram logo outline */}
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37zM17.5 6.5h.01"/></svg>
                      </div>
                      <div style={{ position: 'absolute', bottom: '-5px', left: '35px', width: '36px', height: '36px', borderRadius: '50%', background: '#FFFFFF', border: '1px solid rgba(23,43,21,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#172B15', boxShadow: '0 4px 12px rgba(23,43,21,0.06)' }}>
                        <span style={{ fontWeight: 850, fontSize: '13px', fontFamily: 'Inter, sans-serif', letterSpacing: '-0.5px' }}>X</span>
                      </div>
                    </div>
                  </div>

                  {/* Filter Pills row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {[
                        { label: 'Category', value: 'All' },
                        { label: 'Trend', value: 'All' },
                      ].map(f => (
                        <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#FFFFFF', border: '1px solid rgba(23,43,21,0.08)', borderRadius: '10px', padding: '8px 14px', fontSize: '13px', color: '#172B15', fontWeight: 600, cursor: 'pointer' }}>
                          <span style={{ color: '#889B8E', fontWeight: 500 }}>{f.label}:</span>
                          <span>{f.value}</span>
                          <span style={{ fontSize: '10px', color: '#BABAB6', marginLeft: '2px' }}>▼</span>
                        </div>
                      ))}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#FFFFFF', border: '1px solid rgba(23,43,21,0.08)', borderRadius: '10px', padding: '8px 14px', fontSize: '13px', color: '#71717A', fontWeight: 550, cursor: 'pointer' }}>
                        New only
                      </div>
                    </div>
                    <span style={{ fontSize: '12.5px', color: '#889B8E', fontWeight: 550 }}>
                      {trendsDate ? `Data from: ${trendsDate}` : ''}
                    </span>
                  </div>

                  {/* Social Trends Table */}
                  <div style={{ background: '#FFFFFF', border: '1px solid rgba(23,43,21,0.06)', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 12px 40px rgba(23,43,21,0.02)', position: 'relative', zIndex: 1 }}>
                    {loadingTrends ? (
                      <div style={{ padding: '72px 32px', textAlign: 'center' }}>
                        <div style={{ width: '20px', height: '20px', border: '2px solid #E8E8E4', borderTop: '2px solid #39B54A', borderRadius: '50%', animation: 'pf-spin 0.7s linear infinite', margin: '0 auto 16px' }} />
                        <div style={{ fontSize: '13px', color: '#BABAB6', fontWeight: 500 }}>Loading daily social metrics...</div>
                      </div>
                    ) : trendsError ? (
                      <div style={{ padding: '72px 32px', textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', marginBottom: '12px' }}>⚠️</div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#172B15', marginBottom: '4px' }}>Feed synchronization offline</div>
                        <div style={{ fontSize: '13px', color: '#BABAB6' }}>{trendsError}</div>
                      </div>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            {['Rank', 'Topics', 'Volume (Wikipedia views)', 'Trend', ''].map(h => (
                              <th key={h} style={{ padding: '12px 24px', textAlign: 'left', fontSize: '10.5px', fontWeight: 700, color: '#889B8E', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid #E8E8E4', background: '#FCFCFB' }}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {socialTrends.map((t, i) => (
                            <tr key={t.rank} className="pf-table-row" style={{ borderBottom: i < socialTrends.length - 1 ? '1px solid #F4F4F0' : 'none' }}>
                              
                              {/* Rank */}
                              <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: 750, color: '#172B15' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <span>{t.rank}</span>
                                  {t.isNew && (
                                    <span style={{ fontSize: '9px', fontWeight: 800, background: '#DCFCE7', color: '#166534', padding: '1px 5px', borderRadius: '4px', textTransform: 'uppercase' }}>NEW</span>
                                  )}
                                </div>
                              </td>

                              {/* Topics */}
                              <td style={{ padding: '14px 24px' }}>
                                <div style={{ fontSize: '14px', fontWeight: 750, color: '#172B15' }}>{t.topic}</div>
                                <div style={{ fontSize: '11.5px', color: '#889B8E', marginTop: '2px', fontWeight: 500 }}>{t.category}</div>
                              </td>

                              {/* Volume */}
                              <td style={{ padding: '14px 24px' }}>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: '#172B15' }}>{t.volume}</div>
                              </td>

                              {/* Trend (real, vs. yesterday's ranking) */}
                              <td style={{ padding: '14px 24px' }}>
                                <div style={{ fontSize: '13px', color: t.trendState === 'Growing' ? '#22C55E' : '#EF4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span>{t.trendState === 'Growing' ? '↗' : '↘'}</span>
                                  <span>{t.trendState}</span>
                                </div>
                              </td>

                              {/* Source link */}
                              <td style={{ padding: '14px 24px' }}>
                                <a href={t.articleUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', fontWeight: 600, color: '#39B54A', textDecoration: 'none' }}>
                                  View on Wikipedia ↗
                                </a>
                              </td>

                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </>
              )}

              {/* ────────────────── MARKET TRENDS TAB ────────────────── */}
              {trendTab === 'market' && (
                <>
                  {/* Dynamic Query Search Input */}
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                    <input 
                      type="text" 
                      placeholder="Search design niches (e.g. dogs, space, groovy, cats) to query Google Trends live..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      style={{
                        flex: 1, padding: '12px 16px', border: '1px solid rgba(23,43,21,0.1)', 
                        borderRadius: '12px', fontSize: '14px', outline: 'none', background: '#FFFFFF',
                        transition: 'all 0.2s', fontFamily: 'Inter, sans-serif', color: '#172B15'
                      }}
                      onFocus={e => { e.target.style.borderColor = '#39B54A'; e.target.style.boxShadow = '0 0 0 3px rgba(57,181,74,0.08)' }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(23,43,21,0.1)'; e.target.style.boxShadow = 'none' }}
                    />
                    {searchQuery && (
                      <button 
                        onClick={() => setSearchQuery('')}
                        style={{
                          background: '#FAFAF9', border: '1px solid rgba(23,43,21,0.1)', 
                          borderRadius: '12px', padding: '0 16px', fontSize: '12px', fontWeight: 600,
                          color: '#71717A', cursor: 'pointer', fontFamily: 'Inter, sans-serif'
                        }}
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Trend search analysis container */}
                  <div style={{ background: '#FFFFFF', border: '1px solid rgba(23,43,21,0.06)', borderRadius: '24px', padding: '24px', marginBottom: '28px', boxShadow: '0 8px 30px rgba(23,43,21,0.015)' }}>
                    <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '16px', fontWeight: 800, color: '#172B15', marginBottom: '6px' }}>
                      {searchQuery ? `Google Search Volume: "${searchQuery}"` : 'Interactive Google Trends Graph'}
                    </h3>
                    <p style={{ fontSize: '12px', color: '#71717A', marginBottom: '24px' }}>
                      {searchQuery ? `Analyzing custom queries for "${searchQuery}" design decals over the last 90 days.` : 'Analyze search queries for custom garments in real time.'}
                    </p>
                    
                    {/* SVG Curve chart simulating Google Trend spikes dynamically */}
                    <div style={{ width: '100%', height: '180px', position: 'relative', background: '#FAFAF9', borderRadius: '16px', border: '1px dashed rgba(23,43,21,0.06)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                      <svg viewBox="0 0 500 150" style={{ width: '90%', height: '80%', overflow: 'visible' }}>
                        {/* Grid lines */}
                        <line x1="0" y1="30" x2="500" y2="30" stroke="rgba(23,43,21,0.03)" strokeWidth="1" />
                        <line x1="0" y1="75" x2="500" y2="75" stroke="rgba(23,43,21,0.03)" strokeWidth="1" />
                        <line x1="0" y1="120" x2="500" y2="120" stroke="rgba(23,43,21,0.03)" strokeWidth="1" />
                        
                        {/* Dynamic trend path */}
                        <path 
                          d={generateDynamicSVGPath(searchQuery)} 
                          fill="none" stroke="#39B54A" strokeWidth="3.5" strokeLinecap="round" 
                          style={{ transition: 'd 0.5s ease-in-out', filter: 'drop-shadow(0 4px 8px rgba(57,181,74,0.3))' }} 
                        />
                        <circle cx="500" cy="10" r="5" fill="#39B54A" />
                      </svg>
                      <div style={{ position: 'absolute', bottom: '12px', left: '16px', fontSize: '11px', color: '#889B8E', fontWeight: 600 }}>Dec 2024</div>
                      <div style={{ position: 'absolute', bottom: '12px', right: '16px', fontSize: '11px', color: '#39B54A', fontWeight: 700 }}>Jan 2025 (Peak Surge)</div>
                    </div>

                    {/* Trending queries table */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                      {generateTrendsData(searchQuery).map(q => (
                        <div key={q.title} style={{ padding: '16px', background: '#FAFAF9', border: '1px solid rgba(23,43,21,0.04)', borderRadius: '12px', display: 'flex', flexDirection: 'column' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 800, color: '#172B15', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{q.title}</span>
                            {q.hot && <span style={{ fontSize: '9px', fontWeight: 700, background: 'rgba(57,181,74,0.1)', color: '#39B54A', padding: '2px 6px', borderRadius: '4px' }}>HOT</span>}
                          </div>
                          <div style={{ fontSize: '18px', fontWeight: 900, color: '#39B54A', marginBottom: '3px' }}>{q.rate}</div>
                          <div style={{ fontSize: '11px', color: '#889B8E', marginBottom: '6px' }}>{q.volume}</div>
                          <div style={{ fontSize: '10px', color: '#A1A8A3', fontWeight: 550, borderTop: '1px solid rgba(23,43,21,0.04)', paddingTop: '6px' }}>
                            📍 {q.platforms}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Medium Trending Section */}
                  <div style={{ marginTop: '36px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        background: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#FFFFFF', fontWeight: 'bold', fontSize: '15px', fontFamily: "'Plus Jakarta Sans', sans-serif"
                      }}>M</div>
                      <div>
                        <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '18px', fontWeight: 800, color: '#172B15', margin: 0 }}>
                          Trending on Medium
                        </h3>
                        <p style={{ fontSize: '12px', color: '#71717A', margin: 0 }}>
                          Top design insights and e-commerce growth strategies shared by industry leaders.
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                      {MEDIUM_TRENDS.map(item => (
                        <a 
                          key={item.id}
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="pf-medium-card"
                          style={{
                            background: '#FFFFFF', border: '1px solid rgba(23,43,21,0.06)', 
                            borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', 
                            textDecoration: 'none', transition: 'all 0.25s', boxShadow: '0 4px 14px rgba(23,43,21,0.008)'
                          }}
                        >
                          {/* Author & Publication */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <span style={{ fontSize: '11px', color: '#889B8E', fontWeight: 600 }}>
                              By {item.author}
                            </span>
                            <span style={{ fontSize: '9px', fontWeight: 700, background: 'rgba(23,43,21,0.05)', color: '#172B15', padding: '2px 8px', borderRadius: '4px' }}>
                              {item.publication}
                            </span>
                          </div>

                          {/* Title */}
                          <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#172B15', lineHeight: 1.4, marginBottom: '8px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: '38px' }}>
                            {item.title}
                          </h4>

                          {/* Description */}
                          <p style={{ fontSize: '12px', color: '#71717A', lineHeight: 1.5, marginBottom: '18px', flex: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {item.description}
                          </p>

                          {/* Footer: claps & read time */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #F4F4F0', fontSize: '11.5px', color: '#A1A1AA', fontWeight: 550 }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              👏 {item.claps}
                            </span>
                            <span>{item.readTime}</span>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Help & Support View */}
          {activeNav === 'help' && (
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ marginBottom: '28px' }}>
                <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '26px', fontWeight: 800, color: '#172B15', letterSpacing: '-0.5px', marginBottom: '4px' }}>Help Center</h1>
                <p style={{ fontSize: '13px', color: '#889B8E', fontWeight: 500 }}>Access guides, browse frequently asked questions, or chat with our operations team.</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '28px', alignItems: 'start' }}>
                {/* FAQs */}
                <div style={{ background: '#FFFFFF', border: '1px solid rgba(23,43,21,0.06)', borderRadius: '24px', padding: '24px', boxShadow: '0 8px 30px rgba(23,43,21,0.015)' }}>
                  <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '16px', fontWeight: 800, color: '#172B15', marginBottom: '18px' }}>Frequently Asked Questions</h3>
                  
                  {[
                    { q: 'How does No Limit Studio connect with Shopify?', a: 'When you paste your shopify domain, we request read/write access to sync your catalog inventory and download order payloads automatically.' },
                    { q: 'What is the printing and fulfillment timeframe?', a: 'All print-on-demand files are processed instantly. Production takes 24-48 hours, followed by priority global delivery shipping.' },
                    { q: 'How do I upload custom mockup designs?', a: 'Navigate to the Products view, click upload, and place your transparent PNG file onto the active apparel outline bounding box.' },
                  ].map((faq, idx) => (
                    <div key={idx} style={{ padding: '14px 0', borderBottom: idx < 2 ? '1px solid #F4F4F0' : 'none' }}>
                      <h4 style={{ fontSize: '13.5px', fontWeight: 750, color: '#172B15', marginBottom: '6px' }}>{faq.q}</h4>
                      <p style={{ fontSize: '12.5px', color: '#71717A', lineHeight: 1.5, margin: 0 }}>{faq.a}</p>
                    </div>
                  ))}
                </div>

                {/* Contact Card */}
                <div style={{ background: '#111A13', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '24px', padding: '24px', color: '#FFFFFF', boxShadow: '0 8px 30px rgba(9,26,14,0.1)' }}>
                  <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '16px', fontWeight: 800, color: '#B9F95D', marginBottom: '8px' }}>Open Support Ticket</h3>
                  <p style={{ fontSize: '12.5px', color: '#A1A8A3', lineHeight: 1.5, marginBottom: '20px' }}>Our printing operations and catalog engineers are available 24/7 to solve setup bugs.</p>
                  
                  <button 
                    onClick={() => alert('Support ticket created! Our team will email you shortly.')}
                    style={{ width: '100%', padding: '12px', background: '#B9F95D', color: '#172B15', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 750, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(185,249,93,0.15)' }}
                    onMouseOver={e => e.currentTarget.style.boxShadow = '0 6px 16px rgba(185,249,93,0.3)'}
                    onMouseOut={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(185,249,93,0.15)'}
                  >
                    Open Live Chat Ticket
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Order detail panel */}
      {selectedOrder && (
        <div onClick={e => { if (e.target === e.currentTarget) setSelectedOrder(null) }} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)' }}>
          <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '500px', background: '#FFFFFF', borderLeft: '1px solid #E8E8E4', overflowY: 'auto', animation: 'pf-slide-in 0.22s cubic-bezier(0.22,1,0.36,1)' }}>
            <div style={{ position: 'sticky', top: 0, background: '#FFFFFF', zIndex: 10, padding: '18px 24px', borderBottom: '1px solid #E8E8E4', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '16px', fontWeight: 700, color: '#0A0A0A', marginBottom: '2px' }}>Order {selectedOrder.id}</div>
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
                        <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: done ? '#39B54A' : '#F4F4F0', border: `2px solid ${done ? '#39B54A' : '#E8E8E4'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: done ? 'white' : '#C8C8C4', fontWeight: 700 }}>
                          {done && !active ? '✓' : i+1}
                        </div>
                        <div style={{ fontSize: '9px', color: done ? '#172B15' : '#C8C8C4', marginTop: '5px', fontWeight: done ? 700 : 400, textTransform: 'capitalize' }}>{step}</div>
                      </div>
                      {i < TIMELINE_STEPS.length-1 && <div style={{ flex: 1, height: '2px', background: i < TIMELINE_STEPS.indexOf(selectedOrder.status) ? '#39B54A' : '#E8E8E4', margin: '12px 4px 0' }}/>}
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

      {/* Blog / Tutorial Article Reader Modal */}
      {activeArticle && (
        <div 
          onClick={e => { if (e.target === e.currentTarget) setActiveArticle(null) }}
          style={{ 
            position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(9,26,14,0.3)', 
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' 
          }}
        >
          <div 
            style={{ 
              background: '#FFFFFF', borderRadius: '24px', width: '100%', maxWidth: '600px', 
              maxHeight: '85vh', overflow: 'hidden', boxShadow: '0 24px 80px rgba(9,26,14,0.15)',
              display: 'flex', flexDirection: 'column', animation: 'pf-fade-up 0.25s ease' 
            }}
          >
            {/* Header Image */}
            <div style={{ height: '200px', position: 'relative', flexShrink: 0 }}>
              <img src={activeArticle.img} alt={activeArticle.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button 
                onClick={() => setActiveArticle(null)}
                style={{ 
                  position: 'absolute', top: '16px', right: '16px', width: '32px', height: '32px', 
                  borderRadius: '50%', background: '#FFFFFF', border: 'none', 
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)', cursor: 'pointer', display: 'flex', 
                  alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: '#172B15', fontWeight: 700 
                }}
              >
                ✕
              </button>
            </div>

            {/* Text content (scrollable) */}
            <div style={{ padding: '32px', overflowY: 'auto' }}>
              <span style={{ fontSize: '11px', fontWeight: 750, color: '#39B54A', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {activeArticle.category}
              </span>
              <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '20px', fontWeight: 900, color: '#172B15', letterSpacing: '-0.4px', marginTop: '6px', marginBottom: '8px', lineHeight: 1.3 }}>
                {activeArticle.title}
              </h1>
              <div style={{ fontSize: '12px', color: '#A1A1AA', fontWeight: 500, marginBottom: '24px' }}>
                {activeArticle.date}
              </div>

              {/* Body HTML */}
              <div 
                className="pf-article-body"
                dangerouslySetInnerHTML={{ __html: activeArticle.content }}
                style={{ fontSize: '14px', color: '#52525B', lineHeight: 1.6 }}
              />

              {/* Academy call-to-action */}
              <div style={{ background: 'rgba(185,249,93,0.1)', border: '1px solid rgba(57,181,74,0.2)', borderRadius: '16px', padding: '20px', marginTop: '36px', textAlign: 'center' }}>
                <h4 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '14px', color: '#172B15', marginBottom: '4px' }}>
                  🎓 Grow Your E-Commerce Store
                </h4>
                <p style={{ fontSize: '12px', color: '#71717A', lineHeight: 1.5, margin: '0 0 14px' }}>
                  Subscribe to the No Limit Academy newsletter to get exclusive dropshipping guides, scaling tips, and design ideas.
                </p>
                <div style={{ display: 'flex', gap: '8px', maxWidth: '360px', margin: '0 auto' }}>
                  <input type="email" placeholder="Enter your email" style={{ flex: 1, padding: '10px 14px', border: '1px solid rgba(23,43,21,0.1)', borderRadius: '8px', fontSize: '13px', outline: 'none' }} />
                  <button style={{ background: '#172B15', color: '#FFFFFF', border: 'none', borderRadius: '8px', padding: '10px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                    Join
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Embedded High-Performance CSS Transitions */}
      <style>{`
        /* Ambient backdrop gradient override */
        body {
          background: radial-gradient(at 0% 0%, rgba(185,249,93,0.04) 0px, transparent 50%), 
                      radial-gradient(at 100% 0%, rgba(57,181,74,0.03) 0px, transparent 50%), 
                      #FAFAF9 !important;
        }

        /* 3D Dashboard Metrics Card Lift */
        .pf-dashboard-card:hover {
          transform: translateY(-4px) scale(1.01) !important;
          box-shadow: 0 16px 36px rgba(23, 43, 21, 0.05), 
                      0 4px 12px rgba(23, 43, 21, 0.02) !important;
          border-color: rgba(57,181,74,0.15) !important;
        }

        /* Smooth slide-in for data list rows */
        .pf-table-row {
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .pf-table-row:hover {
          background: rgba(57,181,74,0.02) !important;
          transform: translateX(4px) !important;
        }

        /* Blog card zoom and shadow lifts */
        .pf-blog-card {
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .pf-blog-card:hover {
          transform: translateY(-4px) !important;
          box-shadow: 0 12px 30px rgba(23, 43, 21, 0.04), 0 4px 12px rgba(23, 43, 21, 0.02) !important;
          border-color: rgba(57,181,74,0.15) !important;
        }
        .pf-blog-card:hover .pf-blog-img {
          transform: scale(1.05) !important;
        }
        .pf-blog-img {
          transition: transform 0.4s ease-in-out !important;
        }

        /* Medium card lift transitions */
        .pf-medium-card:hover {
          transform: translateY(-4px) !important;
          box-shadow: 0 12px 30px rgba(23, 43, 21, 0.04), 0 4px 12px rgba(23, 43, 21, 0.02) !important;
          border-color: rgba(57,181,74,0.15) !important;
        }

        /* Modal content styling */
        .pf-article-body h2 {
          font-family: "'Plus Jakarta Sans', sans-serif" !important;
          font-size: 15px !important;
          font-weight: 800 !important;
          color: #172B15 !important;
          margin-top: 24px !important;
          margin-bottom: 8px !important;
        }
        .pf-article-body p {
          margin-bottom: 16px !important;
        }

        /* View side panel animations */
        @keyframes pf-slide-in {
          0% { transform: translateX(100%); }
          100% { transform: translateX(0); }
        }
        @keyframes pf-fade-up {
          0% { opacity: 0; transform: translateY(16px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

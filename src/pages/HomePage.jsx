import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import StoreConnectForm from '../components/StoreConnectForm'
import { useAuth } from '../contexts/AuthContext'

const STATS = [
  { value: '10K+', label: 'Stores connected', desc: 'Active Shopify stores synced' },
  { value: '2M+',  label: 'Orders fulfilled', desc: 'Printed & shipped worldwide' },
  { value: '99.9%', label: 'Fulfillment SLA', desc: 'On-time tracking & delivery' },
  { value: '4.9★', label: 'Merchant rating', desc: 'Rated by e-commerce founders' },
]

const FEATURES = [
  {
    icon: '💸',
    title: 'Highest Profit Margins',
    desc: 'We offer industry-leading low base prices on premium cotton apparel, giving you the room to scale your business with healthy margins.',
  },
  {
    icon: '⚡',
    title: 'Automated 1-Click Sync',
    desc: 'Connect your Shopify store in seconds. Orders are automatically received, sent to printing, and shipped under your own white-label brand.',
  },
  {
    icon: '✨',
    title: 'Premium Quality Control',
    desc: 'Each product undergoes dual-stage quality checking. Archival inks, precise stitching, and premium packaging come standard.',
  },
]

const PRODUCTS = [
  {
    id: 'tshirts',
    name: 'Streetwear Graphic Tees',
    description: '100% combed ring-spun cotton graphic tees, standard retail fit. Excellent for custom streetwear.',
    basePrice: '₹349',
    images: [
      '/images/fulfillment/tee_back_flirt.jpg',
      '/images/fulfillment/tee_back_playlist.jpg',
      '/images/fulfillment/tee_back_drink.jpg',
      '/images/fulfillment/tee_back_bull.jpg'
    ],
    labels: ['Fear Women', 'Send Playlist', 'Done Drinking', 'Red Flags'],
    sizes: ['S', 'M', 'L', 'XL', '2XL'],
    colors: ['#FFFFFF', '#18181B', '#4B5563', '#1E3A8A'],
    features: ['Combed cotton', 'Retail fit', 'Side-seamed', 'Tear-away label']
  },
  {
    id: 'caps',
    name: 'Embroidered Hats',
    description: 'Premium cotton twill baseball caps. Optimized for structured textured embroidery stitching.',
    basePrice: '₹299',
    images: [
      '/images/fulfillment/cap_embroidered.jpg',
      '/images/fulfillment/cap_embroidered_2.jpg'
    ],
    labels: ['Beige Cap', 'Black Cap'],
    sizes: ['One Size Fits All'],
    colors: ['#F5E6CC', '#0A0A0A'],
    features: ['Cotton twill', 'Premium stitching', 'Adjustable buckle strap', 'Breathable eyelets']
  },
  {
    id: 'pet_tshirts',
    name: 'Pet T-Shirts',
    description: 'Comfy and cute premium pet apparel designed for active cats and dogs.',
    basePrice: '₹449',
    images: [
      '/images/fulfillment/pet_tee_frenchie_1.jpg',
      '/images/fulfillment/pet_tee_frenchie_2.jpg',
      '/images/fulfillment/pet_tee_frenchie_3.jpg'
    ],
    labels: ['Red Slogan', 'Black Slogan 1', 'Black Slogan 2'],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: ['#EF4444', '#18181B'],
    features: ['100% Polyester', 'Easy-stretch cuffs', 'Breathable fabric', 'Machine washable']
  },
  {
    id: 'hoodies',
    name: 'Streetwear Hoodies',
    description: 'Heavyweight organic blend pullover hoodies with soft fleece lining.',
    basePrice: '₹899',
    images: ['/images/hoodie_1.jpg', '/images/hoodie_2.jpg'],
    labels: ['On Model', 'Hanger Shot'],
    sizes: ['S', 'M', 'L', 'XL', '3XL'],
    colors: ['#F3EFE9', '#1C1C1C', '#808080', '#1C3144'],
    features: ['Heavyweight fleece', 'Double-needle stitching', 'Pouch pocket', 'Ribbed cuffs']
  },
  {
    id: 'kids_tshirts',
    name: 'Kids Organic Tees',
    description: 'Super-soft combed cotton shirts for children, hypoallergenic and durable.',
    basePrice: '₹299',
    images: ['/images/kids_tshirt_1.jpg', '/images/kids_tshirt_2.jpg'],
    labels: ['Outdoor Play', 'Studio Portrait'],
    sizes: ['2T', '3T', '4T', '5-6Y', '7-8Y'],
    colors: ['#E2ECE9', '#FBEAE6', '#E6EEFA', '#FFF6E2'],
    features: ['Organic combed cotton', 'Hypoallergenic dyes', 'Double-stitched hems', 'Pre-shrunk']
  },
  {
    id: 'poster_frames',
    name: 'Posters & Frames',
    description: 'Premium museum-grade paper posters with solid wood custom frames.',
    basePrice: '₹399',
    images: [
      '/images/fulfillment/framed_poster_1.jpg',
      '/images/fulfillment/framed_poster_2.jpg',
      '/images/fulfillment/framed_poster_3.jpg',
      '/images/fulfillment/framed_poster_4.jpg',
      '/images/fulfillment/framed_poster_5.jpg',
      '/images/fulfillment/framed_poster_6.jpg'
    ],
    labels: ['Frame 1', 'Frame 2', 'Frame 3', 'Frame 4', 'Frame 5', 'Frame 6'],
    sizes: ['8"x10"', '12"x16"', '18"x24"', '24"x36"'],
    colors: ['#F5F5F5', '#F5E3D7', '#FFFFFF', '#0A0A0A'],
    features: ['Museum-grade paper', 'Archival ink', 'Solid wood frame', 'Ready to hang']
  }
]

const CAROUSEL_CATEGORIES = [
  { id: 'tshirts', name: 'T-shirts', icon: '👕', color: '#E0F2FE', textColor: '#0369A1' },
  { id: 'sweatshirts', name: 'Sweatshirt', icon: '🧥', color: '#EEF2F6', textColor: '#1E3A8A' },
  { id: 'mugs', name: 'Mugs', icon: '☕', color: '#F3F4F6', textColor: '#374151' },
  { id: 'hoodies', name: 'Hoodie', icon: '🧥', color: '#DCFCE7', textColor: '#15803D' },
  { id: 'kids', name: 'Kids clothing', icon: '👶', color: '#FEF9C3', textColor: '#A16207' },
  { id: 'stickers', name: 'Stickers', icon: '🏷️', color: '#FCE7F3', textColor: '#BE185D' },
  { id: 'phonecases', name: 'Phone cases', icon: '📱', color: '#E0F2FE', textColor: '#0369A1' },
  { id: 'caps', name: 'Custom Caps', icon: '🧢', color: '#F3E8FF', textColor: '#6B21A8' },
  { id: 'posters', name: 'Wall Posters', icon: '🖼️', color: '#FFF7ED', textColor: '#C2410C' },
]

const LOOKBOOK_IMAGES = [
  { src: '/images/fulfillment/cap_embroidered.jpg', tag: 'Custom Cap' },
  { src: '/images/fulfillment/pet_tee_frenchie_1.jpg', tag: 'Pet Apparel' },
  { src: '/images/fulfillment/framed_poster_1.jpg', tag: 'Poster Frame' },
  { src: '/images/fulfillment/tee_back_flirt.jpg', tag: 'Fear Women' },
  { src: '/images/fulfillment/cap_embroidered_2.jpg', tag: 'Custom Cap' },
  { src: '/images/fulfillment/pet_tee_frenchie_2.jpg', tag: 'Pet Apparel' },
  { src: '/images/fulfillment/framed_poster_2.jpg', tag: 'Poster Frame' },
  { src: '/images/fulfillment/tee_back_playlist.jpg', tag: 'Send Playlist' },
  { src: '/images/fulfillment/framed_poster_3.jpg', tag: 'Poster Frame' },
  { src: '/images/fulfillment/framed_poster_4.jpg', tag: 'Poster Frame' },
  { src: '/images/fulfillment/tee_back_drink.jpg', tag: 'Done Drinking' },
  { src: '/images/fulfillment/framed_poster_5.jpg', tag: 'Poster Frame' },
  { src: '/images/fulfillment/framed_poster_6.jpg', tag: 'Poster Frame' },
  { src: '/images/fulfillment/pet_tee_frenchie_3.jpg', tag: 'Pet Apparel' },
  { src: '/images/fulfillment/tee_back_bull.jpg', tag: 'Red Flags' }
]

const STEPS = [
  { num: '01', title: 'Choose Products', desc: 'Select blank garment fits, hats, or posters from our catalog.' },
  { num: '02', title: 'Upload Completed Designs', desc: 'Upload your finished graphic design print files. We do not design for you—we print what you send.' },
  { num: '03', title: 'Connect Your Store', desc: 'Sync with your Shopify store instantly. Customer orders flow directly into our printing queue.' },
  { num: '04', title: 'We Print & Ship', desc: 'Our factory prints the exact file, packs, and ships to the customer under your brand.' },
]

const TESTIMONIALS = [
  { quote: "The pet t-shirts became our store's best seller overnight. Printing resolution on fabric is outstanding.", name: 'Ananya R.', role: 'Founder, PawStyle Apparel' },
  { quote: 'Switched from Printify to No Limits Studio because of the lower base costs and faster shipping times in the region.', name: 'Rohit M.', role: 'CEO, Northline Streetwear' },
  { quote: 'Excellent poster frame quality. The solid wood feel and archival inks get regular praise from our art buyers.', name: 'Kavya S.', role: 'Creative Director, Palette & Frame' },
]

const PRICING = [
  { name: 'Free Starter', price: '₹0', period: '/forever', tag: 'Great for beginners', features: ['1 connected store', 'Full access to mockups', 'Manual order fulfillment', 'Standard email support'] },
  { name: 'Growth Pro', price: '₹1,999', period: '/mo', tag: 'Most Popular', features: ['3 connected stores', 'Automatic order syncing', 'Premium custom mockups', 'Up to 20% discount on base prices', '24/7 priority chat support'] },
  { name: 'Enterprise', price: '₹5,499', period: '/mo', tag: 'For scaling brands', features: ['Unlimited stores', 'Dedicated account manager', 'Custom white-label packaging inserts', 'Custom product sourcing APIs', 'Bulk order discounts'] },
]

const CUSTOMIZER_PRODUCTS = [
  {
    id: 'tshirt',
    name: 'T-Shirts',
    bgColor: '#FF9E3D', // Orange
    stickerEmoji: '☀️',
    stickerText1: 'Go With',
    stickerText2: 'The Flow',
    modelImg: '/images/tshirt_1.jpg',
    designOverlay: (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <span style={{ fontSize: '32px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }}>☀️</span>
        <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 900, fontSize: '11px', textTransform: 'uppercase', color: '#172B15', lineHeight: 1.0 }}>Go With<br />The Flow</span>
      </div>
    ),
    designTop: '47%',
    designLeft: '52%',
    designScale: 'scale(0.7)',
    svgPath: "M 30,12 L 42,7 C 45,10 55,10 58,7 L 70,12 L 82,24 L 72,32 L 69,29 L 69,92 L 31,92 L 31,29 L 28,32 L 18,24 Z"
  },
  {
    id: 'hoodie',
    name: 'Hoodies',
    bgColor: '#3D9BFF', // Blue
    stickerEmoji: '🧑‍🚀',
    stickerText1: 'Space',
    stickerText2: 'Explorer',
    modelImg: '/images/hoodie_1.jpg',
    designOverlay: (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <span style={{ fontSize: '32px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }}>🧑‍🚀</span>
        <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 900, fontSize: '10px', textTransform: 'uppercase', color: '#172B15', lineHeight: 1.0 }}>Space<br />Explorer</span>
      </div>
    ),
    designTop: '42%',
    designLeft: '51%',
    designScale: 'scale(0.65)',
    svgPath: "M 30,18 L 38,10 L 42,14 L 58,14 L 62,10 L 70,18 L 80,32 L 70,38 L 68,36 L 68,90 C 68,92 32,92 32,90 L 32,36 L 30,38 L 20,32 Z M 40,14 C 40,8 60,8 60,14 Z"
  },
  {
    id: 'pet_tshirt',
    name: 'Pet Shirts',
    bgColor: '#4ADE80', // Green
    stickerEmoji: '🐾',
    stickerText1: 'Bark',
    stickerText2: 'Squad',
    modelImg: '/images/pet_tshirt_1.jpg',
    designOverlay: (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <span style={{ fontSize: '32px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }}>🐾</span>
        <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 900, fontSize: '11px', textTransform: 'uppercase', color: '#172B15', lineHeight: 1.0 }}>Bark<br />Squad</span>
      </div>
    ),
    designTop: '50%',
    designLeft: '50%',
    designScale: 'scale(0.75)',
    svgPath: "M 32,15 L 42,10 C 45,13 55,13 58,10 L 68,15 L 75,28 L 66,33 L 64,31 L 64,80 C 64,82 36,82 36,80 L 36,31 L 34,33 L 25,28 Z"
  }
]

function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
      <img 
        src="/images/logo.jpeg" 
        alt="No Limits Studio" 
        style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} 
      />
      <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '18px', color: '#172B15', letterSpacing: '-0.5px' }}>
        No Limits Studio
      </span>
    </div>
  )
}

const HomePage = () => {
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()

  // Intro Splash Loader states
  const [showSplash, setShowSplash] = useState(true)
  const [splashFade, setSplashFade] = useState(false)

  // Track the active image index (0 or 1) for each product ID
  const [imageIndices, setImageIndices] = useState({
    tshirts: 0,
    pet_tshirts: 0,
    hoodies: 0,
    kids_tshirts: 0,
    poster_frames: 0
  })

  const [activeProd, setActiveProd] = useState(0)
  const [animStep, setAnimStep] = useState(0)

  // Splash Curtain effect timer
  useEffect(() => {
    const fadeTimer = setTimeout(() => setSplashFade(true), 1200)
    const removeTimer = setTimeout(() => setShowSplash(false), 2000)
    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(removeTimer)
    }
  }, [])

  // Auto-run the schematic mockup customizer animation loop
  useEffect(() => {
    const timer = setInterval(() => {
      setAnimStep(prev => {
        if (prev === 2) {
          // Once the drop is finished, cycle to the next product and reset step
          setActiveProd(p => (p + 1) % CUSTOMIZER_PRODUCTS.length)
          return 0
        }
        return prev + 1
      })
    }, 2000) // 2s per stage (6s total per product)
    return () => clearInterval(timer)
  }, [])

  // Toggle active image index for a product card
  const toggleProductImage = (productId, index) => {
    setImageIndices(prev => ({
      ...prev,
      [productId]: index
    }))
  }

  // Bestseller slider offset & hotspot hover state
  const [slideOffset, setSlideOffset] = useState(0)
  const [hoveredHotspot, setHoveredHotspot] = useState(null)
  const [visibleLookbook, setVisibleLookbook] = useState(8)

  const handlePrevSlide = () => {
    setSlideOffset(prev => Math.max(prev - 320, 0))
  }
  const handleNextSlide = () => {
    setSlideOffset(prev => Math.min(prev + 320, 480))
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAFA', fontFamily: 'Inter, sans-serif', color: '#172B15' }}>
      <style>{`
        .pf-scroll-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      
      {/* Premium Cinematic Curtain Intro Loader */}
      {showSplash && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: '#172B15',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          transform: splashFade ? 'translateY(-100%)' : 'translateY(0)',
          transition: 'transform 0.85s cubic-bezier(0.85, 0, 0.15, 1)',
          pointerEvents: 'none'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px',
            opacity: splashFade ? 0 : 1,
            transform: splashFade ? 'scale(0.95)' : 'scale(1)',
            transition: 'all 0.4s ease'
          }}>
            {/* Spinning & Pulse Glow Logo */}
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              overflow: 'hidden',
              boxShadow: '0 0 40px rgba(185,249,93,0.3)',
              animation: 'pf-loader-spin 1.8s cubic-bezier(0.68, -0.6, 0.32, 1.6) infinite'
            }}>
              <img src="/images/logo.jpeg" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>

            {/* Glowing Text */}
            <h2 style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              color: '#FFFFFF',
              fontSize: '24px',
              fontWeight: 800,
              letterSpacing: '-0.5px'
            }}>
              No Limits Studio
            </h2>
          </div>
        </div>
      )}

      {/* Premium Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid #E4E4E7',
      }}>
        <div style={{
          maxWidth: '1200px', margin: '0 auto',
          padding: '0 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: '68px',
        }}>
          <Logo />

          <nav style={{ display: 'flex', alignItems: 'center', gap: '32px' }} className="pf-nav-links">
            {['Catalog', 'Pricing', 'How It Works'].map(l => (
              <a key={l} href={`#${l.toLowerCase().replace(/\s+/g, '-')}`} style={{ 
                fontSize: '14px', 
                color: '#3F3F46', 
                textDecoration: 'none', 
                fontWeight: 600,
                transition: 'color 0.2s' 
              }}
              onMouseOver={e => e.currentTarget.style.color = '#39B54A'}
              onMouseOut={e => e.currentTarget.style.color = '#3F3F46'}
              >{l}</a>
            ))}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {currentUser ? (
              <>
                <span style={{ fontSize: '13px', color: '#71717A', marginRight: '6px' }} className="pf-hide-mobile">
                  {currentUser.email}
                </span>
                <button
                  onClick={() => navigate('/dashboard')}
                  style={{
                    background: '#B9F95D', color: '#172B15',
                    border: 'none', borderRadius: '10px',
                    padding: '10px 20px', fontSize: '13px', fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 12px rgba(185,249,93,0.2)',
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(185,249,93,0.3)';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(185,249,93,0.2)';
                  }}
                >
                  My Store
                </button>
                <button
                  onClick={logout}
                  style={{
                    background: 'transparent', color: '#71717A',
                    border: '1px solid #E4E4E7', borderRadius: '10px',
                    padding: '10px 16px', fontSize: '13px', fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    transition: 'all 0.2s',
                  }}
                  onMouseOver={e => { 
                    e.currentTarget.style.borderColor = '#A1A1AA'; 
                    e.currentTarget.style.color = '#172B15' 
                  }}
                  onMouseOut={e => { 
                    e.currentTarget.style.borderColor = '#E4E4E7'; 
                    e.currentTarget.style.color = '#71717A' 
                  }}
                >
                  Sign out
                </button>
              </>
            ) : (
              <button
                onClick={() => navigate('/auth')}
                style={{
                  background: '#B9F95D', color: '#172B15',
                  border: 'none', borderRadius: '10px',
                  padding: '10px 20px', fontSize: '13px', fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 12px rgba(185,249,93,0.2)',
                }}
                onMouseOver={e => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(185,249,93,0.3)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(185,249,93,0.2)';
                }}
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>

        {/* Printify-Style Centered Hero Section */}
        <section style={{ padding: '80px 0 60px', textAlign: 'center' }}>
          
          {/* Main Headline */}
          <h1 style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 'clamp(44px, 6vw, 76px)',
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: '-2.5px',
            color: '#172B15',
            marginBottom: '24px',
            textTransform: 'uppercase',
            animation: 'pf-fade-in-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}>
            We print your orders.<br />Fulfillment automated.
          </h1>

          {/* Centered Checkmarks Row */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '32px',
            marginBottom: '36px',
            flexWrap: 'wrap',
            animation: 'pf-fade-in-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.15s forwards',
            opacity: 0
          }}>
            {[
              '100% Free to use',
              '1000+ Premium items',
              'Global fulfillment shipping'
            ].map((check, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', color: '#172B15', fontWeight: 600 }}>
                <span style={{ color: '#39B54A', fontWeight: 'bold', fontSize: '18px' }}>✓</span>
                <span>{check}</span>
              </div>
            ))}
          </div>

          {/* Centered Lime green CTA Button */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '64px',
            animation: 'pf-fade-in-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards',
            opacity: 0
          }}>
            <a href="#shopify-connect" style={{
              display: 'inline-block',
              background: '#B9F95D',
              color: '#172B15',
              padding: '16px 36px',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: 700,
              textDecoration: 'none',
              boxShadow: '0 8px 24px rgba(185,249,93,0.25)',
              transition: 'all 0.2s',
            }}
            onMouseOver={e => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(185,249,93,0.35)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(185,249,93,0.25)';
            }}
            >
              Get started for free
            </a>
            <span style={{ fontSize: '12px', color: '#71717A', fontWeight: 500 }}>
              No credit card required
            </span>
          </div>

          {/* Double Mockup Showcase Card Section (Schematic & Lifestyle Animation) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1.15fr',
            gap: '32px',
            maxWidth: '1000px',
            margin: '0 auto 64px',
            animation: 'pf-fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.4s forwards',
            opacity: 0
          }} className="pf-hero-grid">
            
            {/* Card 1: Schematic Vector mockup with Lottie-style guide lines, success ripples & sparks */}
            {/* Elegant Copywriting & Features Column */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'center', 
              paddingRight: '16px',
              textAlign: 'left'
            }}>
              <div style={{ fontSize: '12px', fontWeight: 750, color: '#39B54A', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '14px' }}>
                Fulfillment Automation
              </div>
              <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '32px', fontWeight: 800, color: '#172B15', letterSpacing: '-0.8px', lineHeight: 1.25, marginBottom: '18px' }}>
                Your store orders, fulfilled automatically
              </h3>
              <p style={{ fontSize: '15px', color: '#52525B', lineHeight: 1.6, marginBottom: '28px' }}>
                We act as the invisible backend for your brand. Once a customer orders from your Shopify store, our factory instantly prints, pack-slips, and ships directly to their doorstep. 
              </p>
              
              {/* Key points with subtle checkmarks */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {[
                  { title: 'Zero Manual Intervention', desc: 'Orders sync, print, and ship with no clicks needed.' },
                  { title: 'White-Label Branding', desc: 'Shipped under your shop name with custom packing slips.' },
                  { title: 'Factory Direct Sourcing', desc: 'No middleman markups, securing maximum merchant margins.' }
                ].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <span style={{ color: '#39B54A', fontWeight: 'bold', fontSize: '16px', lineHeight: 1.1 }}>✓</span>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#172B15' }}>{item.title}</div>
                      <div style={{ fontSize: '12.5px', color: '#71717A', marginTop: '2px', lineHeight: 1.4 }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 2: Lifestyle Model Photo Showcase (Cross-fades different products) */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: '24px',
              aspectRatio: '1.15',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.05)',
              border: '1px solid #E4E4E7'
            }}>
              {CUSTOMIZER_PRODUCTS.map((p, idx) => (
                <div
                  key={p.id}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: activeProd === idx ? 1 : 0,
                    transition: 'opacity 0.6s ease-in-out',
                    pointerEvents: activeProd === idx ? 'auto' : 'none'
                  }}
                >
                  {/* White mockup t-shirt photo */}
                  <img 
                    src={p.modelImg} 
                    alt={p.name} 
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />

                  {/* Floating applied design on model chest (fades in cleanly at animStep >= 1) */}
                  <div style={{
                    position: 'absolute',
                    top: p.designTop,
                    left: p.designLeft,
                    transform: `translate(-50%, -50%) ${p.designScale}`,
                    pointerEvents: 'none',
                    opacity: animStep >= 1 ? 0.85 : 0,
                    transition: 'opacity 0.6s ease-in-out',
                  }}>
                    {p.designOverlay}
                  </div>
                </div>
              ))}

              {/* Clean category label */}
              <div style={{
                position: 'absolute',
                top: '16px',
                left: '16px',
                background: 'rgba(255, 255, 255, 0.85)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid #E4E4E7',
                padding: '5px 12px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 700,
                color: '#172B15',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                zIndex: 20
              }}>
                <span style={{ color: '#39B54A' }}>✦</span> Live Mockup Preview
              </div>
            </div>
          </div>

          {/* Connection Input Box underneath */}
          <div id="shopify-connect" style={{
            background: '#111A13', // Carbon dark green
            border: '1.5px solid rgba(185, 249, 93, 0.15)',
            borderRadius: '24px',
            padding: '36px 32px',
            boxShadow: '0 25px 50px -12px rgba(9, 26, 14, 0.5), 0 0 40px rgba(185, 249, 93, 0.04)',
            maxWidth: '560px',
            margin: '0 auto 64px',
            animation: 'pf-fade-in-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.5s forwards',
            opacity: 0,
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Ambient background glow */}
            <div style={{
              position: 'absolute',
              top: '-50%',
              right: '-50%',
              width: '100%',
              height: '100%',
              background: 'radial-gradient(circle, rgba(185,249,93,0.06) 0%, transparent 60%)',
              pointerEvents: 'none'
            }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px', textAlign: 'left', position: 'relative', zIndex: 1 }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '14px',
                background: 'rgba(185,249,93,0.08)',
                border: '1px solid rgba(185,249,93,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '22px', boxShadow: '0 0 15px rgba(185,249,93,0.1)'
              }}>
                🔌
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.3px' }}>
                  Shopify Store Integration
                </h3>
                <p style={{ fontSize: '13px', color: '#889B8E', marginTop: '2px', lineHeight: 1.4 }}>
                  Connect your store to sync products and fulfill orders automatically.
                </p>
              </div>
            </div>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <StoreConnectForm />
            </div>
          </div>
        </section>

        {/* Stats Bar */}
        <section style={{ padding: '48px 0 64px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '1px',
            background: '#E4E4E7',
            borderRadius: '20px',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0,0,0,0.01)',
            border: '1px solid #E4E4E7'
          }} className="pf-product-grid">
            {STATS.map((s, i) => (
              <div key={i} style={{ background: '#FFFFFF', padding: '24px 32px', textAlign: 'left' }}>
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '32px', color: '#39B54A', marginBottom: '4px' }}>
                  {s.value}
                </div>
                <div style={{ fontSize: '14px', color: '#18181B', fontWeight: 700, marginBottom: '2px' }}>{s.label}</div>
                <div style={{ fontSize: '12px', color: '#71717A', fontWeight: 400 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Catalog Showcase Section */}
        <section id="catalog" style={{ padding: '40px 0 80px' }}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#39B54A', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>
              Explore Our Premium Catalog
            </div>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '38px', fontWeight: 800, color: '#172B15', letterSpacing: '-1px', marginBottom: '14px' }}>
              Designed to print, made to wear
            </h2>
            <p style={{ fontSize: '15px', color: '#52525B', maxWidth: '520px', margin: '0 auto' }}>
              Sell premium custom apparel. Click the photo swappers below to preview the multiple high-fidelity mockups generated for each product.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '28px' }} className="pf-product-grid">
            {PRODUCTS.map((p) => {
              const activeIndex = imageIndices[p.id] ?? 0
              return (
                <div
                  key={p.id}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E4E4E7',
                    borderRadius: '20px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                  }}
                  className="pf-product-card"
                >


                  {/* Product Mockup Image Frame */}
                  <div style={{
                    width: '100%',
                    aspectRatio: '1',
                    borderRadius: '12px',
                    background: '#F4F4F5',
                    overflow: 'hidden',
                    position: 'relative',
                    marginBottom: '18px',
                    border: '1px solid #E4E4E7'
                  }}>
                    <img
                      src={p.images[activeIndex]}
                      alt={p.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transition: 'transform 0.5s ease',
                      }}
                      className="pf-card-img"
                    />

                    {/* Quick switch mockup badges */}
                    <div 
                      className="pf-scroll-hide"
                      style={{
                        position: 'absolute',
                        bottom: '12px',
                        left: '12px',
                        right: '12px',
                        display: 'flex',
                        gap: '6px',
                        overflowX: 'auto',
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                        padding: '4px 0',
                        justifyContent: 'flex-start',
                        zIndex: 10
                      }}
                    >
                      {p.images.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => toggleProductImage(p.id, idx)}
                          style={{
                            flexShrink: 0,
                            background: activeIndex === idx ? '#39B54A' : 'rgba(255, 255, 255, 0.9)',
                            color: activeIndex === idx ? 'white' : '#172B15',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                            textAlign: 'center',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {p.labels[idx]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Title and details */}
                  <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '18px', fontWeight: 800, color: '#172B15', marginBottom: '6px' }}>
                    {p.name}
                  </h3>
                  <p style={{ fontSize: '13px', color: '#52525B', lineHeight: 1.5, marginBottom: '16px', flex: 1 }}>
                    {p.description}
                  </p>

                  {/* Details pill row */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
                    {p.features.slice(0, 3).map((f, idx) => (
                      <span key={idx} style={{ fontSize: '11px', color: '#71717A', background: '#F4F4F5', padding: '3px 8px', borderRadius: '6px', fontWeight: 500 }}>
                        {f}
                      </span>
                    ))}
                  </div>

                  {/* Product Footer / Designing triggers */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #F4F4F5', paddingTop: '16px' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {p.colors.map(col => (
                        <span key={col} style={{ width: '10px', height: '10px', borderRadius: '50%', background: col, border: '1px solid #D4D4D8' }} />
                      ))}
                    </div>
                    <a
                      href="#shopify-connect"
                      style={{
                        fontSize: '13px',
                        color: '#39B54A',
                        fontWeight: 600,
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'color 0.2s'
                      }}
                      onMouseOver={e => e.currentTarget.style.color = '#2e8c39'}
                      onMouseOut={e => e.currentTarget.style.color = '#39B54A'}
                    >
                      Fulfill with us →
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Factory Print Lookbook Showcase Gallery */}
        <section id="lookbook" style={{ padding: '20px 0 80px' }}>
          <div style={{ textAlign: 'center', marginBottom: '44px' }}>
            <div style={{ fontSize: '12.5px', fontWeight: 750, color: '#39B54A', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px' }}>
              Factory Production Lookbook
            </div>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '36px', fontWeight: 800, color: '#172B15', letterSpacing: '-1px', marginBottom: '12px' }}>
              Real print quality on real bases
            </h2>
            <p style={{ fontSize: '14.5px', color: '#71717A', maxWidth: '560px', margin: '0 auto' }}>
              Review our direct factory manufacturing output across caps, model apparel back-prints, slogan dog tees, and framed posters.
            </p>
          </div>

          {/* Grid showing images */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '40px' }} className="pf-product-grid">
            {LOOKBOOK_IMAGES.slice(0, visibleLookbook).map((img, idx) => (
              <div 
                key={idx} 
                style={{
                  position: 'relative', borderRadius: '16px', overflow: 'hidden',
                  border: '1px solid #E4E4E7', aspectRatio: '1', cursor: 'pointer',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.015)', transition: 'all 0.3s ease'
                }}
                className="pf-lookbook-tile"
                onMouseOver={e => {
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.08)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.015)';
                }}
              >
                <img 
                  src={img.src} 
                  alt={img.tag} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
                
                {/* Floating Tag */}
                <div style={{
                  position: 'absolute', bottom: '12px', left: '12px',
                  background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)',
                  padding: '4px 10px', borderRadius: '6px', fontSize: '10.5px',
                  fontWeight: 750, color: '#172B15', border: '1px solid #E4E4E7'
                }}>
                  {img.tag}
                </div>
              </div>
            ))}
          </div>

          {/* Load More Button */}
          {visibleLookbook < LOOKBOOK_IMAGES.length && (
            <div style={{ textAlign: 'center' }}>
              <button
                onClick={() => setVisibleLookbook(prev => Math.min(prev + 8, LOOKBOOK_IMAGES.length))}
                style={{
                  background: '#FFFFFF', border: '1px solid #E4E4E7', borderRadius: '12px',
                  padding: '12px 28px', fontSize: '13px', fontWeight: 700, color: '#172B15',
                  cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all 0.2s',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
                }}
                onMouseOver={e => {
                  e.currentTarget.style.background = '#FAFAFA';
                  e.currentTarget.style.borderColor = '#39B54A';
                  e.currentTarget.style.color = '#39B54A';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.background = '#FFFFFF';
                  e.currentTarget.style.borderColor = '#E4E4E7';
                  e.currentTarget.style.color = '#172B15';
                }}
              >
                Show More Mockups ({LOOKBOOK_IMAGES.length - visibleLookbook} remaining)
              </button>
            </div>
          )}
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" style={{ padding: '60px 0 80px' }}>
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E4E4E7',
            borderRadius: '24px',
            padding: '56px 40px',
            boxShadow: '0 4px 30px rgba(0,0,0,0.01)',
          }}>
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#39B54A', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>
                Simple 4-Step Process
              </div>
              <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '32px', fontWeight: 800, color: '#172B15', letterSpacing: '-0.5px' }}>
                How No Limits Studio works
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }} className="pf-product-grid">
              {STEPS.map((s, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  {/* Step numbering */}
                  <div style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: '48px',
                    fontWeight: 800,
                    color: '#E1F5FE',
                    background: 'linear-gradient(180deg, rgba(57,181,74,0.12) 0%, transparent 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    lineHeight: 1,
                    marginBottom: '8px'
                  }}>
                    {s.num}
                  </div>
                  <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '16px', fontWeight: 700, color: '#172B15', marginBottom: '8px' }}>
                    {s.title}
                  </h3>
                  <p style={{ fontSize: '13px', color: '#52525B', lineHeight: 1.6 }}>
                    {s.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features & Benefits grid */}
        <section id="features" style={{ padding: '40px 0 80px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }} className="pf-product-grid">
            {FEATURES.map((f, i) => (
              <div key={i} style={{
                background: '#FFFFFF',
                border: '1px solid #E4E4E7',
                borderRadius: '16px',
                padding: '32px',
                transition: 'transform 0.2s',
              }}
              onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div style={{
                  width: '48px', height: '48px',
                  background: '#E6F4EA', border: '1px solid rgba(57,181,74,0.1)',
                  borderRadius: '12px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '24px', marginBottom: '24px',
                }}>{f.icon}</div>
                <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '18px', fontWeight: 700, color: '#172B15', marginBottom: '10px' }}>
                  {f.title}
                </h3>
                <p style={{ fontSize: '14px', color: '#52525B', lineHeight: 1.6 }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Customer Testimonials */}
        <section style={{ padding: '40px 0 80px' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '32px', fontWeight: 800, color: '#172B15', letterSpacing: '-0.5px' }}>
              Trusted by 10,000+ store owners
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }} className="pf-product-grid">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} style={{
                background: '#FFFFFF', border: '1px solid #E4E4E7', borderRadius: '16px',
                padding: '28px', display: 'flex', flexDirection: 'column',
              }}>
                <div style={{ display: 'flex', gap: '2px', color: '#F59E0B', fontSize: '14px', marginBottom: '14px' }}>
                  {['★','★','★','★','★'].map((star, sIdx) => <span key={sIdx}>{star}</span>)}
                </div>
                <p style={{ fontSize: '14px', color: '#27272A', lineHeight: 1.6, marginBottom: '20px', flex: 1, fontStyle: 'italic' }}>
                  "{t.quote}"
                </p>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#172B15' }}>{t.name}</div>
                  <div style={{ fontSize: '12px', color: '#71717A' }}>{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing preview section */}
        <section id="pricing" style={{ padding: '40px 0 80px' }}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#39B54A', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>
              Flexible Printing Subscriptions
            </div>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '32px', fontWeight: 800, color: '#172B15', letterSpacing: '-0.5px', marginBottom: '12px' }}>
              Simple, transparent pricing plans
            </h2>
            <p style={{ fontSize: '14px', color: '#52525B' }}>No hidden manufacturing setup fees. Scale as you sell.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }} className="pf-product-grid">
            {PRICING.map((p, i) => (
              <div key={i} style={{
                background: '#FFFFFF',
                border: p.name.includes('Growth') ? '2px solid #39B54A' : '1px solid #E4E4E7',
                borderRadius: '20px', padding: '32px', position: 'relative',
                boxShadow: p.name.includes('Growth') ? '0 10px 30px rgba(57,181,74,0.08)' : 'none',
              }}>
                {p.name.includes('Growth') && (
                  <div style={{
                    position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)',
                    background: '#39B54A', color: 'white', fontSize: '11px', fontWeight: 700,
                    letterSpacing: '0.05em', padding: '3px 12px', borderRadius: '100px', whiteSpace: 'nowrap',
                    textTransform: 'uppercase'
                  }}>{p.tag}</div>
                )}
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#71717A', marginBottom: '10px' }}>{p.name}</div>
                <div style={{ marginBottom: '20px' }}>
                  <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '36px', fontWeight: 800, color: '#172B15' }}>{p.price}</span>
                  <span style={{ fontSize: '14px', color: '#71717A', fontWeight: 500 }}>{p.period}</span>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                  {p.features.map((f, j) => (
                    <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <span style={{ color: '#39B54A', fontSize: '13px', fontWeight: 'bold', marginTop: '2px' }}>✓</span>
                      <span style={{ fontSize: '13px', color: '#3F3F46', lineHeight: 1.4 }}>{f}</span>
                    </div>
                  ))}
                </div>

                <a
                  href="#shopify-connect"
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    background: p.name.includes('Growth') ? '#B9F95D' : '#FFFFFF',
                    color: '#172B15',
                    border: '1px solid',
                    borderColor: p.name.includes('Growth') ? '#B9F95D' : '#D4D4D8',
                    padding: '12px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 700,
                    textDecoration: 'none',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={e => {
                    if (p.name.includes('Growth')) {
                      e.currentTarget.style.opacity = '0.9';
                    } else {
                      e.currentTarget.style.borderColor = '#172B15';
                      e.currentTarget.style.background = '#F4F4F5';
                    }
                  }}
                  onMouseOut={e => {
                    if (p.name.includes('Growth')) {
                      e.currentTarget.style.opacity = '1';
                    } else {
                      e.currentTarget.style.borderColor = '#D4D4D8';
                      e.currentTarget.style.background = '#FFFFFF';
                    }
                  }}
                >
                  Start free trial
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* About this app */}
        <section id="about" style={{ padding: '20px 0 60px' }}>
          <div style={{
            background: '#FFFFFF', border: '1px solid #E4E4E7', borderRadius: '20px',
            padding: '40px', maxWidth: '760px', margin: '0 auto',
          }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#39B54A', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>
              About This App
            </div>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '24px', fontWeight: 800, color: '#09090B', marginBottom: '16px' }}>
              What No Limits Studio does
            </h2>
            <p style={{ fontSize: '14px', color: '#3F3F46', lineHeight: 1.7, marginBottom: '16px' }}>
              No Limits Studio is a print-on-demand fulfillment app for Shopify merchants. Once you connect your
              Shopify store, we automatically receive your orders, print and manufacture the products (t-shirts,
              hoodies, kids apparel, pet apparel, and framed posters), and ship them directly to your customers
              under your own brand — with no inventory required on your end.
            </p>
            <p style={{ fontSize: '14px', color: '#3F3F46', lineHeight: 1.7, marginBottom: '20px' }}>
              To do this, the app requests access to your Shopify store's <strong>orders</strong> (to know what to
              fulfill and ship) and <strong>products</strong> (to let you map your catalog to our print-ready
              items). We do not access customer payment information, and we never sell your data. See our{' '}
              <a href="/privacy" style={{ color: '#39B54A', fontWeight: 600 }}>Privacy Policy</a> for full details.
            </p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {['read_orders', 'write_orders', 'read_products', 'read_fulfillments', 'write_fulfillments'].map(scope => (
                <span key={scope} style={{ fontSize: '11px', fontWeight: 600, color: '#166534', background: '#DCFCE7', padding: '4px 10px', borderRadius: '6px', fontFamily: 'monospace' }}>
                  {scope}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* CTA banner */}
        <section style={{ padding: '40px 0 80px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #172B15 0%, #244221 100%)',
            borderRadius: '24px', padding: '64px 48px',
            textAlign: 'center', position: 'relative', overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
          }}>
            <div style={{ position: 'absolute', top: '-120px', right: '-60px', width: '320px', height: '320px', background: 'radial-gradient(circle, rgba(185,249,93,0.15) 0%, transparent 70%)' }} />
            <div style={{ position: 'absolute', bottom: '-120px', left: '-60px', width: '320px', height: '320px', background: 'radial-gradient(circle, rgba(185,249,93,0.1) 0%, transparent 70%)' }} />
            
            <h2 style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(28px, 4.5vw, 40px)', fontWeight: 800,
              color: 'white', letterSpacing: '-1px', marginBottom: '16px', position: 'relative',
              lineHeight: 1.15
            }}>
              Ready to sell custom clothing<br />without inventory limits?
            </h2>
            <p style={{ fontSize: '15px', color: '#E4E4E7', marginBottom: '32px', position: 'relative', maxWidth: '520px', margin: '0 auto 32px' }}>
              Sync your Shopify store, choose your products, and start automating your fulfillment in under 5 minutes.
            </p>
            <a href="#shopify-connect" style={{
              display: 'inline-block', background: '#B9F95D', color: '#172B15',
              padding: '14px 32px', borderRadius: '12px', fontSize: '14px', fontWeight: 700,
              textDecoration: 'none', position: 'relative',
              boxShadow: '0 4px 14px rgba(185,249,93,0.25)',
              transition: 'all 0.2s'
            }}
            onMouseOver={e => {
              e.currentTarget.style.opacity = '0.9';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            >
              Connect My Store & Start Free →
            </a>
          </div>
        </section>
      </main>

      {/* Premium Footer */}
      <footer style={{ background: '#172B15', borderTop: '1px solid #244221', padding: '64px 24px 32px', color: '#A1A1AA' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: '48px', marginBottom: '48px' }} className="pf-footer-grid">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '16px' }}>
                <img 
                  src="/images/logo.jpeg" 
                  alt="No Limits Studio" 
                  style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover' }} 
                />
                <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '18px', color: 'white', letterSpacing: '-0.5px' }}>
                  No Limits Studio
                </span>
              </div>
              <p style={{ fontSize: '13px', color: '#A1A1AA', lineHeight: 1.6, maxWidth: '240px' }}>
                Premium global print-on-demand platform for Shopify merchants. Design clothes, pet tees, kids shirts, and framed poster art.
              </p>
            </div>
            {[
              { title: 'Products', links: ['T-Shirts & Tees', 'Pet Hoodies & Shirts', 'Streetwear Hoodies', 'Kids Collections', 'Posters & Frame Art'] },
              { title: 'Integrations', links: ['Shopify Store Sync', 'Custom API Access', 'Fulfillment Services', 'Merchant Tools'] },
              { title: 'Support', links: ['Help Center', 'Shipping Rates', 'Archival Printing FAQ', 'Contact Sales'] },
            ].map(col => (
              <div key={col.title}>
                <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'white', marginBottom: '18px' }}>{col.title}</div>
                {col.links.map(l => (
                  <div key={l} style={{ marginBottom: '11px' }}>
                    <a href="#" style={{ fontSize: '13px', color: '#A1A1AA', textDecoration: 'none', transition: 'color 0.2s' }}
                    onMouseOver={e => e.currentTarget.style.color = '#B9F95D'}
                    onMouseOut={e => e.currentTarget.style.color = '#A1A1AA'}
                    >{l}</a>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid #244221', paddingTop: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
            <p style={{ fontSize: '12px', color: '#A1A1AA' }}>
              © 2026 No Limits Studio. All rights reserved. Made for e-commerce builders.
            </p>
            <div style={{ display: 'flex', gap: '20px' }}>
              {['Terms of Service', 'Privacy Policy', 'Sitemap'].map(l => (
                <a key={l} href="#" style={{ fontSize: '12px', color: '#A1A1AA', textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseOver={e => e.currentTarget.style.color = '#B9F95D'}
                onMouseOut={e => e.currentTarget.style.color = '#A1A1AA'}
                >{l}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* Global CSS for grids, hover effects, animations, and keyframes */}
      <style>{`
        .pf-product-card:hover {
          border-color: #39B54A !important;
          box-shadow: 0 10px 30px rgba(57,181,74,0.06) !important;
          transform: translateY(-4px);
        }
        .pf-product-card:hover .pf-card-img {
          transform: scale(1.03);
        }

        /* Curtain Intro animations */
        @keyframes pf-loader-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Staggered entrance animations */
        @keyframes pf-fade-in-up {
          0% { opacity: 0; transform: translateY(24px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        /* Lottie-style Customizer Shockwave Ripple */
        @keyframes pf-ripple {
          0% { transform: translate(-50%, -50%) scale(0.2); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1.4); opacity: 0; }
        }

        /* Lottie-style sparkle particles burst */
        @keyframes pf-spark-0 {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(-25px, -25px) scale(0.2); opacity: 0; }
        }
        @keyframes pf-spark-1 {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(25px, -25px) scale(0.2); opacity: 0; }
        }
        @keyframes pf-spark-2 {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(-25px, 25px) scale(0.2); opacity: 0; }
        }
        @keyframes pf-spark-3 {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(25px, 25px) scale(0.2); opacity: 0; }
        }

        @media (max-width: 992px) {
          .pf-hero-grid { grid-template-columns: 1fr !important; gap: 36px !important; }
        }
        @media (max-width: 768px) {
          .pf-nav-links { display: none !important; }
          .pf-product-grid { grid-template-columns: 1fr !important; }
          .pf-footer-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </div>
  )
}

export default HomePage

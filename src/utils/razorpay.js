const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID

function loadRazorpayScript() {
  return new Promise(resolve => {
    if (window.Razorpay) return resolve(true)
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

// In production: call your backend first to create a Razorpay subscription,
// get back a subscription_id, then pass it here.
// For now, mock mode simulates success when no key is configured.
export async function openRazorpaySubscription({ planName, amount, billingCycle, email, onSuccess, onDismiss }) {
  if (!RAZORPAY_KEY) {
    // Mock mode — simulate payment processing delay then success
    await new Promise(r => setTimeout(r, 1800))
    onSuccess({ mock: true, plan: planName })
    return
  }

  const loaded = await loadRazorpayScript()
  if (!loaded) {
    alert('Payment gateway failed to load. Please refresh and try again.')
    return
  }

  const options = {
    key: RAZORPAY_KEY,
    // In production: subscription_id from your backend replaces amount
    amount: amount * 100,
    currency: 'INR',
    name: 'No Limit Studio',
    description: `${planName} — ${billingCycle === 'annual' ? 'Annual' : 'Monthly'}`,
    image: '/images/logo_new.jpg',
    prefill: { email },
    theme: { color: '#0A0A0A' },
    handler: response => onSuccess(response),
    modal: { ondismiss: () => onDismiss?.() },
  }

  const rzp = new window.Razorpay(options)
  rzp.on('payment.failed', () => onDismiss?.())
  rzp.open()
}

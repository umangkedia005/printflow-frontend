import { createRazorpayOrder, verifyRazorpayPayment, createWalletTopupOrder, verifyWalletTopup } from './api'

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

// Creates a Razorpay order on the backend, opens checkout, then verifies the
// payment signature server-side before calling onSuccess. The plan is only
// ever activated after verification succeeds.
export async function openRazorpaySubscription({ shop, plan, planName, amount, billingCycle, email, onSuccess, onDismiss, onError }) {
  const loaded = await loadRazorpayScript()
  if (!loaded) {
    alert('Payment gateway failed to load. Please refresh and try again.')
    return
  }

  let order
  try {
    order = await createRazorpayOrder(shop, plan, amount)
  } catch (err) {
    onError?.(err.message)
    return
  }

  const options = {
    key: order.key_id,
    order_id: order.order_id,
    amount: order.amount,
    currency: order.currency,
    name: 'No Limits Studio',
    description: `${planName} — ${billingCycle === 'annual' ? 'Annual' : 'Monthly'}`,
    image: '/images/logo_new.jpg',
    prefill: { email },
    theme: { color: '#0A0A0A' },
    handler: async response => {
      try {
        await verifyRazorpayPayment({
          shop,
          plan,
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        })
        onSuccess(response)
      } catch (err) {
        onError?.(err.message)
      }
    },
    modal: { ondismiss: () => onDismiss?.() },
  }

  const rzp = new window.Razorpay(options)
  rzp.on('payment.failed', () => onDismiss?.())
  rzp.open()
}

// Same secure create-order → checkout → server-verify pattern as subscriptions,
// but credits the store's wallet balance instead of activating a plan.
export async function openWalletTopup({ shop, amount, email, onSuccess, onDismiss, onError }) {
  const loaded = await loadRazorpayScript()
  if (!loaded) {
    alert('Payment gateway failed to load. Please refresh and try again.')
    return
  }

  let order
  try {
    order = await createWalletTopupOrder(shop, amount)
  } catch (err) {
    onError?.(err.message)
    return
  }

  const options = {
    key: order.key_id,
    order_id: order.order_id,
    amount: order.amount,
    currency: order.currency,
    name: 'No Limits Studio',
    description: `Wallet top-up — ₹${amount}`,
    image: '/images/logo_new.jpg',
    prefill: { email },
    theme: { color: '#0A0A0A' },
    handler: async response => {
      try {
        const result = await verifyWalletTopup({
          shop,
          amount,
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        })
        onSuccess(result.balance)
      } catch (err) {
        onError?.(err.message)
      }
    },
    modal: { ondismiss: () => onDismiss?.() },
  }

  const rzp = new window.Razorpay(options)
  rzp.on('payment.failed', () => onDismiss?.())
  rzp.open()
}

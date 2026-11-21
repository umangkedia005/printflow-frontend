import { SUPPORT_EMAIL, SUPPORT_PHONES } from '../utils/api'

// Cancellation, Refund and Shipping policies. Linked from the dashboard
// sidebar (Our Policy) alongside the Privacy and Terms pages.

const UPDATED = 'November 2026'

function PolicyLayout({ title, intro, children }) {
  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8', fontFamily: 'Inter, sans-serif', color: '#0A0A0A' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '64px 24px 96px' }}>
        <h1 style={{ fontFamily: "'Fraunces', sans-serif", fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>{title}</h1>
        <p style={{ fontSize: '13px', color: '#889B8E', marginBottom: intro ? '20px' : '40px' }}>Last updated: {UPDATED}</p>
        {intro && <p style={{ fontSize: '14px', color: '#3F3F46', lineHeight: 1.7, marginBottom: '36px' }}>{intro}</p>}
        {children}
        <Contact />
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '32px' }}>
      <h2 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '10px' }}>{title}</h2>
      <div style={{ fontSize: '14px', color: '#3F3F46', lineHeight: 1.7 }}>{children}</div>
    </div>
  )
}

// listStyle: the site's base styles strip bullets from lists.
const ul = { paddingLeft: '20px', lineHeight: 1.8, margin: '6px 0', listStyle: 'disc' }
const link = { color: '#39B54A', fontWeight: 600 }

function Contact() {
  return (
    <Section title="Contact us">
      Email <a href={`mailto:${SUPPORT_EMAIL}`} style={link}>{SUPPORT_EMAIL}</a>
      {SUPPORT_PHONES.map(p => (
        <span key={p.label}> or call {p.label.toLowerCase()} on <a href={`tel:${p.tel}`} style={link}>{p.display}</a></span>
      ))}
      . Please include your order ID.
    </Section>
  )
}

function GoverningLaw({ n }) {
  return (
    <Section title={`${n}. Governing law`}>
      This policy is governed by the laws of India, and any dispute arising from it is subject to the
      jurisdiction of the courts of India.
    </Section>
  )
}

export function CancellationPage() {
  return (
    <PolicyLayout title="Cancellation Policy"
      intro="Every No Limit Studio product is printed to order, and we start production soon after an order comes in. That keeps delivery fast, but it means the window to cancel is short.">
      <Section title="1. When you can cancel">
        You can cancel an order while its status is <strong>Queued</strong>, before printing starts. Once an
        order shows <strong>Printing</strong>, <strong>Shipped</strong> or <strong>Delivered</strong>, it has been
        made for you and can no longer be cancelled.
      </Section>
      <Section title="2. How to cancel">
        Contact us as soon as possible by email or phone (details below) with your order ID. If the order is still
        Queued, we cancel it and confirm by email.
      </Section>
      <Section title="3. Your money">
        The full amount paid for a cancelled order (product, printing, shipping and tax) is returned to your
        No Limit Studio wallet, ready for your next order.
      </Section>
      <GoverningLaw n={4} />
    </PolicyLayout>
  )
}

export function RefundPage() {
  return (
    <PolicyLayout title="Refund Policy"
      intro="Every product is printed specifically for your order; we don't hold finished stock. Because of that, we can't accept returns or give refunds for change of mind. If something is wrong on our side, we will put it right.">
      <Section title="1. When we reprint or refund">
        We offer a free replacement or a refund when:
        <ul style={ul}>
          <li>You received the wrong product (wrong size, colour or design from what was ordered).</li>
          <li>The product arrived damaged or defective.</li>
          <li>The print has a clear error or doesn't match the design you approved.</li>
        </ul>
      </Section>
      <Section title="2. How to report a problem">
        Contact us within <strong>5 days of delivery</strong> with:
        <ul style={ul}>
          <li>your order ID,</li>
          <li>clear photos of the problem, and</li>
          <li>a short description of what's wrong.</li>
        </ul>
        We review every case and reply by email. If it's approved, we either reprint the item or refund it.
      </Section>
      <Section title="3. What isn't covered">
        <ul style={ul}>
          <li>Change of mind after the order is placed.</li>
          <li>A size chosen incorrectly; please check the size chart before ordering.</li>
          <li>Small colour differences between screens and the printed product, which are normal.</li>
          <li>Low-resolution or poor-quality artwork that was uploaded as is.</li>
          <li>Delays caused by the courier. We will chase the courier for you, but delays aren't refunded.</li>
          <li>Problems reported more than 5 days after delivery.</li>
        </ul>
      </Section>
      <Section title="4. How refunds are paid">
        Approved refunds, and cancelled orders, are credited to your No Limit Studio wallet. Wallet balance can be
        used for any future order; it can't be withdrawn to a bank account. Replacements go into production as soon as
        they're approved and ship on our usual timelines.
      </Section>
      <GoverningLaw n={5} />
    </PolicyLayout>
  )
}

export function ShippingPage() {
  return (
    <PolicyLayout title="Shipping and Delivery"
      intro="We print, pack and ship every order ourselves and deliver across India through trusted courier partners.">
      <Section title="1. Dispatch time">
        Orders are usually printed and dispatched within <strong>48 hours</strong> of being placed. This is an
        estimate: busy periods or circumstances outside our control can occasionally add time.
      </Section>
      <Section title="2. Delivery">
        We ship to addresses across India. Delivery time depends on the destination and the shipping method:
        <ul style={ul}>
          <li><strong>Surface</strong>: the standard, lower-cost option.</li>
          <li><strong>Air</strong>: faster, at a higher rate.</li>
        </ul>
        Delivery times are estimates given by the courier and aren't guaranteed.
      </Section>
      <Section title="3. Shipping charges">
        Shipping is charged per order: one rate for the first piece and a smaller rate for each additional piece,
        plus GST. The exact shipping charge is shown in the order total before you confirm, and is paid from your
        wallet along with the order. We don't offer cash on delivery.
      </Section>
      <Section title="4. Tracking">
        When your order ships, we email you the courier name and tracking number, and the order status changes to
        Shipped on your dashboard. You can follow it until it's Delivered.
      </Section>
      <Section title="5. Address and delivery problems">
        Please check the shipping address and PIN code before confirming; we can't be responsible for orders sent to
        an incorrect address you entered. If a parcel is delayed or appears lost, contact us with the order ID and we
        will take it up with the courier.
      </Section>
      <GoverningLaw n={6} />
    </PolicyLayout>
  )
}

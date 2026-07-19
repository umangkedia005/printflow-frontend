const TermsPage = () => {
  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8', fontFamily: 'Inter, sans-serif', color: '#0A0A0A' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '64px 24px 96px' }}>
        <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>
          Terms of Service
        </h1>
        <p style={{ fontSize: '13px', color: '#889B8E', marginBottom: '40px' }}>Last updated: July 2026</p>

        <Section title="1. Acceptance of Terms">
          By connecting your Shopify store to No Limits Studio, you agree to these Terms of Service.
        </Section>

        <Section title="2. The Service">
          No Limits Studio is a print-on-demand fulfillment platform. When a customer places an order on your
          connected Shopify store, we manufacture, print, and ship the order on your behalf, under your brand.
        </Section>

        <Section title="3. Your Responsibilities">
          <ul style={ulStyle}>
            <li>You are responsible for the accuracy of your store details and product listings.</li>
            <li>You are responsible for pricing your products to cover our base fulfillment costs.</li>
            <li>You must not use the service for illegal, infringing, or prohibited content.</li>
          </ul>
        </Section>

        <Section title="4. Billing">
          Paid plans are billed via Razorpay on a recurring basis. You may cancel your subscription at any time;
          cancellation takes effect at the end of the current billing cycle.
        </Section>

        <Section title="5. Fulfillment & Shipping">
          Standard production time is 24–48 hours after an order is received, followed by shipping. Delivery
          times vary by destination and are not guaranteed.
        </Section>

        <Section title="6. Termination">
          You may disconnect your store and stop using the service at any time. We may suspend or terminate
          access for violation of these terms.
        </Section>

        <Section title="7. Limitation of Liability">
          No Limits Studio is provided "as is". We are not liable for indirect or consequential damages arising
          from use of the service.
        </Section>

        <Section title="8. Contact">
          Questions about these terms can be sent to{' '}
          <a href="mailto:hiddenappleclub@gmail.com" style={{ color: '#39B54A', fontWeight: 600 }}>hiddenappleclub@gmail.com</a>.
        </Section>
      </div>
    </div>
  )
}

const ulStyle = { paddingLeft: '20px', lineHeight: 1.8, color: '#3F3F46', fontSize: '14px' }

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '32px' }}>
      <h2 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '10px' }}>{title}</h2>
      <div style={{ fontSize: '14px', color: '#3F3F46', lineHeight: 1.7 }}>{children}</div>
    </div>
  )
}

export default TermsPage

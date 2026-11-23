const PrivacyPage = () => {
  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8', fontFamily: 'Inter, sans-serif', color: '#0A0A0A' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '64px 24px 96px' }}>
        <h1 style={{ fontFamily: "'Fraunces', sans-serif", fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>
          Privacy Policy
        </h1>
        <p style={{ fontSize: '13px', color: '#889B8E', marginBottom: '40px' }}>Last updated: November 2026</p>

        <Section title="1. Introduction">
          No Limit Studio ("we", "us", "our") provides a print-on-demand fulfillment platform that connects to
          your Shopify store. This policy explains what information we collect, why we collect it, and how we use it.
        </Section>

        <Section title="2. Information We Collect">
          <ul style={ulStyle}>
            <li>Your name and email address, when you sign in with Google.</li>
            <li>Your Shopify store domain and access token, when you connect a store.</li>
            <li>Order data synced from your connected Shopify store: your customer's name, email, phone number, shipping address (billing address only if there is no shipping address), items, prices, shipping method and tracking. We use this only to print, ship and invoice the order and to support you. We do not keep your customers' browser or device details, marketing choices or payment details.</li>
            <li>Basic usage data such as pages visited within the dashboard.</li>
          </ul>
        </Section>

        <Section title="3. How We Use Your Information">
          <ul style={ulStyle}>
            <li>To authenticate you and give you access to your dashboard.</li>
            <li>To receive, print, and ship orders placed on your connected Shopify store.</li>
            <li>To send you order and account-related notifications.</li>
            <li>To process billing for paid subscription plans.</li>
          </ul>
        </Section>

        <Section title="4. Data Sharing">
          We do not sell your data. We share order and shipping information only with our fulfillment and
          logistics partners, including our courier partner ProShip, as needed to print and deliver your
          customers' orders. Our service runs on Amazon Web Services, which stores data and sends our emails, and
          Netlify, which hosts our website. Subscription payments are processed by Shopify. We use Razorpay to
          process wallet top-ups for fulfillment costs and Firebase (Google) for authentication.
        </Section>

        <Section title="5. Data Retention">
          <ul style={ulStyle}>
            <li>Customer names, emails, phone numbers and addresses on finished orders are removed 2 years after the order.</li>
            <li>When a customer or store asks for erasure through Shopify, those details are removed from the order and hidden from normal screens.</li>
            <li>Issued GST tax invoices are kept unchanged for the period required by Indian tax law, generally about 6 years. Only authorised staff can open them, and each opening is recorded. Customer details are then erased from them.</li>
            <li>Application logs are kept for 90 days and records of staff access for about 13 months.</li>
            <li>Encrypted database backups are kept for up to 35 days, after which erased data no longer exists in them.</li>
            <li>Your account data is kept while your account is active. You can request its deletion at any time by contacting us, except records we must keep by law.</li>
          </ul>
        </Section>

        <Section title="6. Your Rights">
          You may request access to, correction of, or deletion of your personal data at any time by
          disconnecting your store or contacting us directly.
        </Section>

        <Section title="7. Contact">
          Questions about this policy can be sent to{' '}
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

export default PrivacyPage

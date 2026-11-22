import { useEffect, useState } from 'react'
import { fetchAccountSettings, saveAccountSettings } from '../../utils/api'
import { STATES } from '../../utils/indiaStates'

// Settings, in tabs: billing details, bank account, shipping preferences,
// which emails we send, and the account itself (sign-in, store).

const INK = '#172B15'
const SAGE = '#889B8E'
const LINE = 'rgba(23,43,21,0.08)'

const Ic = ({ d }) => <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
const TABS = [
  { id: 'billing', label: 'Billing Details', icon: <Ic d={<><path d="M4 1.75h5.5L12.75 5v9.25H4z" /><path d="M9.25 1.75V5.25h3.5M6.25 8.5h4M6.25 11h4" /></>} /> },
  { id: 'bank', label: 'Bank Account', icon: <Ic d={<><rect x="1.75" y="3.5" width="12.5" height="9" rx="1.5" /><path d="M1.75 6.5h12.5M4.5 10h2.5" /></>} /> },
  { id: 'shipping', label: 'Shipping Preferences', icon: <Ic d={<><path d="M8 1.75 14 5v6L8 14.25 2 11V5z" /><path d="M2 5l6 3.25L14 5M8 8.25v6" /></>} /> },
  { id: 'notifications', label: 'Notification', icon: <Ic d={<><path d="M4 11.5V7a4 4 0 018 0v4.5l1.25 1.25H2.75z" /><path d="M6.5 14.25a1.6 1.6 0 003 0" /></>} /> },
  { id: 'account', label: 'Account Settings', icon: <Ic d={<><circle cx="8" cy="8" r="2.25" /><path d="M8 1.5v1.75M8 12.75v1.75M1.5 8h1.75M12.75 8h1.75M3.4 3.4l1.25 1.25M11.35 11.35l1.25 1.25M3.4 12.6l1.25-1.25M11.35 4.65l1.25-1.25" /></>} /> },
]

const EMAILS = [
  ['order_confirmed', 'Order confirmations', 'When you place an order from Create order or My files.'],
  ['order_updates', 'Order status updates', 'When your order is printing, shipped (with courier and tracking number) and delivered.'],
  ['wallet_receipts', 'Wallet receipts', 'Every time money is added to your wallet.'],
  ['low_wallet', 'Low wallet alerts', "When a new Shopify order costs more than your wallet balance, so it can't go to print yet."],
]

const input = { width: '100%', boxSizing: 'border-box', padding: '11px 13px', border: `1px solid ${LINE}`, borderRadius: '10px', fontSize: '13.5px', color: INK, background: '#FFFFFF', fontFamily: 'Inter, sans-serif', outline: 'none' }

function Field({ label, hint, children, full }) {
  return (
    <label style={{ display: 'block', gridColumn: full ? '1 / -1' : undefined }}>
      <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: INK, marginBottom: '6px' }}>{label}</span>
      {children}
      {hint && <span style={{ display: 'block', fontSize: '11.5px', color: SAGE, marginTop: '5px' }}>{hint}</span>}
    </label>
  )
}

function Text({ value, onChange, ...rest }) {
  return <input value={value || ''} onChange={e => onChange(e.target.value)} style={input} {...rest} />
}

function AddressFields({ value, onChange }) {
  const set = k => v => onChange({ ...value, [k]: v })
  return (
    <>
      <Field label="Address line 1" full><Text value={value.address1} onChange={set('address1')} placeholder="Building, street" autoComplete="address-line1" /></Field>
      <Field label="Address line 2 (optional)" full><Text value={value.address2} onChange={set('address2')} placeholder="Area, landmark" autoComplete="address-line2" /></Field>
      <Field label="City"><Text value={value.city} onChange={set('city')} autoComplete="address-level2" /></Field>
      <Field label="State">
        <select value={value.state || ''} onChange={e => set('state')(e.target.value)} style={input}>
          <option value="">Select state</option>
          {STATES.map(s => <option key={s}>{s}</option>)}
        </select>
      </Field>
      <Field label="Pincode"><Text value={value.pincode} onChange={v => set('pincode')(v.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="6 digits" /></Field>
    </>
  )
}

function Toggle({ on, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      style={{ flexShrink: 0, width: '46px', height: '26px', borderRadius: '100px', border: 'none', padding: '3px', cursor: 'pointer', background: on ? INK : '#D6D6CF', transition: 'background 0.2s' }}>
      <span style={{ display: 'block', width: '20px', height: '20px', borderRadius: '50%', background: '#FFFFFF', transform: on ? 'translateX(20px)' : 'none', transition: 'transform 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </button>
  )
}

// The editable copy of each tab, built from what the server returned.
function draftsFrom(s) {
  return {
    billing: { business_name: '', gstin: '', email: '', phone: '', address1: '', address2: '', city: '', state: '', pincode: '', ...s.billing },
    bank: { account_holder: s.bank.account_holder || '', bank_name: s.bank.bank_name || '', ifsc: s.bank.ifsc || '', account_number: '', confirm_account_number: '' },
    shipping: { default_method: s.shipping.default_method || 'surface', brand_name: s.shipping.brand_name || '', return_address: { name: '', phone: '', address1: '', address2: '', city: '', state: '', pincode: '', ...s.shipping.return_address } },
    notifications: { ...s.notifications },
  }
}

export default function AccountSettings({ email, shopDomain, onAddStore, onSignOut, initialTab = 'billing' }) {
  const [tab, setTab] = useState(initialTab)
  const [saved, setSaved] = useState(null)
  const [drafts, setDrafts] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null) // { tab, ok, text }

  useEffect(() => {
    fetchAccountSettings()
      .then(s => { setSaved(s); setDrafts(draftsFrom(s)) })
      .catch(e => setLoadError(e.message))
  }, [])

  const draft = drafts?.[tab]
  const setDraft = value => { setDrafts(d => ({ ...d, [tab]: value })); setMessage(null) }
  const dirty = saved && drafts && tab !== 'account' && JSON.stringify(draftsFrom(saved)[tab]) !== JSON.stringify(draft)

  async function save() {
    setSaving(true)
    setMessage(null)
    try {
      const fresh = await saveAccountSettings(tab, draft)
      setSaved(fresh)
      // Only this tab is reset from the server; other tabs keep unsaved edits.
      setDrafts(d => ({ ...d, [tab]: draftsFrom(fresh)[tab] }))
      setMessage({ tab, ok: true, text: 'Saved' })
    } catch (e) {
      setMessage({ tab, ok: false, text: e.message })
    } finally {
      setSaving(false)
    }
  }

  const current = TABS.find(t => t.id === tab)
  const intro = {
    billing: 'Your business details for invoices and GST. Add your GSTIN to claim input tax credit.',
    bank: 'Where we send money to you in future, such as payouts. Wallet balance itself can only be used for orders.',
    shipping: 'How your orders are shipped and what your customers see on the parcel.',
    notifications: 'Choose which emails we send you. Changes apply from the next email.',
    account: 'Your sign-in and connected Shopify store.',
  }[tab]

  return (
    <div>
      <div style={{ marginBottom: '22px' }}>
        <h1 style={{ fontFamily: "'Fraunces', sans-serif", fontSize: '26px', fontWeight: 800, color: INK, letterSpacing: '-0.5px', marginBottom: '4px' }}>Settings</h1>
        <p style={{ fontSize: '13px', color: SAGE, fontWeight: 500 }}>Manage your account settings and preferences.</p>
      </div>

      {/* Tabs: wrap on wide screens, swipe sideways on phones. */}
      <div className="pf-scroll-x" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', background: '#FFFFFF', border: `1px solid ${LINE}`, borderRadius: '16px', padding: '6px', marginBottom: '18px', boxShadow: '0 4px 14px rgba(23,43,21,0.02)' }}>
        {TABS.map(t => {
          const active = t.id === tab
          return (
            <button key={t.id} onClick={() => { setTab(t.id); setMessage(null) }}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '11px', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: active ? 700 : 600, background: active ? INK : 'transparent', color: active ? '#FFFFFF' : '#4A5548', transition: 'background 0.15s' }}>
              {t.icon}{t.label}
            </button>
          )
        })}
      </div>

      <div style={{ background: '#FFFFFF', border: `1px solid ${LINE}`, borderRadius: '20px', padding: '24px', boxShadow: '0 8px 30px rgba(23,43,21,0.015)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '22px', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0, flex: '1 1 260px' }}>
            <h2 style={{ fontFamily: "'Fraunces', sans-serif", fontSize: '19px', fontWeight: 800, color: INK }}>{current.label === 'Notification' ? 'Notification Settings' : current.label}</h2>
            <p style={{ fontSize: '12.5px', color: SAGE, marginTop: '4px', lineHeight: 1.5 }}>{intro}</p>
          </div>
          {tab !== 'account' && drafts && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {message?.tab === tab && message.ok && <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#166534' }}>✓ {message.text}</span>}
              <button className="pf-btn" onClick={save} disabled={!dirty || saving} style={{ padding: '10px 22px', fontSize: '13px', fontWeight: 800, background: INK, color: '#FFFFFF', borderRadius: '10px' }}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          )}
        </div>

        {message?.tab === tab && !message.ok && (
          <div style={{ background: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: '10px', padding: '10px 14px', marginBottom: '18px', fontSize: '13px', color: '#C53030' }}>⚠ {message.text}</div>
        )}

        {tab === 'account' ? (
          <div style={{ display: 'grid', gap: '14px' }}>
            <Row label="Signed in as" value={email} />
            <Row label="Shopify store" value={shopDomain || 'No store connected'}
              action={<button onClick={onAddStore} style={{ background: 'transparent', border: `1px solid ${LINE}`, borderRadius: '9px', padding: '8px 14px', fontSize: '12.5px', fontWeight: 600, color: INK, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>{shopDomain ? '+ Add store' : '+ Connect store'}</button>} />
            <div style={{ background: '#FAFAF8', border: `1px solid ${LINE}`, borderRadius: '12px', padding: '14px 16px' }}>
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: INK, marginBottom: '4px' }}>How fulfilment works</div>
              <div style={{ fontSize: '12.5px', color: SAGE, lineHeight: 1.5 }}>New Shopify orders appear under Orders. Open one and click "Send to Print Factory": the printing cost is taken from your wallet and we take it from there.</div>
            </div>
            <div><button onClick={onSignOut} style={{ background: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: '9px', padding: '10px 18px', fontSize: '13px', fontWeight: 600, color: '#C53030', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Sign out of No Limit Studio</button></div>
          </div>
        ) : loadError ? (
          <div style={{ fontSize: '13px', color: '#C53030' }}>⚠ {loadError}</div>
        ) : !drafts ? (
          <div style={{ padding: '32px', textAlign: 'center', fontSize: '13px', color: SAGE }}>Loading your settings…</div>
        ) : tab === 'billing' ? (
          <div className="pf-grid-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Field label="Business or brand name"><Text value={draft.business_name} onChange={v => setDraft({ ...draft, business_name: v })} autoComplete="organization" /></Field>
            <Field label="GSTIN (optional)" hint="15 characters, e.g. 27ABCDE1234F1Z5"><Text value={draft.gstin} onChange={v => setDraft({ ...draft, gstin: v.toUpperCase().replace(/\s/g, '').slice(0, 15) })} /></Field>
            <Field label="Billing email (optional)" hint={`Leave empty to use ${email}`}><Text value={draft.email} onChange={v => setDraft({ ...draft, email: v })} type="email" /></Field>
            <Field label="Phone (optional)"><Text value={draft.phone} onChange={v => setDraft({ ...draft, phone: v })} inputMode="tel" placeholder="10 digits" /></Field>
            <AddressFields value={draft} onChange={setDraft} />
          </div>
        ) : tab === 'bank' ? (
          <div className="pf-grid-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {saved.bank.account_number_masked && (
              <div style={{ gridColumn: '1 / -1', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '10px', padding: '11px 14px', fontSize: '13px', color: '#166534' }}>
                Saved: {saved.bank.bank_name || 'Account'} {saved.bank.account_number_masked} · IFSC {saved.bank.ifsc}
              </div>
            )}
            <Field label="Account holder name"><Text value={draft.account_holder} onChange={v => setDraft({ ...draft, account_holder: v })} /></Field>
            <Field label="Bank name"><Text value={draft.bank_name} onChange={v => setDraft({ ...draft, bank_name: v })} placeholder="e.g. HDFC Bank" /></Field>
            <Field label="Account number" hint={saved.bank.account_number_masked ? `Leave empty to keep ${saved.bank.account_number_masked}` : undefined}>
              <Text value={draft.account_number} onChange={v => setDraft({ ...draft, account_number: v.replace(/\D/g, '').slice(0, 18) })} inputMode="numeric" autoComplete="off" placeholder={saved.bank.account_number_masked || '9 to 18 digits'} />
            </Field>
            <Field label="Confirm account number"><Text value={draft.confirm_account_number} onChange={v => setDraft({ ...draft, confirm_account_number: v.replace(/\D/g, '').slice(0, 18) })} inputMode="numeric" autoComplete="off" onPaste={e => e.preventDefault()} /></Field>
            <Field label="IFSC code"><Text value={draft.ifsc} onChange={v => setDraft({ ...draft, ifsc: v.toUpperCase().replace(/\s/g, '').slice(0, 11) })} placeholder="e.g. HDFC0001234" /></Field>
            <p style={{ gridColumn: '1 / -1', fontSize: '12px', color: SAGE, lineHeight: 1.5, margin: 0 }}>🔒 After saving, only the last 4 digits are shown here. Only the No Limit Studio team can see the full number.</p>
          </div>
        ) : tab === 'shipping' ? (
          <div style={{ display: 'grid', gap: '22px' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: INK, marginBottom: '8px' }}>Default shipping method</div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {[['surface', 'Surface', 'Standard, lower cost'], ['air', 'Air', 'Faster, higher rate']].map(([id, label, desc]) => (
                  <button key={id} type="button" onClick={() => setDraft({ ...draft, default_method: id })}
                    style={{ flex: '1 1 180px', textAlign: 'left', padding: '12px 14px', borderRadius: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', border: draft.default_method === id ? `1.5px solid ${INK}` : `1px solid ${LINE}`, background: draft.default_method === id ? '#F6F7F2' : '#FFFFFF' }}>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: INK }}>{label}</div>
                    <div style={{ fontSize: '12px', color: SAGE, marginTop: '2px' }}>{desc}</div>
                  </button>
                ))}
              </div>
              <div style={{ fontSize: '11.5px', color: SAGE, marginTop: '6px' }}>Pre-selected on Create order; you can still change it per order.</div>
            </div>
            <Field label="Brand name on parcels (optional)" hint="Shown as the sender on the shipping label instead of No Limit Studio.">
              <Text value={draft.brand_name} onChange={v => setDraft({ ...draft, brand_name: v })} placeholder="e.g. Riya Prints" maxLength={60} />
            </Field>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: INK }}>Return address (optional)</div>
              <div style={{ fontSize: '12px', color: SAGE, margin: '3px 0 14px' }}>Where parcels go back to if they can't be delivered. Leave empty to have them returned to us.</div>
              <div className="pf-grid-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Field label="Contact name"><Text value={draft.return_address.name} onChange={v => setDraft({ ...draft, return_address: { ...draft.return_address, name: v } })} /></Field>
                <Field label="Phone"><Text value={draft.return_address.phone} onChange={v => setDraft({ ...draft, return_address: { ...draft.return_address, phone: v } })} inputMode="tel" placeholder="10 digits" /></Field>
                <AddressFields value={draft.return_address} onChange={v => setDraft({ ...draft, return_address: v })} />
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {EMAILS.map(([key, label, desc]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', border: `1px solid ${LINE}`, borderRadius: '14px', padding: '16px 18px' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: INK }}>{label}</span>
                    <span style={{ fontSize: '10.5px', fontWeight: 700, padding: '2px 8px', borderRadius: '100px', background: draft[key] ? '#F0FDF4' : '#F4F4F0', color: draft[key] ? '#166534' : '#8A8A85' }}>{draft[key] ? 'Active' : 'Off'}</span>
                  </div>
                  <div style={{ fontSize: '12.5px', color: SAGE, marginTop: '4px', lineHeight: 1.5 }}>{desc}</div>
                </div>
                <Toggle on={draft[key]} label={label} onChange={v => setDraft({ ...draft, [key]: v })} />
              </div>
            ))}
            <p style={{ fontSize: '12px', color: SAGE, margin: '4px 0 0' }}>Sent to <strong style={{ color: INK }}>{email}</strong> from orders@nolimitstudio.in</p>
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ label, value, action }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', paddingBottom: '14px', borderBottom: `1px solid ${LINE}` }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '12px', color: SAGE, marginBottom: '3px' }}>{label}</div>
        <div style={{ fontSize: '14px', fontWeight: 600, color: INK, wordBreak: 'break-all' }}>{value}</div>
      </div>
      {action}
    </div>
  )
}

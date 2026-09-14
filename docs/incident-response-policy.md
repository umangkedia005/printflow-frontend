# Security Incident Response Policy

**No Limit Studio** — print-on-demand fulfilment app for Shopify
Owner: Hidden Apple · Contact: hiddenappleclub@gmail.com
Last reviewed: 14 September 2026

This policy covers security incidents affecting merchant data or the personal
data of merchants' customers processed by No Limit Studio.

---

## 1. Scope

The systems in scope are:

| System | Data held |
|---|---|
| AWS DynamoDB (`ap-south-1`) | Orders (customer name, email, shipping address), store records, product mappings, wallet transactions |
| AWS Lambda + API Gateway | Processes all of the above in transit |
| AWS CloudWatch Logs | Operational logs |
| Firebase Authentication | Merchant account identities (email) |
| Netlify | Static frontend hosting |
| Razorpay | Wallet top-up payments (merchant-facing) |
| Print fulfilment partner | Receives order and shipping details to produce and deliver goods |

## 2. What counts as an incident

- Unauthorised access to, or disclosure of, merchant or customer personal data
- Loss or corruption of order, store, or wallet data
- Compromise of credentials: AWS keys, Shopify API secret, Firebase keys,
  Razorpay keys, GitHub tokens
- Compromise of the app's Shopify access, or misuse of the Admin API
- Availability loss preventing merchants from fulfilling orders

Vulnerabilities found before exploitation are handled under remediation, not
this policy, unless evidence suggests they were exploited.

## 3. Severity

| Level | Definition | Example |
|---|---|---|
| **P1** | Confirmed exposure of personal data, or active unauthorised access | Order data accessed by an unauthorised party |
| **P2** | Credential compromise with no confirmed data access | Shopify API secret leaked |
| **P3** | Data loss or corruption with no exposure | Table write error destroys order records |
| **P4** | Availability incident | API down; webhooks not being received |

## 4. Response

### 4.1 Detect
Sources: CloudWatch logs and alarms, Shopify Partner dashboard API health,
merchant reports to the support email, and third-party notifications.

### 4.2 Contain — immediately on suspicion
- Rotate affected credentials (Shopify API secret via the dev dashboard;
  AWS keys via IAM; Razorpay via their dashboard; Firebase via the console)
- Revoke sessions where applicable
- Disable the affected endpoint or Lambda route if exploitation is ongoing
- Preserve CloudWatch logs and CloudTrail records before they age out —
  take a copy rather than relying on retention windows

### 4.3 Assess
Determine: which data was affected, how many merchants and end customers,
the window of exposure, and whether data was exfiltrated or only accessible.
Record findings as they are established, with timestamps.

### 4.4 Notify

| Who | When | How |
|---|---|---|
| Affected merchants | Without undue delay, and within **72 hours** of becoming aware for personal data breaches | Email to the store contact |
| Shopify | For incidents affecting Shopify merchant or customer data | Shopify Partner support |
| Supervisory authority | Within **72 hours** where GDPR Article 33 applies | As required by the relevant authority |
| End customers | Where the breach is likely to result in high risk to them, and where we are the controller | Via the affected merchant where they are the controller |

Notifications state what happened, what data was involved, what we have done,
and what the recipient should do.

### 4.5 Recover
Restore from DynamoDB point-in-time recovery where data was lost. Verify
integrity before resuming processing. Confirm the entry point is closed.

### 4.6 Review
Within 14 days of resolution, write up: timeline, root cause, what detection
missed, and concrete remediation with owners and dates. Update this policy if
the incident showed a gap in it.

## 5. Responsibilities

Sole operator (Hidden Apple) holds all roles: detection, containment,
assessment, notification, and review. Where the incident involves the print
fulfilment partner's systems, they are contacted immediately and expected to
provide their own account of scope and containment.

## 6. Retention and minimisation

- Order records retain only the fields required for fulfilment and merchant
  display: customer name, email, shipping address, line items, tracking
- CloudWatch log retention is bounded; personal data is not written to logs
- Merchants may request deletion of their account and associated data at any
  time, per the published privacy policy

## 7. Review

This policy is reviewed at least annually, and after any P1 or P2 incident.

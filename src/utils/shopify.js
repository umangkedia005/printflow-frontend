// Installation is Shopify's to perform, not ours. The app uses managed
// installation, so the old /auth OAuth start no longer creates a usable grant
// — it only produced legacy non-expiring tokens the Admin API now rejects.
// This link hands the merchant to Shopify, which confirms which store to
// install on and creates the grant itself.
//
// Replace with the App Store listing URL (https://apps.shopify.com/<handle>)
// once the app is listed; this developer-dashboard link is for an unlisted app.
export const SHOPIFY_INSTALL_URL =
  'https://admin.shopify.com/?organization_id=228077460&no_redirect=true' +
  '&redirect=/oauth/redirect_from_developer_dashboard?client_id%3Df4722677d66428d040f7f21f1bdd6345'

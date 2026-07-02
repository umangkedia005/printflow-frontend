# Testing the React Frontend

## Quick Start

### 1. Start Flask Backend (Terminal 1)
```bash
cd /Users/uidai/Desktop/flask-backend
source venv/bin/activate
python app.py
```

You should see:
```
✅ PHASE 1 MVP - SUCCESSFULLY IMPLEMENTED!
 * Running on http://localhost:5000
```

### 2. Start React Frontend (Terminal 2)
```bash
cd /Users/uidai/Desktop/flask-frontend
npm run dev
```

You should see:
```
  VITE v8.x.x  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### 3. Open Browser
Visit: `http://localhost:5173`

You should see:
- PrintFlow landing page
- "Start Your Print-on-Demand Business" heading
- Three feature cards (Easy Integration, Automatic Fulfillment, Your Brand)
- Store connection form with input field

## Test OAuth Flow

### Test 1: Valid Store URL
1. Enter `test-store.myshopify.com` in the form
2. Click "Connect My Store"
3. Should redirect to: `http://localhost:5000/shopify/auth?shop=test-store.myshopify.com`
4. Flask will redirect to Shopify OAuth (you'll need a real Shopify Partner App for this)

### Test 2: Invalid Store URL
1. Enter `invalid-store` (without .myshopify.com)
2. Click "Connect My Store"
3. Should show error: "Please enter a valid Shopify store domain"

### Test 3: Empty Input
1. Click "Connect My Store" without entering anything
2. Should show error: "Please enter your Shopify store domain"

### Test 4: Success Page
1. Visit manually: `http://localhost:5173/success?shop=test-store.myshopify.com`
2. Should see:
   - Green success icon
   - "Store Connected Successfully!"
   - Shop domain displayed: `test-store.myshopify.com`
   - "What happens next?" section with 4 steps
   - "View Dashboard" and "Open Shopify Admin" buttons

## Verify Flask Redirect

To test the complete OAuth flow, you need a Shopify Partner App. For now, verify Flask redirects correctly:

### Check Flask OAuth Callback Update
```bash
cd /Users/uidai/Desktop/flask-backend
grep -A 5 "Redirect to React" routes/shopify_auth_routes.py
```

Should show:
```python
# Redirect to React success page
frontend_url = current_app.config.get('FRONTEND_URL', 'http://localhost:5173')
return redirect(f'{frontend_url}/success?shop={shop}')
```

### Check Flask Config
```bash
grep FRONTEND_URL config.py
```

Should show:
```python
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173')
```

## Check Vite Proxy

Vite should proxy API requests to Flask. Verify:

```bash
cat vite.config.js
```

Should show:
```javascript
server: {
  proxy: {
    '/api': { target: 'http://localhost:5000', changeOrigin: true },
    '/shopify': { target: 'http://localhost:5000', changeOrigin: true },
    '/webhooks': { target: 'http://localhost:5000', changeOrigin: true }
  }
}
```

## Visual Verification

### HomePage should have:
- ✅ Purple gradient background (purple-50 to indigo-100)
- ✅ White header with "PrintFlow" logo
- ✅ Large heading "Start Your Print-on-Demand Business"
- ✅ Three white feature cards with icons
- ✅ White registration form card with input field
- ✅ Purple "Connect My Store" button
- ✅ Green checkmarks: "Secure OAuth" and "No Credit Card Required"
- ✅ White footer with copyright text

### SuccessPage should have:
- ✅ Green gradient background (green-50 to teal-100)
- ✅ White header with "PrintFlow" logo
- ✅ White success card centered
- ✅ Green circle with checkmark icon
- ✅ "Store Connected Successfully!" heading
- ✅ Purple highlight on shop domain
- ✅ Purple box with "What happens next?" section
- ✅ Two buttons: purple "View Dashboard" and white outline "Open Shopify Admin"
- ✅ Footer with links (Documentation, Contact Support, Watch Tutorial)

## Troubleshooting

### React app won't start
```bash
# Reinstall dependencies
rm  -rf node_modules package-lock.json
npm install
npm run dev
```

### Tailwind styles not showing
```bash
# Check Tailwind installed
npm list tailwindcss

# Should show: tailwindcss@4.2.2
```

### Form doesn't validate
- Check browser console for JavaScript errors
- Verify StoreConnectForm.jsx exists in src/components/

### Redirect doesn't work
- Verify Flask backend is running on port 5000
- Check .env file has VITE_API_URL=http://localhost:5000
- Look at browser Network tab to see redirect URL

## Next Actions

Once basic display works:

1. **Set up Shopify Partner App**
   - Create app at partners.shopify.com
   - Get API credentials
   - Add to Flask .env file

2. **Test complete OAuth flow**
   - Real Shopify store connection
   - Verify merchant created in MongoDB
   - Check success page redirect

3. **Build dashboard**
   - Create /dashboard route
   - Show merchant orders
   - Add fulfillment controls

---

**All working?  You're ready to build the dashboard!** 🎉

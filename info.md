# Degen Cup 2026 — Info

## Deploy Proxy Function (REQUIRED for live scores)

Your site is deployed at a public URL. football-data.org blocks browser requests from deployed sites (CORS policy). You MUST deploy the Cloud Function proxy to fetch live scores.

### One-Time Setup (5 minutes)

**Step 1:** Install Firebase CLI
```bash
npm install -g firebase-tools
```

**Step 2:** Login to Firebase
```bash
firebase login
```

**Step 3:** Deploy the proxy function
```bash
cd functions
npm install
firebase deploy --only functions
```

Wait ~2 minutes. You'll see:
```
Function URL: https://asia-southeast2-degen-cup-2026-b42ca.cloudfunctions.net/proxyFootballData
```

**Step 4:** Go to Admin → SYNC tab → Click FETCH. It will now work.

---

## Alternative: Paste Scores (No Setup)

If you don't want to deploy the proxy, use the **Paste Scores** section in Admin → SYNC tab. Copy scores from any website (ESPN, BBC, Wikipedia) and paste them. The system parses them automatically.

---

## Quick Start

```bash
git clone <repo-url>
cd app
npm install
npm run dev
```

Open http://localhost:3000, go to /#/admin, password is `Dansucks123!`

## Features
- World Cup 2026 fantasy draft (2 favorites, 4 mid, 6 underdogs)
- Live score sync via football-data.org (deploy proxy first)
- Beer mug friendly challenges (The Den)
- Training Ground with fixtures & standings

## Tech Stack
React 19 + TypeScript + Vite + Tailwind CSS + Firebase

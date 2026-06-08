# Degen World Cup 2026

A pixel-art fantasy World Cup draft game. Managers draft 12 teams (2 favorites, 4 mid-tier, 6 underdogs) and earn points as their teams advance through the tournament.

---

## Quick Start (First-Time Setup)

### Step 1: Create a GitHub Repo

1. Go to [github.com/new](https://github.com/new)
2. Name it `degen-world-cup-2026`
3. Make it **Private** (so your friends can't see each other's picks before the reveal)
4. Do NOT initialize with README/.gitignore (we already have those)
5. Click **Create repository**

You'll see a page with commands. Look for the section that says **"...or push an existing repository from the command line"**. Copy those commands.

### Step 2: Push Your Code to GitHub

```bash
cd /path/to/this/project

# Link to your GitHub repo (replace YOUR_USERNAME with your actual GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/degen-world-cup-2026.git

# Commit everything
git add -A
git commit -m "Initial commit: Degen World Cup 2026"

# Push to GitHub
git push -u origin main
```

### Step 3: Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Sign in with your GitHub account
3. Find and select `degen-world-cup-2026`
4. Vercel auto-detects Vite — just click **Deploy**
5. Wait ~60 seconds. Your site is live!

### Step 4: Connect Your Namecheap Domain

1. In Vercel dashboard, go to your project → **Settings** → **Domains**
2. Enter your Namecheap domain (e.g., `degenworldcup2026.com`)
3. Vercel will show you DNS records to add
4. Go to [namecheap.com](https://namecheap.com) → **Domain List** → **Manage** → **Advanced DNS**
5. Add the records Vercel gave you (usually A Record + CNAME)
6. Back in Vercel, click **Refresh** — SSL cert is auto-generated

---

## Making Edits (The Normal Workflow)

After the initial setup, every edit follows this exact pattern:

```bash
# 1. Edit the files you need (using any code editor)
#    Example: Change scoring values in src/data/tournament.ts

# 2. Build to verify there are no errors
npm run build

# 3. Stage, commit, and push — Vercel auto-deploys
git add -A
git commit -m "Describe what you changed"
git push origin main
```

That's it. Vercel watches your GitHub repo and automatically rebuilds + redeploys within 30-60 seconds.

---

## Common Edits You'll Make

### Change Scoring Values
Edit: `src/data/tournament.ts`
```typescript
export const DEFAULT_SCORING: ScoringConfig = {
  groupFirst: 6,      // Change this number
  groupSecond: 4,     // Change this number
  roundOf16: 3,       // Change this number
  // ...etc
};
```

### Change Team Tiers (Pre-Tournament)
Edit: `src/data/tournament.ts`
```typescript
export const DEFAULT_TIERS: Record<string, Tier> = {
  ESP: 'favorite',    // Move a team up/down
  FRA: 'favorite',
  // Change 'favorite' to 'mid' or 'underdog'
};
```

### Change the Admin Password
Edit: `src/pages/AdminPage.tsx`
```typescript
const ADMIN_PASSWORD = 'Dansucks123!';  // Change this
```

### Change Payout Percentages
Edit: `src/data/tournament.ts`
```typescript
export const DEFAULT_PAYOUT: PayoutConfig = {
  buyIn: 250,                    // Change buy-in amount
  firstPlacePercent: 50,         // Change split percentages
  secondPlacePercent: 30,
  thirdPlacePercent: 20,
};
```

### Add a New Page
1. Create `src/pages/NewPage.tsx`
2. Add route in `src/App.tsx`
3. Add nav link in `src/components/NavBar.tsx`

---

## Project Structure

```
├── public/                  # Static assets (images, etc.)
│   ├── morph-1.png         # Beer mug morph frame 1
│   ├── morph-2.png         # Hybrid morph frame
│   ├── morph-3.png         # Trophy morph frame
│   ├── morph-4.png         # Transition morph frame
│   ├── hero-bg.jpg         # Hero background
│   └── ...
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── NavBar.tsx      # Top navigation bar
│   │   └── Footer.tsx      # Page footer
│   ├── context/
│   │   └── GameContext.tsx # Global state management (managers, scores, settings)
│   ├── data/
│   │   ├── tournament.ts   # All 48 teams, scoring config, payout config
│   │   └── apiSync.ts      # Auto-sync with live sports APIs
│   ├── pages/              # One file per page
│   │   ├── HomePage.tsx    # Landing page with name entry
│   │   ├── TiersPage.tsx   # View team tiers
│   │   ├── DraftPage.tsx   # Submit 12-team roster
│   │   ├── StandingsPage.tsx # Live leaderboard
│   │   ├── ManagerPage.tsx # Individual manager detail
│   │   ├── PayoutPage.tsx  # Prize money breakdown
│   │   ├── RulesPage.tsx   # Full rules and FAQ
│   │   └── AdminPage.tsx   # Admin panel (password protected)
│   ├── App.tsx             # Router setup (all page routes)
│   ├── main.tsx            # App entry point
│   └── index.css           # Global styles + animations
├── vercel.json             # Vercel SPA routing config
└── package.json            # Dependencies
```

---

## Game Config Reference

### Scoring System
| Achievement | Default Points |
|---|---|
| 1st in group | +6 |
| 2nd in group | +4 |
| 3rd & qualify | +3 |
| 4th in group | -2 |
| Reach Round of 16 | +3 |
| Reach Quarter-Final | +5 |
| Reach Semi-Final | +7 |
| Reach Final | +10 |
| Win World Cup | +15 |
| Win 3rd place | +3 |
| Top Scorer Bonus | +5 |

### Payout Split (Default)
| Place | Percentage |
|---|---|
| 1st | 50% |
| 2nd | 30% |
| 3rd | 20% |

### Buy-In
- **Amount:** HKD 250 per player
- **Payment:** FPS to +852 6392 6163
- **Deadline:** 48 hours after joining

### Roster Requirements
- 2 Favorites (shortest odds: 5:1 - 10:1)
- 4 Mid-Tier (odds: 15:1 - 50:1)
- 6 Underdogs (odds: 60:1 - 1000:1+)

### Admin Access
- **URL:** `/admin`
- **Default Password:** `Dansucks123!`
- **Features:** Lock/unlock draft, add/remove managers, payment tracking, warnings, enter match results, auto-sync, edit scoring values, edit payouts

---

## Tech Stack

- **React 19** + TypeScript
- **Vite** (build tool)
- **Tailwind CSS** (styling)
- **React Router** (client-side routing)
- **Lucide React** (icons)
- **localStorage** (data persistence — swap for Firebase for production)

---

## License

Not affiliated with FIFA. For private use among friends.

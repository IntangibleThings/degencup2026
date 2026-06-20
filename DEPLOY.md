# Email Notifications Setup for Degen Cup 2026

## What This Does

Sends you an email at **eugene.ps.kan@gmail.com** whenever:
1. A new manager signs up
2. A manager submits their roster

## Setup Steps (5 minutes)

### Step 1: Generate Gmail App Password

1. Go to https://myaccount.google.com/apppasswords
2. Sign in to your Google account (eugene.ps.kan@gmail.com)
3. Under "Select app" choose **"Mail"**
4. Under "Select device" choose **"Other (Custom name)"**
5. Type: `Degen Cup`
6. Click **GENERATE**
7. **Copy the 16-character password** (looks like `abcd efgh ijkl mnop`)

### Step 2: Add Password to Function

Open `functions/index.js` and replace this line:
```javascript
const gmailAppPassword = 'YOUR_APP_PASSWORD_HERE';
```

With your actual 16-character app password:
```javascript
const gmailAppPassword = 'abcd efgh ijkl mnop';
```

### Step 3: Install Firebase CLI

In your terminal, run:
```bash
npm install -g firebase-tools
```

### Step 4: Login to Firebase

```bash
firebase login
```
This opens a browser — sign in with the same Google account.

### Step 5: Set Your Project

```bash
firebase use degen-cup-2026-b42ca
```

### Step 6: Deploy the Function

```bash
cd functions
npm install
firebase deploy --only functions
```

Wait ~2 minutes. You'll see:
```
Deploy complete!
Function URL: https://asia-southeast2-degen-cup-2026-b42ca.cloudfunctions.net/onManagerSignup
```

### Step 7: Test It

1. Open your site in incognito mode
2. Register a new manager
3. Check your email (eugene.ps.kan@gmail.com) — you should get a notification!

## Troubleshooting

**"Error: No permission"** — Make sure you're signed in to the correct Firebase project.

**"Authentication failed"** — The app password is wrong. Go back to Step 1 and generate a new one.

**"Functions not deploying"** — You may need to enable the Blaze plan (pay-as-you-go) in Firebase. The free tier includes 2 million invocations/month which is more than enough.

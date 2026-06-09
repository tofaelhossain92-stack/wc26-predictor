# 🏆 WC26 Predictor — Deployment Guide
## Complete setup in ~30 minutes

---

## STEP 1 — GitHub (5 min)

1. Go to **github.com** → click **New repository**
2. Name it `wc26-predictor`, set to **Public**, click **Create**
3. On your computer, open Terminal and run:

```bash
cd wc26-predictor
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/wc26-predictor.git
git push -u origin main
```

---

## STEP 2 — Supabase (10 min)

1. Go to **supabase.com** → click **New Project**
2. Name it `wc26-predictor`, set a strong password, choose **US East** region → **Create**
3. Wait ~2 min for it to spin up
4. Go to **SQL Editor** (left sidebar) → **New Query**
5. Paste the entire contents of `supabase-schema.sql` → click **Run**
   - You should see "Success. No rows returned"
6. Go to **Settings → API** and copy:
   - `Project URL` → this is your `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ keep this secret!

---

## STEP 3 — football-data.org (3 min)

1. Go to **football-data.org/client/register**
2. Fill in the form — free tier gives you 10 requests/minute (plenty for our cron)
3. Check your email for your **API key**
4. Save it as `FOOTBALL_API_KEY`

> Note: The World Cup 2026 competition ID is `2000`. Already set in the code.

---

## STEP 4 — OneSignal Push Notifications (7 min)

1. Go to **onesignal.com** → **Create a free account**
2. Click **New App** → name it `WC26 Predictor`
3. Select **Web** as platform
4. Choose **Typical Site** setup
5. Fill in:
   - **Site Name**: WC26 Predictor
   - **Site URL**: `https://wc26-predictor.vercel.app` *(use your Vercel URL once deployed)*
   - **Default Notification Icon**: upload a ⚽ icon or skip
6. Go to **Settings → Keys & IDs** and copy:
   - `OneSignal App ID` → `NEXT_PUBLIC_ONESIGNAL_APP_ID`
   - `Rest API Key` → `ONESIGNAL_REST_API_KEY`

---

## STEP 5 — Vercel Deploy (5 min)

1. Go to **vercel.com** → **Add New Project**
2. Connect your GitHub account → select `wc26-predictor` repo
3. Framework: **Next.js** (auto-detected)
4. Click **Environment Variables** and add ALL of these:

```
NEXT_PUBLIC_SUPABASE_URL        = (from Step 2)
NEXT_PUBLIC_SUPABASE_ANON_KEY   = (from Step 2)
SUPABASE_SERVICE_ROLE_KEY       = (from Step 2)
FOOTBALL_API_KEY                = (from Step 3)
NEXT_PUBLIC_ONESIGNAL_APP_ID    = (from Step 4)
ONESIGNAL_REST_API_KEY          = (from Step 4)
CRON_SECRET                     = (make up any random string, e.g. "myS3cr3tCr0n2026")
```

5. Click **Deploy** — takes ~2 min
6. Your app is live at `https://wc26-predictor.vercel.app` 🎉

---

## STEP 6 — Update OneSignal with your live URL

1. Go back to OneSignal → **Settings → Web Configuration**
2. Update **Site URL** to your actual Vercel URL
3. Save

---

## STEP 7 — Test it works

1. Open your Vercel URL in browser
2. Enter a name + pick avatar → Join
3. Try predicting a match → should save with "Locked In" badge
4. Check Supabase → **Table Editor → predictions** — you should see your prediction there
5. Test the cron manually by visiting:
   `https://your-app.vercel.app/api/cron/sync-scores`
   with header `Authorization: Bearer yourCRON_SECRET`

---

## How results auto-sync works

Vercel runs `/api/cron/sync-scores` **every 5 minutes** automatically.
It:
1. Calls football-data.org for finished match scores
2. Updates match results in Supabase
3. Calculates and awards points to all players
4. Sends push notifications: "Result is in!"
5. Also sends "30 min warning" notifications before kickoff

No manual work needed — just watch the points update live! 🚀

---

## Sharing with friends

Just send them the Vercel URL: `https://wc26-predictor.vercel.app`

They open it in any browser — no app store, no install, no login.
They enter a name + pick an emoji → they're in.

For push notifications on iPhone:
- They need to tap **Share → Add to Home Screen** first
- Then open from the home screen icon
- A prompt will appear asking to allow notifications

---

## All API Keys Checklist

| Key | Where to find it | Used for |
|-----|-----------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API | Database connection |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API | Browser DB reads |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API | Server-side DB writes |
| `FOOTBALL_API_KEY` | football-data.org email | Live scores |
| `NEXT_PUBLIC_ONESIGNAL_APP_ID` | OneSignal → Settings → Keys | Push notifications |
| `ONESIGNAL_REST_API_KEY` | OneSignal → Settings → Keys | Sending push from server |
| `CRON_SECRET` | You make this up | Secure the cron endpoint |

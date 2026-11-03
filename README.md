# MYCO Field Lab — private cloud mushroom-trial dashboard

A GitHub Pages website for your **6 milky + 6 tropical oyster bag** trial, including purchasing, terrace prep, 55-day monitoring, individual bag records, water spray checks, photos, abnormality reports, harvest, cost, CSV and full JSON backup.

**IMPORTANT:** GitHub Pages hosts the site; **Supabase** hosts the synced records and photos. The cloud is **not yet live** until you create and connect your own Supabase project. The site also keeps a browser cache for offline entries. Never put private photos or backup JSON files into GitHub.

## Step 1 — Set up Supabase (free plan can be used subject to quota)

1. Visit https://supabase.com/dashboard and create a project. Store your database password securely.
2. Open **SQL Editor → New query**, paste the complete `supabase_setup.sql` file and **Run**. This creates `myco_trial_state`, `myco_photos` and a **private** `myco-photos` Storage bucket with row-level-security (RLS) policies per signed-in user.
3. Under **Authentication → Providers → Email**, make sure email sign-in / magic-link authentication is enabled. Supabase's default email flow uses a magic link; emails can be subject to rate limits.
4. In **Authentication → URL Configuration**, set **Site URL** to your final GitHub Pages URL, e.g. `https://YOUR-USERNAME.github.io/myco-field-lab/`. Also add that exact URL under **Redirect URLs**. An email magic link must redirect to the deployed website.
5. Under **Project Settings → API Keys** (or project Connect/API keys page), copy the **Project URL** and **publishable key** (`sb_publishable_...`), or legacy `anon` key. **Never copy `service_role` or `sb_secret_...` into the website.**

## Step 2 — Set up the website on GitHub Pages

1. Create a GitHub repository such as `myco-field-lab`.
2. Extract the ZIP. Copy the website files into the repository root: `index.html`, `styles.css`, `app.js`, `cloud.js`, `config.js`, `sw.js`, `manifest.webmanifest`. (You may also add this README. You do **not** need to publish `supabase_setup.sql`.)
3. Optional but recommended: open `config.js` and paste your Supabase Project URL and **publishable** key. These two values are safe in client-side files *because the SQL script enables RLS*. If you prefer to keep them out of GitHub, leave config.js blank and enter them later on each device from the Cloud Sync page.
4. On GitHub, go to **Settings → Pages → Deploy from a branch → main → /(root) → Save**. Open your website URL when deployed. GitHub Pages may make the site code public, but farm records and photos remain private to your Supabase account.
5. On the website, open **Cloud sync**. If `config.js` is blank, enter your URL and publishable key and choose **Save configuration & reconnect**. Then enter your email and select **Email me a sign-in link**. Open the sign-in link **on the same device/browser where you requested it** to return to your dashboard.

## Step 3 — Move your existing local records into the cloud

1. On the original device/browser containing your farm entries, open the dashboard and **download a Full Backup** first; keep it somewhere safe outside the website.
2. Sign in with your Supabase email. If this is a new cloud project, the dashboard will say **Cloud is empty**.
3. Select **Upload this device to cloud**. This uploads the purchasing, setup, readings, bag statuses, incidents and harvests. Existing device photos will also upload to the private bucket.
4. Wait until the top status shows **Cloud synced · Private** and go to **Cloud sync → Upload pending photos** to retry any photos that failed.
5. On your second device, open the same GitHub Pages URL and sign in with the **same email**. If the device has no existing records, it loads the cloud trial and photo gallery automatically.

**Important:** A local-versus-cloud conflict is paused instead of silently overwriting either. Export a backup, review which copy is correct, then select **Load cloud onto this device** or **Upload this device to cloud**. Do not edit simultaneously on two devices. The cloud save uses an atomic revision check so stale updates are rejected. **Reload the second device to fetch new entries before editing it.**

## Data storage and security

- **Text/checklists:** `public.myco_trial_state` in Supabase Postgres as private JSONB per authenticated user. A revision counter prevents accidental concurrent overwrites.
- **Photo metadata:** `public.myco_photos` in Supabase Postgres, per user.
- **Images:** `myco-photos` PRIVATE Supabase Storage bucket, in a folder named after the signed-in user's ID, accessed through temporary signed URLs.
- **Offline cache:** browser `localStorage` and `IndexedDB`. The cache **remains on your device when you sign out**; use only trusted personal devices and clear this site's browser data if you want to erase the device cache (after syncing/backing up first).
- **Backups:** use **Reports & Backup → Full backup** routinely. It includes synced remote photos when online. There is no automatic permanent archival or cross-user sharing.
- **Keys:** a Supabase *publishable* key is intended to be visible in browser code; it is NOT a database password. Per-user RLS is crucial. Never commit project passwords, secret keys, JWTs or photo backup files.
- **Offline:** saved local records are available, but cloud sync only works when online; the app tries to sync on reconnection via subsequent actions or reloading. Confirm status is synced before switching devices.

## Troubleshooting

- **"Cloud not configured"**: enter your Project URL and publishable key on the Cloud Sync page, or add them to config.js then redeploy.
- **"relation myco_trial_state does not exist" / missing function / permission error**: run `supabase_setup.sql` in the *same* Supabase project you connected.
- **No sign-in email**: check spam, Auth email provider configuration, rate limits and the registered Redirect URL. Supabase may require a custom SMTP provider for higher volume.
- **Photos upload denied**: ensure the `myco-photos` bucket is **private**, the storage RLS policies were created, and you're signed in with the expected account.
- **Data differs between devices**: do not force overwrite; download a backup and pick the correct latest version in Cloud Sync.
- **Site shows old version**: reload with cache refresh; service worker uses network-first caching for the app shell.

## Safety and growing guidance

Read temperature and humidity at **bag height**. Metal roofs can radiate heat even when direct sun is blocked. Milky and tropical oyster fruiting conditions differ; follow the spawn supplier's target. Avoid excessive water and stagnant air. Remove suspicious contaminated bags without opening them in the growing area. This dashboard supports record keeping; it does not identify infections or certify food safety.

# BloodKit + Supabase setup

## 1. Create a Supabase project
https://supabase.com/dashboard → New project

## 2. Run the schema
Supabase Dashboard → SQL Editor → paste and run `supabase/schema.sql`

## 3. Enable Google Auth

### Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. Create **OAuth 2.0 Client ID** → Application type: **Web application**
3. Under **Authorized redirect URIs**, add **exactly** (replace with your project ref):

   ```
   https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
   ```

   Example for project `xrsqfnqvjhrkngzeuuua`:

   ```
   https://xrsqfnqvjhrkngzeuuua.supabase.co/auth/v1/callback
   ```

   Copy this from Supabase → Authentication → Providers → Google (Callback URL field).

4. Optional: add **Authorized JavaScript origins** for local dev:
   - `http://localhost:3000`

5. Copy **Client ID** and **Client Secret**

### Supabase Dashboard
1. Authentication → Providers → Google → Enable
2. Paste Google Client ID + Client Secret → Save
3. Authentication → URL Configuration:
   - **Site URL:** `http://localhost:3000`
   - **Redirect URLs:** add `http://localhost:3000/auth/callback`

## Troubleshooting: "doesn't comply with Google's OAuth 2.0 policy"

Google is rejecting the redirect URI. Fix:

1. Open Google Cloud Console → your OAuth client → **Authorized redirect URIs**
2. Add the Supabase callback URL shown in the error (e.g. `https://xrsqfnqvjhrkngzeuuua.supabase.co/auth/v1/callback`)
3. Save, wait 1–2 minutes, try sign-in again
4. If the app is in **Testing**, add your Google account under OAuth consent screen → **Test users**

Do **not** put `http://localhost:3000/auth/callback` in Google redirect URIs — that goes in Supabase Redirect URLs only.

## 4. Env vars
Copy `.env.example` → `.env.local` and fill:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 5. Restart
`npm run dev`

Google login now goes through Supabase Auth. Blood requests + donor profiles sync in realtime via Supabase.

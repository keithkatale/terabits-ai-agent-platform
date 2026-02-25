# Google sign-in for the site (Auth.js)

The app supports **Sign in with Google** for site authentication using **Auth.js (NextAuth v5)**. This is separate from the Gmail integration (which uses its own OAuth flow for "Connect Gmail").

## What you need

1. **Google Cloud OAuth client** — You can use the same OAuth 2.0 Client ID as for Gmail, or create a separate one. Add the **Auth.js callback** redirect URI below to that client’s **Authorized redirect URIs**.
2. **Env vars** — `AUTH_SECRET` plus Google credentials (or reuse Gmail vars).

## Redirect URI for site sign-in

Auth.js uses this callback URL. Add it **exactly** in [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → your OAuth 2.0 Client ID → **Authorized redirect URIs**:

- **Local:** `http://localhost:3000/api/auth/callback/google`
- **Production:** `https://<your-domain>/api/auth/callback/google`

(Replace `<your-domain>` with your real app host; it must match `NEXT_PUBLIC_APP_URL`.)

So you can have **two** redirect URIs on the same client:

1. `http://localhost:3000/api/auth/callback/google` — site sign-in (Auth.js)
2. `http://localhost:3000/api/integrations/gmail/callback` — Gmail integration

(And the same for production with `https` and your domain.)

## Environment variables

In `.env.local` (and in production):

```bash
# Required for Auth.js (Google sign-in)
AUTH_SECRET=your-random-secret-at-least-32-chars

# Google OAuth — use same as Gmail or separate client
AUTH_GOOGLE_ID=your-client-id.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=your-client-secret
```

If `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` are not set, Auth.js falls back to `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (so one set of vars can be used for both site sign-in and Gmail).

Generate a secret:

```bash
npx auth secret
```

## After setup

1. Restart the dev server.
2. Open **Sign in** (e.g. `/auth/login`).
3. Click **Sign in with Google** — you should be sent to Google and then back to the app.

If you see **Error 400: redirect_uri_mismatch**, add the exact callback URL above to your OAuth client’s redirect URIs (no trailing slash, correct scheme and host).

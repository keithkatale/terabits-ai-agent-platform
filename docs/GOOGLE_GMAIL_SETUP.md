# Google & Gmail integration setup

This guide walks you through setting up **Google OAuth** so users can connect their Gmail and send email through the assistant (Gmail send tool).

## What’s already in the app

- **Gmail OAuth flow**: Connect (redirect to Google) → Callback (exchange code for tokens) → Store in `user_integrations`
- **Gmail send**: `gmail_send` tool uses the user’s stored tokens to send email via Gmail API
- **UI**: Account/Settings → “Connect Gmail” / “Disconnect Gmail”

You only need to create OAuth credentials in Google Cloud and add two env vars.

---

## 1. Create a Google Cloud project (if you don’t have one)

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project or select an existing one (e.g. “Terabits”).
3. Note the **Project name**; you’ll use the same project for OAuth and (optionally) other Google APIs later.

---

## 2. Enable the Gmail API

1. In the Cloud Console, go to **APIs & Services** → **Library**.
2. Search for **Gmail API** and open it.
3. Click **Enable** for your project.

---

## 3. Configure the OAuth consent screen

1. Go to **APIs & Services** → **OAuth consent screen**.
2. Choose **External** (or **Internal** if you use Google Workspace and only want your org).
3. Fill in:
   - **App name**: e.g. “Terabits”
   - **User support email**: your email
   - **Developer contact**: your email
4. Under **Scopes**, click **Add or remove scopes** and add:
   - `https://www.googleapis.com/auth/gmail.send`
   (This allows “Send email on your behalf” only.)
5. Save. If External, you may see “Publishing status: Testing”. For testing, add your own email (and any test users) under **Test users**. For production (so any user can connect Gmail without “unverified app” warnings), you must add **Terms of Service** and **Privacy Policy** URLs and submit for verification — see [GOOGLE_OAUTH_VERIFICATION.md](./GOOGLE_OAUTH_VERIFICATION.md). This app exposes those at `/terms` and `/privacy`.

---

## 4. Create OAuth 2.0 credentials

1. Go to **APIs & Services** → **Credentials**.
2. Click **Create credentials** → **OAuth client ID**.
3. **Application type**: **Web application**.
4. **Name**: e.g. “Terabits web”.
5. Under **Authorized redirect URIs** add **exactly** (no trailing slash, correct scheme/host/port):
   - **Local**: `http://localhost:3000/api/integrations/gmail/callback`
   - **Production**: `https://your-domain.com/api/integrations/gmail/callback`
   (Replace `your-domain.com` with your real app URL; it must match `NEXT_PUBLIC_APP_URL`.)
   **Important:** If you get **Error 400: redirect_uri_mismatch**, the URI in the request must match one of these character-for-character. Use `http` (not `https`) for localhost. Use `localhost` (not `127.0.0.1`) if your app uses `NEXT_PUBLIC_APP_URL=http://localhost:3000`.
6. Click **Create**.
7. Copy the **Client ID** and **Client secret** (you’ll put these in `.env.local`).

---

## 5. Add environment variables

In your app’s `.env.local` (and in production, e.g. Vercel/Railway):

```bash
# Google OAuth — required for Gmail connect & gmail_send tool
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

- **GOOGLE_CLIENT_ID**: OAuth 2.0 Client ID from step 4.
- **GOOGLE_CLIENT_SECRET**: OAuth 2.0 Client secret from step 4.

Restart the dev server after changing env vars.

---

## 6. Verify in the app

1. Open the app and sign in.
2. Go to **Account** (or **Settings** → Account).
3. Click **Connect Gmail**.
4. You should be redirected to Google, see the consent screen for “Send email on your behalf”, and after approving be redirected back with “Gmail connected”.
5. In chat, ask the assistant to “Send an email to …” and confirm it uses Gmail (when the `gmail_send` tool is enabled).

---

## Optional: Google Workspace (Calendar, Drive, etc.)

The codebase has **Gmail** wired with OAuth (user connects their account). Other Google tools (e.g. **Google Calendar**, **Google Drive**) are listed in the tool catalog as “coming soon” and may use either:

- **Same OAuth app**: Add more scopes (e.g. `https://www.googleapis.com/auth/calendar.events`) and new redirect/callback routes per product, or a single “Google” integration with multiple scopes.
- **Service account**: For server-to-server or domain-wide access (e.g. impersonating users in Workspace), you’d create a **Service account** in the same project, enable the right APIs (Calendar, Drive, etc.), and use `GOOGLE_SERVICE_ACCOUNT_KEY` (JSON) for server-side only. That’s a different flow from “user connects their Gmail” and would be implemented when you add those tools.

For **Gmail only**, the steps above are enough.

---

## Troubleshooting

| Issue | What to check |
|-------|----------------|
| “Gmail integration is not configured” | `GOOGLE_CLIENT_ID` (and optionally `GOOGLE_CLIENT_SECRET`) set in `.env.local` and server restarted. |
| Redirect URI mismatch (Error 400) | The redirect URI sent by the app must match **exactly** one entry in Google Console. For local dev with `NEXT_PUBLIC_APP_URL=http://localhost:3000`, add `http://localhost:3000/api/integrations/gmail/callback` (no trailing slash, `http` not `https`, `localhost` not `127.0.0.1`). |
| “Access blocked: This app’s request is invalid” | OAuth consent screen configured; redirect URI added; correct client ID/secret. |
| “Gmail is not connected” when sending | User has clicked Connect Gmail and completed consent; `user_integrations` has a row for that user with `provider: 'gmail'` and a refresh token. |

---

## Summary

1. Create/select project in Google Cloud.
2. Enable Gmail API.
3. Configure OAuth consent screen and add scope `gmail.send`.
4. Create OAuth client (Web application) and add redirect URI for `/api/integrations/gmail/callback`.
5. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env.local`.
6. Use “Connect Gmail” in Account to connect; then the assistant can send email via Gmail.

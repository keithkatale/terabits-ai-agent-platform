# Google OAuth app verification (Gmail & sensitive scopes)

When your app uses **sensitive or restricted** Google OAuth scopes (e.g. Gmail send, read email, Google Drive), Google may show users an “unverified app” warning or block access until the app is **verified**. This guide explains how to add the required policy URLs to your app and how to submit your app for verification in Google Cloud.

---

## Why verification is needed

- **Testing mode**: Up to 100 test users can use your app without verification. Good for development.
- **Production**: If you want **any** Google user to connect Gmail (or other sensitive scopes) without the “This app isn’t verified” screen, you must submit your app for **Google verification**.

Verification confirms that your app correctly discloses how it uses user data and complies with Google’s API Services User Data Policy.

---

## 1. Add Terms of Service and Privacy Policy URLs

Google requires **live, publicly accessible** URLs for:

- **Privacy Policy**
- **Terms of Service** (or Terms and Conditions)

In this app we added:

- **Terms of Service**: `https://your-domain.com/terms`
- **Privacy Policy**: `https://your-domain.com/privacy`

Replace `your-domain.com` with your real production domain (e.g. the value of `NEXT_PUBLIC_APP_URL` in production).

### Where to add these in Google Cloud

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → your project.
2. Open **APIs & Services** → **OAuth consent screen**.
3. Under **App information** (or when editing the consent screen), fill in:
   - **Application home page**: Your app’s homepage (e.g. `https://your-domain.com`).
   - **Application privacy policy link**: `https://your-domain.com/privacy`
   - **Application terms of service link**: `https://your-domain.com/terms`
4. Save.

If you use **Google Cloud’s “OAuth consent screen”** configuration, there is also a **Developer contact information** section — use a real email (e.g. support@your-domain.com) so Google can reach you during verification.

---

## 2. What’s in this app’s policy pages

- **`/terms`** (Terms of Service): Covers acceptance, description of the service, account eligibility, acceptable use, third-party services (including Google/Gmail), IP, disclaimers, liability, changes, and contact.
- **`/privacy`** (Privacy Policy): Covers what we collect, how we use it, Google/Gmail usage, retention, security, sharing, user rights, and contact.

You should review and customize both pages for your product and jurisdiction (e.g. add company name, address, and a real contact email).

---

## 3. Submitting your app for verification

1. **Finish OAuth consent screen**  
   Ensure the consent screen has:
   - App name (e.g. “TeraBits AI”)
   - User support email
   - Developer contact email
   - **Home page**, **Privacy Policy**, and **Terms of Service** URLs (as above)
   - All scopes you use (e.g. `https://www.googleapis.com/auth/gmail.send`) added under Scopes

2. **Prepare for the verification form**  
   Google will ask for:
   - **App homepage URL**
   - **Privacy Policy URL**
   - **Terms of Service URL**
   - **Explanation of use**: A short description of why your app needs each sensitive scope (e.g. “We use Gmail send so the AI assistant can send emails on the user’s behalf when they ask it to.”)
   - **Demo video** (optional but helpful): A short screen recording showing how a user connects Gmail and how the app uses the “Send email” capability. This can reduce back-and-forth with Google.
   - **Domain ownership**: Sometimes they ask you to prove you own the domain (e.g. via a file in `/.well-known/` or DNS). Have your domain ready.

3. **Start verification**  
   - In **APIs & Services** → **OAuth consent screen**, if your app is **External** and in **Testing**, you’ll see an option to **Publish app** or **Prepare for verification**.
   - Click **Prepare for verification** (or equivalent) and fill in the form with the URLs and explanations above.
   - Submit. Google reviews typically take from a few days to a few weeks. They may email you with questions; reply using the developer contact email.

4. **After approval**  
   Once verified, the “This app isn’t verified” warning should no longer appear for your app, and users can connect Gmail (and other approved scopes) without being blocked.

---

## 4. Quick checklist

| Item | Where |
|------|--------|
| Terms of Service | App: `/terms` → use `https://your-domain.com/terms` in Google Console |
| Privacy Policy | App: `/privacy` → use `https://your-domain.com/privacy` in Google Console |
| Home page | Use `https://your-domain.com` in OAuth consent screen |
| Support / developer email | OAuth consent screen → App information & Developer contact |
| Scope justification | Written in the verification form (why you need e.g. `gmail.send`) |
| Demo video (optional) | Upload or link when submitting for verification |

---

## 5. References

- [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy)
- [OAuth consent screen configuration](https://support.google.com/cloud/answer/10311615)
- [Verification process for sensitive scopes](https://support.google.com/cloud/answer/9110914)

Once your Terms and Privacy URLs are live and added in the OAuth consent screen, you can submit your app for verification so Gmail (and other sensitive scopes) work for all users without the unverified-app warning.

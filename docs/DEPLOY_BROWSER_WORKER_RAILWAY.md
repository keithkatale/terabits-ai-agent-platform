# Deploy the browser worker to Railway (step-by-step)

You deploy **only** the browser worker (`services/browser-worker`) to Railway. Your main Terabits app stays on Vercel.

---

## Before you start

- You need a **Railway account**: [railway.app](https://railway.app) → sign up (GitHub login is fine).
- The browser worker code is in its own repo: **[github.com/keithkatale/browser-worker](https://github.com/keithkatale/browser-worker)**. You can deploy that repo directly (no root directory needed). If your worker lives inside your main app repo under `services/browser-worker`, use that repo and set Root Directory to `services/browser-worker` (see below).

---

## Step 1: Open Railway and create a project

1. Go to [railway.app](https://railway.app) and log in.
2. Click **“New Project”** (or “Start a New Project”).
3. Choose **“Deploy from GitHub repo”**.
4. If asked, connect your GitHub account and allow Railway to access your repos.
5. Select the **browser-worker** repository: **keithkatale/browser-worker** (so the repo root is the worker; no root directory needed).  
   *Alternatively*, select your main Terabits repo and in the next step set Root Directory to `services/browser-worker`.
6. Click **“Deploy now”** or **“Add service”**.

---

## Step 2: Root directory (only if you use your main app repo)

If you deployed from **keithkatale/browser-worker**, skip this step—the repo root is already the worker.

If you deployed from your **Terabits app repo**:

1. Open the new service (click on it in the project).
2. Go to **Settings** (or the **⚙️** tab).
3. Find **“Root Directory”** and set it to: `services/browser-worker`.
4. Save / apply if there’s a button.

---

## Step 3: Set build and start commands

Still in the service **Settings**:

1. **Build Command**  
   Set to:
   ```text
   npm install
   ```
   (If Railway already filled something like `npm install` or left it empty, that’s fine. The important part is that the root is `services/browser-worker` so this runs inside that folder.)

2. **Start Command** (or “Run”)  
   Set to:
   ```text
   npm start
   ```
   That runs `node src/index.js` for the worker.

3. **Watch Paths** (optional)  
   You can leave default or set to `services/browser-worker` so only changes in the worker trigger redeploys.

Save if needed.

---

## Step 4: Set the port (usually automatic)

1. In the same service, open **Variables** (or “Env” / “Environment”).
2. Railway usually injects **`PORT`** automatically. You don’t need to add it unless it’s missing.
3. If you see no `PORT`, add a variable:
   - Name: `PORT`  
   - Value: `3030`

The worker reads `process.env.PORT` and listens on it. Do not set `ENV PORT` in the Dockerfile—that overrides the platform port and causes 502 (the worker must use Railway's injected PORT).

---

## Step 5: Deploy and get the URL

1. Trigger a deploy if one didn’t start: **“Deploy”** or **“Redeploy”** (or push a commit to the repo after connecting).
2. Wait until the deploy finishes (logs should show “Listening on port …” or similar).
3. Open the **Settings** (or “Networking”) for this service and find **“Public Networking”** or **“Generate domain”**.
4. Click **“Generate domain”** (or “Add domain”). Railway will assign a URL like:
   ```text
   https://your-service-name.up.railway.app
   ```
5. Copy that URL (no path), e.g. `https://terabits-browser-worker.up.railway.app`.  
   This is your **BROWSER_WORKER_URL**.

---

## Step 6: Add the URL to your Terabits app (Vercel)

1. Open your **Vercel** project for the Terabits app.
2. Go to **Settings → Environment Variables**.
3. Add:
   - **Name:** `ENABLE_BROWSER_AUTOMATION`  
     **Value:** `true`
4. Add:
   - **Name:** `BROWSER_WORKER_URL`  
     **Value:** the URL you copied (e.g. `https://your-service-name.up.railway.app`)  
     No trailing slash.
5. Save and **redeploy** the Vercel app so it picks up the new variables.

---

## Step 7: Check that it works

1. **Health check**  
   In a browser or with curl, open:
   ```text
   https://your-railway-url.up.railway.app/health
   ```
   You should see something like: `{"ok":true,"service":"terabits-browser-worker"}`.

2. **In Terabits**  
   Use the Assistant or a workflow and ask it to do something that uses the browser (e.g. “Open example.com and take a snapshot”). If the tool runs and returns steps/screenshots, the worker is working.

---

## If the deploy fails or the worker crashes

- **“Cannot find Chromium” / Playwright errors**  
  Railway’s default Node image may not have Playwright’s browser. Two options:
  - **Option A:** In Railway, set **Build Command** to:
    ```text
    npm install && npx playwright install chromium
    ```
  - **Option B:** Use the Dockerfile in `services/browser-worker` and switch the service to **Dockerfile** as the build (Railway supports “Deploy from Dockerfile” and will use the Dockerfile in the root directory you set, i.e. `services/browser-worker`).

- **Out of memory**  
  In Railway, give the service more memory in the service **Settings** if available on your plan.

- **Timeout**  
  Worker runs can take a while. Ensure the start command is `npm start` and that you didn’t override `PORT` with something Railway doesn’t use.

---

## Optional: lock the worker with a secret

1. In **Railway** → your worker service → **Variables**, add:
   - **Name:** `BROWSER_WORKER_SECRET`  
   - **Value:** a long random string (e.g. from a password generator).
2. In **Vercel** → your Terabits project → **Environment Variables**, add the **same** value:
   - **Name:** `BROWSER_WORKER_SECRET`  
   - **Value:** (same as on Railway)
3. Redeploy both if needed. After that, only requests that send this secret in the `Authorization` header will be accepted by the worker.

---

## Quick checklist

- [ ] Railway project created and connected to your GitHub repo.
- [ ] Service **Root Directory** set to `services/browser-worker`.
- [ ] **Build:** `npm install` (and optionally `npx playwright install chromium` if needed).
- [ ] **Start:** `npm start`.
- [ ] **Public domain** generated and URL copied.
- [ ] Vercel env: `ENABLE_BROWSER_AUTOMATION=true`, `BROWSER_WORKER_URL=https://….up.railway.app`.
- [ ] Vercel app redeployed.
- [ ] `/health` returns `{"ok":true}` and a browser task works in the app.

That’s it. Only the browser worker runs on Railway; the rest of Terabits stays on Vercel.

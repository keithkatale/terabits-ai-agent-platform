# GCP Deployment Guide

This guide covers deploying the Terabits AI platform (Next.js app + agent worker) to Google Cloud Platform: Cloud Run for the app and worker, Cloud Scheduler for cron and worker polling, and Supabase for auth/DB/storage (unchanged).

---

## Where do I set environment variables? (UI vs terminal)

You can do either of the following — you don't need both.

- **Using the UI (project settings)**  
  If you already set variables in your project’s **Environment variables** (e.g. Cloud Run → your service → Edit → Variables & Secrets, or your host’s dashboard), that’s enough. You do **not** need to run any bash commands for env vars. Just make sure the **names** match exactly what the app expects (see list below).  
  - The app expects **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** (the Supabase “anon” / public key). If you only have something like `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, add a variable named **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** with the same anon key value from [Supabase → Project Settings → API](https://supabase.com/dashboard/project/_/settings/api).  
  - You also need **`SUPABASE_SERVICE_ROLE_KEY`** (the secret “service_role” key from the same Supabase API page) for server-only actions.

- **Using the terminal (optional)**  
  The **bash** commands in this doc are meant to be run in a **terminal**: on your Mac (Terminal or iTerm), or in the browser via [Google Cloud Shell](https://shell.cloud.google.com) (no install needed). They’re an alternative way to create secrets and deploy. If you prefer the UI, ignore those commands and use the project settings instead.

**Required variables for the app (names must match):**

| Name | Where to get it |
|------|------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon / public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role key (secret) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Google AI Studio / Cloud Console |
| `NEXT_PUBLIC_APP_URL` | Your Cloud Run app URL (e.g. `https://terabits-app-xxx.run.app`) |
| `CRON_SECRET` | Any random string you choose (same value for Scheduler later) |

---

## Step-by-step deployment (exact order)

Follow these steps in order. Replace `YOUR_PROJECT_ID`, `YOUR_REGION`, and placeholder values (e.g. Supabase URL, secrets) with your real values.

### Step 0: Prerequisites (one-time)

1. **Create a GCP project** at [console.cloud.google.com](https://console.cloud.google.com) and enable billing.
2. **Install gcloud CLI**: [Install the Google Cloud CLI](https://cloud.google.com/sdk/docs/install).
3. **Log in and set project**:
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```
4. **Enable required APIs**:
   ```bash
   gcloud services enable run.googleapis.com
   gcloud services enable cloudbuild.googleapis.com
   gcloud services enable secretmanager.googleapis.com
   gcloud services enable cloudscheduler.googleapis.com
   ```
5. **Configure Docker for GCR** (so you can push images):
   ```bash
   gcloud auth configure-docker
   ```
6. **Create secrets in Secret Manager** (replace with your real values):
   ```bash
   echo -n "YOUR_SUPABASE_SERVICE_ROLE_KEY" | gcloud secrets create supabase-service-role --data-file=-
   echo -n "YOUR_SUPABASE_ANON_KEY"          | gcloud secrets create supabase-anon-key --data-file=-
   echo -n "YOUR_GOOGLE_AI_API_KEY"          | gcloud secrets create google-ai-key --data-file=-
   echo -n "YOUR_CRON_SECRET"                | gcloud secrets create cron-secret --data-file=-
   ```
   **Important:** The app needs **both** the Supabase **anon key** (for browser/SSR client) and the **service role key** (for server-only admin). Get both from [Supabase Dashboard → Project Settings → API](https://supabase.com/dashboard/project/_/settings/api).

### Step 1: Build and push Docker images

From the **terabits-ai** directory (app root).

**Important:** The app image **must** be built with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as **build arguments**. In Next.js, `NEXT_PUBLIC_*` variables are baked into the client JavaScript at **build time**. If they’re only set at runtime (e.g. in Cloud Run env vars), the browser receives code with `undefined` for those values, so the app fails on first load (no cookies) and only works when a session already exists. Passing them during `docker build` fixes that.

```bash
export PROJECT_ID=YOUR_PROJECT_ID
export REGION=us-central1
# Use your real values (same as in project settings)
export NEXT_PUBLIC_SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...."
export NEXT_PUBLIC_APP_URL="https://terabits-app-XXXXX-${REGION}.a.run.app"

# App image — pass build args so client bundle has Supabase URL and anon key
docker build -t gcr.io/${PROJECT_ID}/terabits-app \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  --build-arg NEXT_PUBLIC_APP_URL="$NEXT_PUBLIC_APP_URL" \
  .
docker push gcr.io/${PROJECT_ID}/terabits-app

# Worker image (build context = app root)
docker build -f worker/Dockerfile -t gcr.io/${PROJECT_ID}/terabits-worker .
docker push gcr.io/${PROJECT_ID}/terabits-worker
```

If you use **Cloud Build** (e.g. trigger from GitHub), configure substitution variables for these values and pass them as build-args in your build config so the app image is built with them.

### Step 2: Deploy the Next.js app to Cloud Run

```bash
gcloud run deploy terabits-app \
  --image gcr.io/${PROJECT_ID}/terabits-app \
  --region ${REGION} \
  --platform managed \
  --allow-unauthenticated \
  --memory 1Gi \
  --timeout 300 \
  --min-instances 0 \
  --max-instances 10 \
  --set-env-vars "NODE_ENV=production" \
  --set-env-vars "NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL" \
  --set-env-vars "NEXT_PUBLIC_APP_URL=https://terabits-app-XXXXX-${REGION}.a.run.app" \
  --set-secrets "SUPABASE_SERVICE_ROLE_KEY=supabase-service-role:latest" \
  --set-secrets "GOOGLE_GENERATIVE_AI_API_KEY=google-ai-key:latest" \
  --set-secrets "CRON_SECRET=cron-secret:latest" \
  --set-secrets "NEXT_PUBLIC_SUPABASE_ANON_KEY=supabase-anon-key:latest"
```

After deploy, copy the **Service URL** from the output (e.g. `https://terabits-app-xxxxx-uc.a.run.app`), then update the service to use it:

```bash
gcloud run services update terabits-app --region ${REGION} \
  --set-env-vars "NEXT_PUBLIC_APP_URL=https://terabits-app-XXXXX-${REGION}.a.run.app"
```

(Replace `XXXXX` with your actual service hash from the URL.)

### Step 3: Deploy the agent worker (Cloud Run Service)

```bash
gcloud run deploy terabits-worker \
  --image gcr.io/${PROJECT_ID}/terabits-worker \
  --region ${REGION} \
  --platform managed \
  --no-allow-unauthenticated \
  --memory 1Gi \
  --min-instances 0 \
  --max-instances 1 \
  --set-env-vars "NODE_ENV=production" \
  --set-env-vars "NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL" \
  --set-env-vars "NEXT_PUBLIC_APP_URL=https://terabits-app-XXXXX-${REGION}.a.run.app" \
  --set-secrets "SUPABASE_SERVICE_ROLE_KEY=supabase-service-role:latest" \
  --set-secrets "GOOGLE_GENERATIVE_AI_API_KEY=google-ai-key:latest"
```

### Step 4: Create the cron scheduler job

Use the **exact** app URL from Step 2 and the same value you stored in the `cron-secret` secret:

```bash
gcloud scheduler jobs create http terabits-cron \
  --location ${REGION} \
  --schedule "* * * * *" \
  --uri "https://terabits-app-XXXXX-${REGION}.a.run.app/api/cron/run-scheduled" \
  --http-method GET \
  --headers "x-cron-secret=YOUR_CRON_SECRET"
```

### Step 5: Post-deploy

1. **Supabase**: In **Authentication → URL configuration**, add your Cloud Run app URL to **Redirect URLs** and set **Site URL** if needed.
2. **Run DB migration**: In Supabase SQL Editor, run the contents of `supabase/migrations/20260228_assistant_run_jobs.sql` (or run `npm run db:migrate` pointing at your Supabase DB).
3. **Smoke test**: Open your app URL, sign in, send a chat message; then (optional) trigger an async run and confirm the stream loads.

---

## Prerequisites (reference)

- **GCP project** with billing enabled
- **gcloud CLI** installed and authenticated (`gcloud auth login`, `gcloud config set project PROJECT_ID`)
- **Docker** (for local build) or **Cloud Build** (for `gcloud builds submit`)
- **Supabase** project (auth, DB, storage) — no migration required; keep using your existing Supabase URL and keys

---

## Environment variables

Set these in Cloud Run (or Secret Manager) for both the **app** and **worker** services.

### Required (app + worker)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase **anon** (public) key — required for browser/SSR Supabase client; get from Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (bypasses RLS; used by worker and cron) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Google AI (Gemini) API key |
| `NEXT_PUBLIC_APP_URL` | Full app URL (e.g. `https://terabits-app-xxx.run.app` or your custom domain) |

### Required for app only

| Variable | Description |
|----------|-------------|
| `CRON_SECRET` | Shared secret for Cloud Scheduler to call `/api/cron/run-scheduled` |

### Optional (features)

| Variable | Description |
|----------|-------------|
| `SERPER_API_KEY` | Web search (Serper) |
| `ENABLE_BROWSER_AUTOMATION` | Set to `true` to enable browser automation |
| `RESEND_API_KEY`, `EMAIL_FROM` | Send email tool |
| `SLACK_BOT_TOKEN` / `SLACK_WEBHOOK_URL` | Slack tool |
| `DISCORD_WEBHOOK_URL` | Discord tool |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Gmail OAuth (see docs/GOOGLE_GMAIL_SETUP.md) |
| Dodo Payments | `DODO_API_KEY`, `DODO_API_URL`, `DODO_WEBHOOK_SECRET` (see .env.dodo.example) |
| `SANDBOX_API_URL`, `SANDBOX_API_KEY` | Sandbox for `run_command` tool (e.g. E2B, Modal, or custom endpoint) |

Store secrets in **Secret Manager** and reference them in Cloud Run (e.g. `SUPABASE_SERVICE_ROLE_KEY` → Secret Manager secret).

---

## 1. Build and push images

From the **terabits-ai** directory (app root):

```bash
export PROJECT_ID=your-gcp-project-id
export REGION=us-central1

# App image
docker build -t gcr.io/${PROJECT_ID}/terabits-app .
docker push gcr.io/${PROJECT_ID}/terabits-app

# Worker image (build context = app root)
docker build -f worker/Dockerfile -t gcr.io/${PROJECT_ID}/terabits-worker .
docker push gcr.io/${PROJECT_ID}/terabits-worker
```

Or use **Artifact Registry**:

```bash
gcloud artifacts repositories create terabits --repository-format=docker --location=${REGION}
docker tag gcr.io/${PROJECT_ID}/terabits-app ${REGION}-docker.pkg.dev/${PROJECT_ID}/terabits/terabits-app
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/terabits/terabits-app
```

---

## 2. Deploy Next.js app (Cloud Run service)

```bash
gcloud run deploy terabits-app \
  --image gcr.io/${PROJECT_ID}/terabits-app \
  --region ${REGION} \
  --platform managed \
  --allow-unauthenticated \
  --memory 1Gi \
  --timeout 300 \
  --min-instances 0 \
  --max-instances 10 \
  --set-env-vars "NODE_ENV=production" \
  --set-env-vars "NEXT_PUBLIC_APP_URL=https://terabits-app-XXXXX-${REGION}.a.run.app" \
  --set-env-vars "NEXT_PUBLIC_SUPABASE_URL=..." \
  --set-secrets "SUPABASE_SERVICE_ROLE_KEY=supabase-service-role:latest" \
  --set-secrets "GOOGLE_GENERATIVE_AI_API_KEY=google-ai-key:latest" \
  --set-secrets "CRON_SECRET=cron-secret:latest"
```

After the first deploy, note the service URL and set `NEXT_PUBLIC_APP_URL` to that URL (and add it to Supabase redirect/site URLs).

---

## 3. Deploy agent worker (Cloud Run Job or Service)

The worker polls `assistant_run_jobs` and runs the same streamText flow as the chat API, writing events to `assistant_run_events`.

### Option A: Cloud Run Job (scheduled)

Create a **Job** that runs the worker script once per invocation; trigger it every 1–2 minutes with Cloud Scheduler.

```bash
gcloud run jobs create terabits-worker \
  --image gcr.io/${PROJECT_ID}/terabits-worker \
  --region ${REGION} \
  --memory 1Gi \
  --task-timeout 3600 \
  --set-env-vars "NODE_ENV=production" \
  --set-env-vars "NEXT_PUBLIC_SUPABASE_URL=..." \
  --set-secrets "SUPABASE_SERVICE_ROLE_KEY=supabase-service-role:latest" \
  --set-secrets "GOOGLE_GENERATIVE_AI_API_KEY=google-ai-key:latest"
```

Then schedule the job (e.g. every 2 minutes):

```bash
gcloud scheduler jobs create http terabits-worker-trigger \
  --location ${REGION} \
  --schedule "*/2 * * * *" \
  --uri "https://${REGION}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${PROJECT_ID}/jobs/terabits-worker:run" \
  --http-method POST \
  --oauth-service-account-email ${PROJECT_ID}@appspot.gserviceaccount.com
```

(Adjust the job run URI and OAuth to match [Cloud Run Jobs execution](https://cloud.google.com/run/docs/execute/jobs).)

### Option B: Cloud Run Service (long-lived process)

Deploy the worker as a **Service** that runs continuously and polls in a loop (current `worker/worker.ts` behavior):

```bash
gcloud run deploy terabits-worker \
  --image gcr.io/${PROJECT_ID}/terabits-worker \
  --region ${REGION} \
  --platform managed \
  --no-allow-unauthenticated \
  --memory 1Gi \
  --min-instances 0 \
  --max-instances 1 \
  --set-env-vars "NODE_ENV=production" \
  --set-env-vars "NEXT_PUBLIC_SUPABASE_URL=..." \
  --set-secrets "SUPABASE_SERVICE_ROLE_KEY=supabase-service-role:latest" \
  --set-secrets "GOOGLE_GENERATIVE_AI_API_KEY=google-ai-key:latest"
```

Trigger a poll by calling the service (e.g. from Scheduler) or let it run and poll on its own (current implementation polls every 5s).

---

## 4. Cloud Scheduler: cron (scheduled tasks)

Call your app’s cron endpoint every minute so scheduled tasks run:

```bash
gcloud scheduler jobs create http terabits-cron \
  --location ${REGION} \
  --schedule "* * * * *" \
  --uri "https://terabits-app-XXXXX-${REGION}.a.run.app/api/cron/run-scheduled" \
  --http-method GET \
  --headers "x-cron-secret=YOUR_CRON_SECRET"
```

Use the same `CRON_SECRET` value you set in the app.

---

## 5. Post-deploy

1. **Set `NEXT_PUBLIC_APP_URL`** to your Cloud Run app URL (or custom domain).
2. **Supabase**: Add the app URL to **Authentication → URL configuration** (redirect URLs, site URL).
3. **Run DB migrations** (e.g. `npm run db:migrate` against your Supabase DB, or apply `supabase/migrations/20260228_assistant_run_jobs.sql` in the Supabase dashboard).
4. **Smoke test**:
   - Send a message with `wait: false` (e.g. from a desktop session); you should get `202` with `runId` and `streamUrl`.
   - Open the stream URL (or use the frontend); events should appear as the worker processes the job.

---

## Fix: HTTP 500 "Your project's URL and Key are required to create a Supabase client"

If **every** request returns 500 and logs show that Supabase error, the **server** is not seeing the env vars at runtime. The app reads **only** these exact names:

| Required in Cloud Run (Variables & Secrets) | Used for |
|--------------------------------------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL`                  | Supabase project URL (e.g. `https://xxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`            | Supabase **anon** (public) key from Dashboard → API |
| `SUPABASE_SERVICE_ROLE_KEY`                | Server-only admin operations (optional for some flows but required for assistant/cron) |

**Wrong names that will not work:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PUBLISHABLE_KEY`. The code does not read those.

**What to do:**

1. In Cloud Run → your service → **Edit & deploy new revision** → **Variables & Secrets**.
2. Add or rename so you have **exactly**:
   - Name: `NEXT_PUBLIC_SUPABASE_URL`, Value: your Supabase project URL.
   - Name: `NEXT_PUBLIC_SUPABASE_ANON_KEY`, Value: the **anon** key from Supabase Dashboard → Project Settings → API (the long JWT).
3. Redeploy the revision. New requests will then see the vars and the 500 should stop.

If you use **Secret Manager**, map the secret to the env var name above (e.g. `NEXT_PUBLIC_SUPABASE_ANON_KEY` = secret `supabase-anon-key:latest`). The **name** of the env var in Cloud Run must be exactly `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

---

## Fix: App works with cookies but fails on first load (client-side)

**Symptom:** The app loads when you already have a session (same browser, signed in), but in a new tab or a browser where you’ve never signed in, it shows "Application error" and the console says "Your project's URL and API key are required to create a Supabase client."

**Cause:** In Next.js, `NEXT_PUBLIC_*` variables are **baked into the client JavaScript at build time**. If the Docker image was built **without** those variables (e.g. you only set them in Cloud Run “Environment variables”), the client bundle has `undefined` for the Supabase URL and anon key. So the first time the browser runs that code (no cookies), it fails. With an existing session, some code paths may still work until the client tries to create the Supabase client.

**Fix:** Rebuild the **app image** with the public env vars as **build arguments**, then push and redeploy. Use the same values you have in project settings (Supabase URL and anon key, and your app URL):

```bash
docker build -t gcr.io/YOUR_PROJECT_ID/terabits-app \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="https://YOUR_PROJECT.supabase.co" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...." \
  --build-arg NEXT_PUBLIC_APP_URL="https://terabits-app-XXXXX-us-central1.a.run.app" \
  .
docker push gcr.io/YOUR_PROJECT_ID/terabits-app
```

Then deploy the new image to Cloud Run (or let your pipeline redeploy). After that, first load without cookies should work.

If the error persists and you never passed build args, also ensure the **names** in project settings are exactly `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (not e.g. `SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`).

---

## Troubleshooting

- **502 / timeout**: Increase Cloud Run timeout (e.g. 300s for the app). Long-running runs are handled by the worker; the app only accepts the job and streams events.
- **Worker not picking up jobs**: Ensure the worker has `SUPABASE_SERVICE_ROLE_KEY` and can reach Supabase. Check worker logs in Cloud Run.
- **Cron not firing**: Verify the Scheduler job target URL and `x-cron-secret` header; confirm `CRON_SECRET` matches in the app.
- **Stream by runId returns 404**: Ensure the user owns the run (RLS on `assistant_run_jobs` / `assistant_run_events`); run must exist and not be deleted.
- **run_command tool “not configured”**: Set `SANDBOX_API_URL` (and optionally `SANDBOX_API_KEY`) to a sandbox API that accepts `POST /run` with `{ command, cwd?, timeout_seconds? }` and returns `{ stdout, stderr, exit_code }`.

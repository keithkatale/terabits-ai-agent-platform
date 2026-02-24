# Browser automation (Playwright worker)

The Terabits app can run browser tasks (navigate, click, fill forms, screenshots) by calling a **browser worker** that runs Playwright. The worker runs on Railway, Render, or Fly.io; Vercel only hosts the app and forwards requests.

## 1. Deploy the worker

**Step-by-step for Railway:** see **[DEPLOY_BROWSER_WORKER_RAILWAY.md](./DEPLOY_BROWSER_WORKER_RAILWAY.md)** — create project, set root to `services/browser-worker`, set build/start, get URL, add env vars in Vercel.

Other options: **[services/browser-worker/README.md](../services/browser-worker/README.md)** for:

- Local run: `cd services/browser-worker && npm install && npm run dev`
- Deploy to Railway, Render, or Fly.io
- Optional: set `BROWSER_WORKER_SECRET` on the worker for auth

## 2. Configure the Terabits app

In your app env (e.g. Vercel or `.env.local`):

| Variable | Required | Description |
|----------|----------|-------------|
| `ENABLE_BROWSER_AUTOMATION` | Yes | Set to `true` to enable the tool |
| `BROWSER_WORKER_URL` | Yes | Base URL of the worker (e.g. `https://your-worker.up.railway.app`) |
| `BROWSER_WORKER_SECRET` | No | If set, must match the worker’s `BROWSER_WORKER_SECRET` |

After deployment, the assistant and workflows can use the **Browser automation** tool. Each step returns a screenshot so users see what action was taken (Director-style).

# Browser Worker: Sessions, Wait, and Anti-Bot (Stealth)

## Problems Addressed

1. **Anti-bot / Cloudflare** — The worker gets blocked because:
   - Every tool call currently starts a **new browser** (no session), so no cookies, no history; each request looks like a fresh bot.
   - Default Playwright is easily fingerprinted (`navigator.webdriver`, headless detection, etc.).

2. **Loading / “panic”** — The AI doesn’t wait for pages to load:
   - Worker uses `waitUntil: 'domcontentloaded'` only (DOM ready, resources may still load).
   - No way to wait for a specific element or a few seconds before continuing.
   - So the AI often sees an incomplete page and thinks the step failed.

## How It Can Work

### 1. Sessions (persistent browser per conversation)

- **Create or reuse**: Each `/run` request can include an optional `sessionId`.
  - **No sessionId**: Worker creates a new browser/context/page, runs the steps, returns a **sessionId** in the response, and **keeps the session alive** (same browser for next request).
  - **With sessionId**: Worker reuses that browser/context/page for the steps (cookies, localStorage, and navigation state persist).
- **Lifecycle**: Sessions are stored in memory with a **TTL** (e.g. 15 minutes of inactivity). A background pass or check on each request closes expired sessions.
- **Terabits side**: The `browser_automation` tool accepts an optional `sessionId` in the input and returns `sessionId` in the output so the agent can pass it on the next call. That way one “browser tab” is reused across all steps of a task.

This matches how platforms like Browserbase use persistent sessions to avoid looking like a new bot every request and to keep cookies (e.g. after login).

### 2. Wait behavior (so the AI doesn’t “panic”)

- **Navigate**:
  - Support a **waitUntil** option: `domcontentloaded` | `load` | `networkidle` (default `load` for “page fully loaded”).
  - Support a **timeout** option (e.g. 60s) so slow pages don’t hang forever. `networkidle` can be flaky (SPAs, analytics); prefer `load` by default and document that.
- **New action: `wait`**:
  - **delay**: wait N milliseconds (e.g. 2–5s after a click for dynamic content).
  - **selector** (optional): wait until an element matching the selector is visible (with a timeout), then continue.
- Worker always waits for the chosen load state (or wait action) before taking a screenshot and returning, so the AI gets a stable view and doesn’t assume failure too early.

### 3. Anti-bot / stealth (like Browserbase / Browser Use)

- **playwright-extra + puppeteer-extra-plugin-stealth**: Wraps Playwright to hide automation signals (`navigator.webdriver`, CDP artifacts, etc.). Widely used and compatible with our worker.
- **Launch args**: Use Chromium with flags that reduce detection, e.g.:
  - `--disable-blink-features=AutomationControlled`
  - `--no-sandbox`, `--disable-setuid-sandbox`, `--disable-dev-shm-usage` (already used)
  - Optionally: realistic viewport, user-agent (or let stealth handle it).
- **Context**: Create context with a realistic viewport and, if needed, a modern user-agent string. Stealth plugin can patch the page script to avoid fingerprinting.
- **Limits**: Heavy Cloudflare or Turnstile may still block; for those, options are Browserbase (Signed Agents / Advanced Stealth), residential proxies, or a dedicated stealth browser build. Our changes get “good citizen” automation (realistic browser, sessions, waits) so most sites work better.

## API Changes (worker)

- **POST /run**
  - Body: `{ sessionId?: string, steps: Step[] }`
  - If `sessionId` is missing: create new session, run steps, return `{ success, steps, sessionId }` and keep session.
  - If `sessionId` is present: reuse that session; return same `sessionId` in response.
  - Step schema additions:
    - **navigate**: `waitUntil?: 'domcontentloaded' | 'load' | 'networkidle'`, `timeout?: number` (ms).
    - **wait**: new action; `delay?: number` (ms), `selector?: string` (optional wait for element).

- **DELETE /session/:sessionId** (optional): Explicitly close a session so the client can free resources when the task is done.

- **Sessions**: In-memory `Map<sessionId, { browser, context, page, lastUsedAt }>`. On each request, update `lastUsedAt`. Periodically or on request, close sessions where `Date.now() - lastUsedAt > SESSION_TTL_MS` (e.g. 15 min).

## Tool Changes (Terabits)

- **Input**: `browser_automation` accepts optional `sessionId` (string). If the previous tool result included `sessionId`, the agent should pass it for the next step.
- **Output**: Tool result includes `sessionId` whenever the worker used or created a session, so the agent can pass it on the next call.
- **System prompt / docs**: Tell the model to “pass the sessionId from the previous browser_automation result to the next call so the same browser session is reused.”

## Implementation order

1. Worker: session store, create/reuse in `/run`, return `sessionId`, TTL cleanup.
2. Worker: navigate `waitUntil` + `timeout`; add `wait` action (delay + optional selector).
3. Worker: add playwright-extra + stealth plugin and launch/context options.
4. Terabits: add `sessionId` in/out to `browser_automation` and prompt guidance.

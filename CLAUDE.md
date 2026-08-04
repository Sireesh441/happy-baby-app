@AGENTS.md

# Happy Baby — Multi-Repo Project Context

Happy Baby is a multi-vertical e-commerce platform (Kids/Men/Women, branded
"Happy Baby"/"Happy Men"/"Happy Women") with a web app and mobile app sharing
one backend, plus three standalone microservices being built to eventually
sell as independent B2B products. This same file is kept in sync across all
five repos so any session has the full picture regardless of which repo it
starts in. Last updated 2026-08-02.

**You are here:** `happy-baby-app` (the real, inner copy — see the trap
warning right below) — the Expo React Native mobile app. See its detailed
section further down.

All five repos live as sibling folders under
`C:\Users\SireeshGadde\OneDrive - RiskSpan\Desktop\`.

## ⚠️ Known trap: this repo is nested inside an outer scaffold copy

`Desktop\happy-baby-app\` (one level up from here) is **two separate git
repos**:

- The outer `happy-baby-app\` is a near-empty Expo template — a single
  commit ("Sync the default project template from ..."), plus an
  untracked, unused `src/` from the default scaffold. It is not where the
  real app lives.
- **This repo** — `happy-baby-app\happy-baby-app\` — is the actual app: all
  screens, the working checkout flow, try-on, etc., with its own `.git` and
  real commit history.

Always work from **this inner directory**. The outer copy appears to be
leftover from however the project was first scaffolded and hasn't been
cleaned up. Not touched/cleaned up yet — flagging only.

## Resolved: duplicate happy-baby-tryon-service folder (2026-08-02)

A second, incomplete tryon-service scaffold was found at
`OneDrive - RiskSpan\Desktop\happy-baby-tryon-service\` — dated 2026-07-31
(three days before the real one was built), no git repo, only two source
files (`src/middleware/auth.ts` and `src/providers/types.ts`, no routes, no
entry point), using `@gradio/client` as its provider-integration approach
and deliberately **requiring JWT auth** on the try-on endpoint ("since
every call here triggers real paid inference time" — a design choice the
current implementation does not have).

It was deleted after confirming there was no unrecovered work of value in
it. If an empty `OneDrive - RiskSpan\Desktop\happy-baby-tryon-service\`
directory still exists, it's a harmless leftover — OneDrive held a lock on
removing the empty directory shell itself even after all its contents were
deleted. **The real tryon-service repo lives under plain `Desktop\`, not
`OneDrive - RiskSpan\Desktop\`** (unlike this repo and the other three) —
full git history, pushed to GitHub, verified end-to-end.

**Worth reconsidering given what the abandoned scaffold implies:** the
current tryon-service implementation has no authentication on
`POST /api/try-on`. The earlier scaffold's design (requiring the same JWT
this app's login issues) was reasoned about deliberately — try-on calls cost
real inference money — and that reasoning is still valid even though that
scaffold itself was abandoned.

## Repos

| # | Repo | Role | Status |
|---|------|------|--------|
| 1 | `happy-baby` | Next.js web app + core backend (Vercel, production) | Live, most mature |
| 2 | `happy-baby-app` (inner copy) | Expo React Native mobile app (SDK 54) | Built through checkout, untested on device |
| 3 | `happy-baby-fit-engine` | Standalone Express/TS API — Family Fit Profiles + Fit Confidence Score | Fully implemented (full CRUD + scoring, incl. age-based estimation for kids), uncommitted |
| 4 | `happy-baby-returns-protection` | Standalone Express/TS API — tamper-evident return proof | Fully implemented, verified live end-to-end, not deployed |
| 5 | `happy-baby-tryon-service` | Standalone Express/TS API — provider-agnostic try-on wrapper | Fully implemented, pushed to GitHub, not deployed, not yet wired into the app |

## Key product strategy — "Fit Certain"

Core differentiator: (1) enhanced virtual try-on, (2) Fit Confidence Score,
(3) Family Fit Profiles (unique multi-vertical family angle — no competitor
like Myntra/Ajio has this), (4) Proof-Locked Returns — targeting the two
biggest validated complaint themes in Indian fashion e-commerce reviews
(unfair return rejections, refund transparency). Long-term: package
fit-engine, returns-protection, and tryon-service as standalone B2B SaaS for
other e-commerce brands once proven inside Happy Baby.

## Cross-repo integration facts

- All three new microservices (fit-engine, returns-protection, tryon-service)
  are meant to be called *by* `happy-baby` (web) and this app eventually.
  **None of the three are wired into this app yet.**
- fit-engine and returns-protection share one Supabase Postgres database
  with the main backend (`happy-baby`); table-prefix + Postgres-schema
  isolation, not relevant to this app directly.
- Auth: this app's login (`/api/mobile-auth/login` on `happy-baby`) issues a
  Bearer JWT with payload `{ sub, name, email }` — **no `isAdmin` claim**.
  fit-engine and returns-protection both verify that same token (same
  `JWT_SECRET`), so once this app has a token from login, it's already
  usable against those services too, should they get wired in.
- **Try-on currently has two independent implementations:**
  - `happy-baby` (web)'s own `/api/try-on` route (originally fal.ai, now a
    free Hugging Face Space). **This is what this app actually calls
    today** (see `src/lib/try-on-api.ts` / `src/app/try-on/[id].tsx`).
  - `happy-baby-tryon-service` is a new standalone, provider-agnostic
    replacement built separately, not yet wired into this app. Migrating
    this app's try-on calls over to it is still open work.

## Known technical decisions/gotchas (apply project-wide)

- Windows dev machine — PowerShell execution policy needed `RemoteSigned`.
- npm downgraded to npm@8 to fix a Windows-specific `create-expo-app` JSON
  parsing bug.
- Prisma needs `"postinstall": "prisma generate"` for Vercel builds
  (relevant to `happy-baby`, not this app).
- `happy-baby`'s server components must query Prisma directly, not
  `fetch()` their own API routes internally — caused a production
  `ECONNREFUSED` crash on Vercel (not relevant to this app directly, but
  explains backend behavior this app depends on).
- **Razorpay's React Native SDK doesn't support this app's New Architecture
  setup** — checkout uses a WebView loading Razorpay's Standard Checkout
  instead (`src/app/razorpay-checkout.tsx`), not the native SDK.

---

## Per-repo detail

### 1. happy-baby (web + core backend)

Next.js, deployed live on Vercel. Postgres via Supabase + Prisma. NextAuth
for web sessions, custom JWT endpoints (`/api/mobile-auth/login`, `/signup`,
`/me`) for this app. Razorpay payments. Anthropic-powered "Ask Happy Baby"
assistant. API routes: `addresses`, `assistant`, `auth/[...nextauth]`,
`cart`, `cart/[productId]`, `mobile-auth/login`, `mobile-auth/me`,
`mobile-auth/signup`, `orders`, `orders/[id]`, `products`, `products/[id]`,
`razorpay/create-order`, `signup`, `try-on`.

### 2. happy-baby-app (this repo)

Expo SDK 54. Commit history: `Initial commit` → `Day 12: Product detail
screen with sticky Add to Cart bar and related products` → `Day 13
complete: cart, product detail, shop screen - verified on native device` →
`Day 14: Mobile auth verified on device` → `Add virtual try-on feature for
clothing products` → `Build out checkout: shipping address, order summary,
Razorpay payment, confirmation` (HEAD).

Screens (`src/app/`): tabs home (`(tabs)/index.tsx`), shop by vertical
(`shop/[vertical].tsx`), product detail (`product/[id].tsx`), cart tab,
account tab, login/signup, checkout, razorpay-checkout (WebView),
order-confirmation, try-on (`try-on/[id].tsx`).

**Checkout was just built and is unverified on a real device** — that's the
immediate next step. Try-on is live with a known accepted bug: garment type
sometimes misclassified (e.g. jeans rendered as a shirt).

### 3. happy-baby-fit-engine

Express + TypeScript. Owns Family Fit Profiles and Fit Confidence Score.
Fully implemented and verified live: full CRUD on `/api/family-profiles`
(create/list/update/delete, ownership-scoped), and `/api/fit-score`
(per-dimension match scoring against a caller-supplied size chart, with
age-based estimation for children when real measurements aren't available).
Not yet wired into this app. Uncommitted as of 2026-08-02.

### 4. happy-baby-returns-protection

Express + TypeScript. Handles tamper-evident return proof (packing +
unboxing photo/video, server-timestamped, immutable). Fully implemented and
verified live end-to-end: case creation, proof upload with role separation
(packing=admin, unboxing=any authenticated user), combined GET, and the
full status lifecycle. Known bug not yet fixed: a rejected proof upload
still leaves an orphaned file on disk. Not yet wired into this app.

### 5. happy-baby-tryon-service

Express + TypeScript. Thin provider-agnostic wrapper — no AI logic itself,
routes to whichever provider `PROVIDER` selects (`huggingface` implemented,
`self-hosted` stubbed). Verified end-to-end, pushed to GitHub, not
deployed. **Not what this app currently calls** — this app still uses
`happy-baby`'s own built-in `/api/try-on`. Migrating over to this service is
still open work.

---

## Immediate next steps

1. **Test the mobile checkout flow end-to-end on a real device** — this
   repo, HEAD commit, still outstanding. Most relevant next step for this
   repo specifically.
2. fit-engine: commit the CRUD + age-estimation work (currently
   uncommitted). Decide whether/how `happy-baby`'s product catalog should
   expose size charts for fit-engine to consume.
3. returns-protection: fix the orphaned-file-on-rejected-upload bug.
   Decide whether return-case status should auto-transition based on proof
   completeness.
4. Both fit-engine and returns-protection: the production `start` path
   currently crashes — needs a fix before either is deployed.
5. Deploy fit-engine, returns-protection, and tryon-service (all local-only
   right now).
6. Wire the three standalone services into `happy-baby` and this app as
   real integrations — in particular, decide whether to migrate this app's
   try-on screen off `happy-baby`'s `/api/try-on` and onto
   `happy-baby-tryon-service`.
7. Consider cleaning up the outer, near-empty `happy-baby-app\` template
   shell one directory up so the nested-repo trap doesn't cause confusion
   later (not touched yet — flagging only).

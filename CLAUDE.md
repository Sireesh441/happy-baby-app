@AGENTS.md

# Happy Shopping — Multi-Repo Project Context

Happy Shopping is a multi-vertical e-commerce platform (Kids/Men/Women, branded
"Happy Baby"/"Happy Men"/"Happy Women") with a web app and mobile app sharing
one backend, plus three standalone microservices being built to eventually
sell as independent B2B products. This same file is kept in sync across all
five repos so any session has the full picture regardless of which repo it
starts in. Last updated 2026-08-09.

**You are here:** `happy-baby-app` (the real, inner copy — see the trap
warning right below) — the Expo React Native app, which also builds and runs
on web via Expo's web target. See its detailed section further down.

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
  screens, the working checkout flow (native + web), try-on, family fit
  profiles, returns, etc., with its own `.git` and real commit history.

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
| 2 | `happy-baby-app` (inner copy) | Expo app (SDK 54) — native (iOS/Android) + web | Verified end-to-end on both native and web, incl. full checkout/payment/order flow |
| 3 | `happy-baby-fit-engine` | Standalone Express/TS API — Family Fit Profiles + Fit Confidence Score | Fully implemented, deployed live on Railway, wired into this app and verified end-to-end |
| 4 | `happy-baby-returns-protection` | Standalone Express/TS API — tamper-evident return proof | Fully implemented, deployed live on Railway, wired into this app and verified end-to-end |
| 5 | `happy-baby-tryon-service` | Standalone Express/TS API — provider-agnostic try-on wrapper | Fully implemented, pushed to GitHub, not deployed, not yet wired into the app |

## Key product strategy — "Fit Certain"

Core differentiator: (1) enhanced virtual try-on, (2) Fit Confidence Score,
(3) Family Fit Profiles (unique multi-vertical family angle — no competitor
like Myntra/Ajio has this), (4) Proof-Locked Returns — targeting the two
biggest validated complaint themes in Indian fashion e-commerce reviews
(unfair return rejections, refund transparency). Long-term: package
fit-engine, returns-protection, and tryon-service as standalone B2B SaaS for
other e-commerce brands once proven inside Happy Shopping.

## Cross-repo integration facts

- fit-engine and returns-protection are now both live (Railway) and wired
  directly into this app — this app's client code calls their production
  URLs as hardcoded constants (not env vars), the same pattern in both:
  `FIT_ENGINE_URL` in `src/lib/fit-engine-api.ts` →
  `https://happy-baby-fit-engine-production.up.railway.app`, and
  `RETURNS_SERVICE_URL` in `src/lib/returns-api.ts` →
  `https://happy-baby-returns-protection-production.up.railway.app`. Both are
  hardcoded **deliberately**, to avoid a localhost-fallback bug that once
  existed in this app's `TRYON_SERVICE_URL`-equivalent server-side pattern.
- tryon-service is still not wired in — see below.
- fit-engine and returns-protection share one Supabase Postgres database
  with the main backend (`happy-baby`); table-prefix + Postgres-schema
  isolation, not relevant to this app directly.
- Auth: this app's login (`/api/mobile-auth/login` on `happy-baby`) issues a
  Bearer JWT with payload `{ sub, name, email }` — **no `isAdmin` claim**.
  fit-engine and returns-protection both verify that same token (same
  `JWT_SECRET`), so once this app has a token from login, it's usable
  against those services too. Verified live: family profile creation
  (`POST /api/family-profiles`) and fit scoring (`/api/fit-score`, showing
  "100% match" on a real product page), plus return-case creation and
  unboxing-proof upload against returns-protection.
- **Try-on still has two independent implementations, and this app still
  calls the old one:**
  - `happy-baby` (web)'s own `/api/try-on` route (originally fal.ai, now a
    free Hugging Face Space). **This is what this app actually calls
    today** (see `src/lib/try-on-api.ts`, which hits
    `${BACKEND_URL}/api/try-on`, and `src/app/try-on/[id].tsx`). Unchanged
    since 2026-08-02.
  - `happy-baby-tryon-service` is a standalone, provider-agnostic
    replacement built separately, still not wired into this app. Migrating
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
  setup** — native checkout uses a WebView loading Razorpay's Standard
  Checkout instead (`src/app/razorpay-checkout.tsx`), not the native SDK.
- **`react-native-webview` has no web implementation at all** — it doesn't
  just degrade, it hard-fails the web build ("React Native WebView does not
  support this platform"). This blocked all purchases on web until fixed
  2026-08-09 (see this repo's detail section below): `checkout.tsx` now
  branches on `Platform.OS`, keeping the WebView flow for native untouched
  and loading Razorpay's `checkout.js` script directly on web via
  `src/lib/razorpay-web.ts`. Any other native-only package considered for
  this app should be checked for a web implementation up front rather than
  discovered at build time.
- **`router.back()` silently no-ops when there's no prior navigation
  history** (e.g. a user landing directly on a deep link like `/login`) —
  it doesn't throw or redirect, it just does nothing, which looks like a
  hang/bug from the user's side even though the underlying action (e.g.
  login) succeeded. Prefer `router.replace('/')` (or another route that
  always exists) over `router.back()` for any "return to a sensible
  default" fallback.

---

## Per-repo detail

### 1. happy-baby (web + core backend)

Next.js, deployed live on Vercel (`https://happy-baby-seven.vercel.app`).
Postgres via Supabase + Prisma. NextAuth for web sessions, custom JWT
endpoints (`/api/mobile-auth/login`, `/signup`, `/me`) for this app.
Razorpay payments. Anthropic-powered "Ask Happy Shopping" assistant. API routes:
`addresses`, `assistant`, `auth/[...nextauth]`, `cart`, `cart/[productId]`,
`mobile-auth/login`, `mobile-auth/me`, `mobile-auth/signup`, `orders`,
`orders/[id]`, `products`, `products/[id]`, `razorpay/create-order`,
`signup`, `try-on`.

### 2. happy-baby-app (this repo)

Expo SDK 54 (`~54.0.36`), targeting native (iOS/Android) and web from one
codebase. Commit history (oldest → newest): `Initial commit` → `Day 12:
Product detail screen with sticky Add to Cart bar and related products` →
`Day 13 complete: cart, product detail, shop screen - verified on native
device` → `Day 14: Mobile auth verified on device` → `Add virtual try-on
feature for clothing products` → `Build out checkout: shipping address,
order summary, Razorpay payment, confirmation` → `Day 19: Mobile size
selector, low-stock, out-of-stock UI - verified against production` →
`Day 20a: Polish pass - skeletons, empty states, error states with retry,
fixed cart/wishlist isLoaded bug` → `Set up EAS build tooling` → `Add Family
Fit Profiles: family member CRUD + Fit Confidence on product pages` → `Add
return flow to Order History: create case + unboxing proof upload` (HEAD).
Two more fixes landed on top of HEAD earlier today (2026-08-09), not yet
committed as of this writing — see below.

Screens (`src/app/`): tabs home (`(tabs)/index.tsx`), shop by vertical
(`shop/[vertical].tsx`), product detail (`product/[id].tsx`), cart tab,
account tab, wishlist, login/signup, checkout, razorpay-checkout
(WebView, native only), order-confirmation, order-history, family-members,
try-on (`try-on/[id].tsx`), assistant.

Client libs (`src/lib/`): `api.ts` (`BACKEND_URL` +
products), `auth-api.ts`, `addresses-api.ts`, `orders-api.ts`,
`try-on-api.ts`, `fit-engine-api.ts`, `returns-api.ts`, `razorpay-web.ts`
(new 2026-08-09), `assistant-api.ts`, `save-image.ts`, `token-storage.ts`.

**Two fixes made and verified live today (2026-08-09):**

1. **Checkout now works on both native and web.** `checkout.tsx` used to
   route unconditionally to `razorpay-checkout.tsx` (WebView-based), and
   `react-native-webview` has no web implementation, so the web build
   hard-failed and purchases were completely blocked on web. Fixed by
   branching on `Platform.OS` in `handlePlaceOrder()`: native is unchanged
   (still pushes to `/razorpay-checkout`); web instead calls the new
   `openRazorpayWebCheckout()` from `src/lib/razorpay-web.ts`, which loads
   Razorpay's `checkout.js` script directly and, on success, calls the same
   `placeOrder()` from `orders-api.ts` that native uses, so both platforms
   create orders through an identical backend contract. `razorpay-web.ts`
   also exports `RazorpayDismissedError`, thrown when the user closes the
   modal without paying, and swallowed (not shown as an error) in
   `checkout.tsx`'s catch block. Verified with a real completed Razorpay
   test-mode payment on web, producing a real order visible in Order
   History and Order Confirmation.
2. **Login redirect fixed.** `login.tsx`'s success handler used to fall
   back to `router.back()` when there was no `redirectTo` param, which
   silently no-ops with no prior navigation history — leaving a user who
   landed directly on `/login` stuck on the login screen despite a
   successful login (token stored correctly, just no visible navigation).
   Changed the fallback to `router.replace('/')`. Verified live: logging in
   from a fresh browser tab with zero navigation history now lands on Home.

**Also verified live end-to-end today** (full walkthrough against
production backends): signup/login against `happy-baby`
(`https://happy-baby-seven.vercel.app`); family fit profile creation via
fit-engine (`POST /api/family-profiles`) with fit confidence showing "100%
match" via `/api/fit-score` on a product page; add-to-cart, which is
**local-only** (AsyncStorage via `src/context/cart-context.tsx`, key
`happybaby.cart.v1`) — by design, not a backend call; full checkout +
payment + order confirmation on both the native WebView path and the new
web path; Order History correctly showing return status ("Proof Pending" /
"Proof uploaded ✓", from `STATUS_LABELS` in `order-history.tsx` sourced from
returns-protection); initiating a return and uploading unboxing proof via
`returns-api.ts` directly against returns-protection on Railway.

Try-on is live with a known accepted bug: garment type sometimes
misclassified (e.g. jeans rendered as a shirt). Still calls `happy-baby`'s
own `/api/try-on`, not `happy-baby-tryon-service` — unchanged since
2026-08-02.

### 3. happy-baby-fit-engine

Express + TypeScript. Owns Family Fit Profiles and Fit Confidence Score.
Fully implemented, **deployed live on Railway**
(`https://happy-baby-fit-engine-production.up.railway.app`), and **wired
into this app** (`src/lib/fit-engine-api.ts`): full CRUD on
`/api/family-profiles` (create/list/update/delete, ownership-scoped), and
`/api/fit-score` (per-dimension match scoring against a caller-supplied size
chart, with age-based estimation for children when real measurements aren't
available). Verified live end-to-end from this app today.

### 4. happy-baby-returns-protection

Express + TypeScript. Handles tamper-evident return proof (packing +
unboxing photo/video, server-timestamped, immutable). Fully implemented,
**deployed live on Railway**
(`https://happy-baby-returns-protection-production.up.railway.app`), and
**wired into this app** (`src/lib/returns-api.ts`): case creation
(`POST /api/return-cases`), status fetch (`GET /api/return-cases/:orderId`),
and unboxing proof upload (`POST /api/proof`, role-separated — only
"unboxing" is ever used from this app; "packing" proof is admin-only).
Verified live end-to-end from this app today, including via Order History's
return status display.

### 5. happy-baby-tryon-service

Express + TypeScript. Thin provider-agnostic wrapper — no AI logic itself,
routes to whichever provider `PROVIDER` selects (`huggingface` implemented,
`self-hosted` stubbed). Verified end-to-end, pushed to GitHub, not
deployed. **Still not what this app calls** — this app still uses
`happy-baby`'s own built-in `/api/try-on`. Migrating over to this service is
still open work.

---

## Immediate next steps

1. Commit the two 2026-08-09 fixes in this repo (web checkout branch +
   login redirect) — currently made and verified live but not yet
   committed as of this writing.
2. Consider whether to also verify the new web checkout path on a real
   deployed web build (Vercel/similar), not just local dev, before calling
   web checkout fully done.
3. Decide whether/how to migrate this app's try-on screen off
   `happy-baby`'s `/api/try-on` and onto `happy-baby-tryon-service` — still
   the main outstanding cross-repo integration gap now that fit-engine and
   returns-protection are both live and wired in.
4. Deploy `happy-baby-tryon-service` (still local/GitHub-only) and wire it
   into `happy-baby` and this app.
5. Fix the known try-on garment misclassification bug (e.g. jeans rendered
   as a shirt).
6. Fix the known returns-protection bug: a rejected proof upload still
   leaves an orphaned file on disk.
7. Consider cleaning up the outer, near-empty `happy-baby-app\` template
   shell one directory up so the nested-repo trap doesn't cause confusion
   later (not touched yet — flagging only).

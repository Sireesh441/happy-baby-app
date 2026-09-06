@AGENTS.md

# Happy Shopping — Multi-Repo Project Context

Happy Shopping is a multi-vertical e-commerce platform (Kids/Men/Women, branded
"Happy Baby"/"Happy Men"/"Happy Women") with a web app and mobile app sharing
one backend, plus three standalone microservices being built to eventually
sell as independent B2B products. This same file is kept in sync across all
five repos so any session has the full picture regardless of which repo it
starts in. Last updated 2026-09-06 (all five repos re-synced this pass).

**You are here:** `happy-baby-app` (the real, inner copy — see the trap
warning right below) — the Expo React Native app, which also builds and runs
on web via Expo's web target. See its detailed section further down.

## 🚨 All three Railway microservices are currently unreachable (found 2026-09-06)

`happy-baby-fit-engine`, `happy-baby-returns-protection`, and
`happy-baby-tryon-service` all returned Railway's own **"Application not
found"** edge error when hit directly (e.g. `GET .../health`) — not a normal
app-level 404, but Railway's proxy saying the domain no longer maps to a
running service. All three repos also have a recent, coordinated "Rename
package identity from happy-baby to happy-shopping" commit; the likely cause
is that rename also touched the Railway services/projects, silently changing
their auto-generated `*.up.railway.app` domains and orphaning this app's own
hardcoded `FIT_ENGINE_URL`/`RETURNS_SERVICE_URL` constants (see
`src/lib/fit-engine-api.ts` / `src/lib/returns-api.ts`), plus `happy-baby`'s
`TRYON_SERVICE_URL`/`RETURNS_SERVICE_URL` env vars. **Not yet confirmed
end-to-end** from this pass (no device/emulator testing done), but Family
Fit Profiles, the return flow, and try-on are all very likely broken in this
app right now as a result. First thing to check next session: the Railway
dashboard for these services' real current URLs.

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
| 1 | `happy-baby` | Next.js web app + core backend (Vercel, production) | Live, most mature; product variant grouping, bulk pricing, subcategories, outfit try-on, web try-on UI |
| 2 | `happy-baby-app` (inner copy) | Expo app (SDK 54) — native (iOS/Android) + web | Feature-complete matching happy-baby's backend (swatches, bulk-buying, subcategory rail, outfit try-on, WhatsApp share); image-rendering bugs fixed 2026-09-06 |
| 3 | `happy-baby-fit-engine` | Standalone Express/TS API — Person Fit Profiles + Fit Confidence Score | 🚨 Railway URL unreachable as of 2026-09-06 (see banner above). Renamed `FamilyProfile`→`PersonProfile`, added photo upload |
| 4 | `happy-baby-returns-protection` | Standalone Express/TS API — tamper-evident return proof | 🚨 Railway URL unreachable as of 2026-09-06 (see banner above). Otherwise feature-complete per last verification |
| 5 | `happy-baby-tryon-service` | Standalone Express/TS API — provider-agnostic try-on wrapper | 🚨 Railway URL unreachable as of 2026-09-06 (see banner above). Self-hosted CatVTON provider now implemented (outfit mode + NSFW detection); still no JWT auth |

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
- **Try-on is consolidated**: this app's `src/lib/try-on-api.ts` calls
  `happy-baby`'s `/api/try-on`, which itself proxies to
  `happy-baby-tryon-service` — so this app reaches tryon-service
  transitively, not directly. This app now also supports **full-outfit
  try-on mode** (`sendOutfitTryOnRequest` sends `upperProductId`+
  `lowerProductId`) — see the `PROVIDER` note below for why this may
  currently be broken.
- **Outfit try-on requires `PROVIDER=self-hosted` on tryon-service.**
  tryon-service's default `HuggingFaceProvider` explicitly throws for
  outfit (upper+lower) requests — only its `SelfHostedProvider` (a real
  RunPod-hosted CatVTON server, no longer a stub) supports them. This app's
  own code comments (`src/lib/try-on-api.ts`) reference "self-hosted
  provider's NSFW-placeholder detection," implying whoever shipped this
  expected `PROVIDER=self-hosted` to be set in production — not confirmed
  this pass, and moot until the Railway outage above is fixed anyway.
- **Package rename across the three microservices**: `happy-baby-fit-engine`,
  `happy-baby-returns-protection`, and `happy-baby-tryon-service` each have a
  recent "Rename package identity from happy-baby to happy-shopping" commit
  — likely the root cause of the Railway outage above.
- **fit-engine's `FamilyProfile` model was renamed to `PersonProfile`**.
  **Not verified this pass**: whether this app's own `family-members`
  screen/copy ("Family Fit Profiles") was updated to match, or whether this
  is purely a backend/schema rename so far.

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
- **Never commit real `.env`/`.env.local` files to git.** `happy-baby`'s
  actual `.env.local` was briefly committed locally (never pushed) and
  GitHub's push-protection immediately flagged a live Anthropic API key
  inside it — confirmed real risk, not theoretical. This app has no `.env`
  of its own (it hardcodes service URLs instead), but the same rule applies
  project-wide: use `.env.example` for documenting required config, never
  the real file.
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
codebase. Commit history (oldest → newest, abbreviated): ... → `Add Family
Fit Profiles: family member CRUD + Fit Confidence on product pages` → `Add
return flow to Order History: create case + unboxing proof upload` → `Day
30: Swatch-switching UI - shop grid + product detail, verified against
production` → `Day 32b: Wholesale/bulk-buying UI - toggle, pack picker,
cart/checkout/history, verified live end-to-end` → `Expandable Clothing
subcategory rail - verified on all 3 verticals` → `Add full-outfit try-on
mode and right-align the subcategory rail list` → `WhatsApp share for
try-on results (single + batch), fixed react-native-view-shot web bug via
direct html2canvas` → `Show real product photos instead of emoji, fix
cropped detail-page images` (HEAD, `f36819f`, 2026-09-06).

**2026-09-06 fix (`f36819f`):** `ProductThumbnail` (shop grid, cart,
wishlist, order history, try-on picker) always rendered the emoji
placeholder and never checked `product.image` even when the backend had a
real photo URL — fixed to resolve and render the real image via the
existing `getProductImageUrl()` helper, falling back to the emoji only when
a product genuinely has none. `ProductImageCarousel` (product detail page)
used `resizeMode="cover"` in a fixed-height box, badly cropping/zooming
portrait product photos (e.g. product id 69, "Denim Trucker Overshirt
Jacket" showed only a zoomed-in torso) — fixed to `resizeMode="contain"`
with a tile-color background fill so the whole photo is always visible.
Both verified live via `expo start --web` before committing. (Also worth
knowing: the "Allen Solly Cotton Formal Shirt" product has a real image on
record, but it's the wrong photo — a generic black t-shirt mockup, not a
formal shirt. Catalog data-quality issue, not a code bug.)

Screens (`src/app/`): tabs home (`(tabs)/index.tsx`), shop by vertical
(`shop/[vertical].tsx`), product detail (`product/[id].tsx`), cart tab,
account tab, wishlist, login/signup, checkout, razorpay-checkout
(WebView, native only), order-confirmation, order-history, family-members,
try-on (`try-on/[id].tsx`), assistant.

Client libs (`src/lib/`): `api.ts` (`BACKEND_URL` +
products), `auth-api.ts`, `addresses-api.ts`, `orders-api.ts`,
`try-on-api.ts`, `fit-engine-api.ts`, `returns-api.ts`, `razorpay-web.ts`
(new 2026-08-09), `assistant-api.ts`, `save-image.ts`, `token-storage.ts`.

**Two fixes made and verified live on 2026-08-09 (confirmed since committed
— folded into the later `61d0090` "Day 30" commit rather than getting a
dedicated commit message of their own):**

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

Express + TypeScript. Owns Person Fit Profiles (renamed from
`FamilyProfile` to `PersonProfile` since the last sync — **not verified
whether this app's `family-members` screen/copy needs a matching update**)
and Fit Confidence Score, plus a newly-added photo upload for
`PersonProfile`. Also renamed package identity to `happy-shopping`. Wired
into this app via `src/lib/fit-engine-api.ts` (hardcoded Railway URL): full
CRUD on `/api/family-profiles`, and `/api/fit-score`. 🚨 **Its Railway URL
returned "Application not found" when hit directly on 2026-09-06** — see
the banner at the top of this file; not yet fixed, so this integration is
presumed broken until that's resolved.

### 4. happy-baby-returns-protection

Express + TypeScript. Handles tamper-evident return proof (packing +
unboxing photo/video, server-timestamped, immutable). Renamed package
identity to `happy-shopping`; otherwise functionally unchanged since the
last sync. Wired into this app via `src/lib/returns-api.ts` (hardcoded
Railway URL): case creation, status fetch, and unboxing proof upload. 🚨
**Its Railway URL returned "Application not found" when hit directly on
2026-09-06** — see the banner at the top of this file; not yet fixed, so
this integration is presumed broken until that's resolved.

### 5. happy-baby-tryon-service

Express + TypeScript. Thin provider-agnostic wrapper — no AI logic itself,
routes to whichever provider `PROVIDER` selects. `self-hosted` is **no
longer a stub** — it now calls a real RunPod-hosted CatVTON server, with
outfit mode and NSFW-placeholder detection (SHA-256 hash match against a
known static placeholder image). Default `PROVIDER` is still `huggingface`,
which explicitly rejects outfit requests. Package identity renamed to
`happy-shopping`. Still no JWT auth on `POST /api/try-on`. This app reaches
it transitively via `happy-baby`'s `/api/try-on` proxy, not directly. 🚨
**Its Railway URL returned "Application not found" when hit directly on
2026-09-06** — see the banner at the top of this file; not yet fixed.

---

## Immediate next steps

1. 🚨 **Diagnose and fix the Railway outage** — check the Railway dashboard
   for fit-engine's, returns-protection's, and tryon-service's actual
   current URLs, then update this app's hardcoded `FIT_ENGINE_URL`/
   `RETURNS_SERVICE_URL` constants (and `happy-baby`'s corresponding env
   vars) to match. Biggest blocker across the whole platform right now.
2. **Confirm `PROVIDER=self-hosted` is actually set on tryon-service** once
   it's reachable again — otherwise this app's full-outfit try-on mode
   fails outright against the default `huggingface` provider.
3. Confirm whether this app's `family-members` screen/copy needs updating
   to match fit-engine's `FamilyProfile`→`PersonProfile` rename.
4. Add JWT auth to `happy-baby-tryon-service`'s `POST /api/try-on` — still
   open, unaddressed for weeks.
5. Fix the known try-on garment misclassification bug (e.g. jeans rendered
   as a shirt).
6. Consider cleaning up the outer, near-empty `happy-baby-app\` template
   shell one directory up so the nested-repo trap doesn't cause confusion
   later (not touched yet — flagging only).

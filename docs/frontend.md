# Frontend documentation

This is the Next.js storefront + admin panel for **KING CAKE PLACE**. It's a client-heavy app on purpose — every page is a `"use client"` component doing its own `fetch`-based data loading, no server components, no SSR data fetching. That's a deliberate simplicity choice for a small single-shop app, not an oversight; keep it in mind before reaching for App Router server-side patterns.

## Stack

- **Next.js 16** (App Router), **React 19**, **TypeScript**, **Tailwind CSS v4**
- No state-management library (Redux/Zustand/etc.) — two small React Contexts (`AuthContext`, `CartContext`) cover everything the app needs
- No data-fetching library (SWR/React Query) — a hand-rolled `apiFetch` wrapper around `fetch`
- Auth token lives in `localStorage`, not a cookie — see the Auth section for why that matters

## Project layout

```
src/
  app/                # one folder per route (App Router) — every page.tsx is "use client"
  components/         # shared UI: Navbar, Hero, QuantityStepper, SearchBar, AuthLayout
  context/            # AuthContext, CartContext — the only global state in the app
  lib/                # api.ts, format.ts, search.ts, sound.ts, razorpay.ts — framework-free helpers
  types/index.ts       # every shared TypeScript type/interface, one file, matches the backend's DTOs
```

If a type doesn't exist yet for something the backend returns, add it to `types/index.ts` — don't inline object shapes in a page component.

## Routing map

| Route | Purpose | Auth |
|---|---|---|
| `/` | Home: hero banner, category filter, search, product grid with live cart-quantity steppers | public (Add to Cart requires login) |
| `/products/[id]` | Product detail, add-to-cart / in-cart stepper, reviews | public (reviewing/adding requires login) |
| `/login`, `/register` | Auth forms, split-panel layout with a bakery photo | public |
| `/cart` | Cart contents, quantity steppers, checkout link | customer |
| `/checkout` | Fulfillment type, payment method (COD or Razorpay), places the order | customer |
| `/orders`, `/orders/[id]` | Order history / detail | customer, own orders only |
| `/profile` | Edit name/phone, change password | any logged-in user |
| `/admin/*` | Categories, Products (+ image upload), Orders (status updates), Settings (shop name) | `ADMIN` only — gated in `admin/layout.tsx` |

`admin/layout.tsx` is the only route guard implemented as a layout; every other protected page redirects itself in a `useEffect` (see the Auth section) — that's an intentional inconsistency worth knowing about, not a bug, if you're adding a new protected page: follow whichever pattern the page you're closest to already uses.

## `context/AuthContext.tsx` — auth state

- Holds `{token, userId, fullName, email, role}` (the exact shape of `AuthResponse` from `/api/auth/login|register`), persisted to `localStorage["sweetshop_auth"]`.
- `login()` / `register()` call the backend, then persist the result (the 15-min access token; the refresh token is an httpOnly cookie JS can't see). `logout()` calls `POST /api/auth/logout` (revokes the refresh token server-side, best effort) and clears storage.
- **Ordering chatbot** (`components/ChatBot.tsx` + pure helpers in `lib/chatbot.ts`, mounted once in `app/layout.tsx`): a floating 💬 widget, shown **only to logged-in customers** (hidden for guests and ADMIN; keyed by `userId` so logout/login starts a fresh chat). It's a rule-based, button-driven assistant — deliberately no AI/LLM and no external bot framework (Rasa/Botpress are separate servers + training, overkill for one menu): browse categories → pick item → quantity → cart, then checkout (Dine in / Takeaway / Delivery → address → phone → summary → explicit **Place order** confirmation). Typed shortcuts work too: `2 samosas` (quantity + plural-tolerant prefix search via `searchProducts`), `cart`, `checkout`, `my orders`, `help`, `cancel`. It calls only existing endpoints (`/api/products`, `/api/categories`, `/api/cart`, `/api/orders`, `/api/users/me`) through `apiFetch`/`CartContext`, so auth, stock limits, server-side pricing and the WhatsApp new-order alert behave exactly like the Checkout page. Orders from the bot are always **COD** (online payment stays on `/checkout`). Rules worth knowing: only the latest bot message's buttons are active; while collecting an address/phone only `cancel` is treated as a keyword (an address can literally be "Home"); phone is saved to the profile after an order, like checkout does. To extend: add a `value` case in `handleOption` and/or an intent in `detectIntent`.
- **Google sign-in:** `GoogleSignInButton.tsx` lazy-loads Google Identity Services (`accounts.google.com/gsi/client`) and renders Google's own button; `GoogleAuthSection.tsx` wraps it with an "or" divider and error text on `/login` and `/register`, and calls `loginWithGoogle(idToken)` → `POST /api/auth/google`. Needs `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (build-time); without it the section renders nothing and the password form is unaffected. The site origin (`http://localhost:3000`, later the real domain) must be in the OAuth client's "Authorized JavaScript origins".
- **Silent refresh lives in `src/lib/api.ts`**, not here: every request is sent with `credentials: "include"`; a 401 on an authenticated call triggers one `POST /api/auth/refresh`, then the original request is retried. Concurrent 401s share a single in-flight refresh (the server rotates the token on each use, so parallel refreshes would look like theft). `/api/auth/*` calls never trigger a refresh (a wrong-password 401 is just an error). If refresh itself returns 401/403, storage is cleared; `api.ts` fires `sweetshop:auth-updated` / `sweetshop:auth-cleared` window events, which this provider listens to so React state follows.
- Every protected page follows this pattern:
  ```tsx
  const { user, loading } = useAuth();
  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);
  if (loading || !user) return null;
  ```
  `loading` exists because `AuthContext` reads `localStorage` in a `useEffect` (it's not available during SSR/first render) — without checking `loading` first, every protected page would flash a redirect to `/login` on every hard refresh before the token has a chance to load.
- `setUserFullName(name)` exists solely so the Navbar's "Hi, {name}" greeting updates immediately after a profile edit, without forcing a re-login — it patches both the in-memory state and `localStorage` directly.

## `context/CartContext.tsx` — cart state, and the one non-obvious part of this codebase

- Fetches `/api/cart` once on mount/login and holds it in state; `itemCount` is derived from it for the Navbar badge.
- `refreshCart()` **returns** the freshly-fetched `Cart` (not just `void`) — this matters because callers need the up-to-the-second item count immediately after a mutation (e.g. the "Added to cart — N items total" behavior), and relying on the React state update would be one render behind.
- `getQuantity(productId)`, `incrementItem(productId, qty=1)`, `decrementItem(productId)` are what power the Amazon-style "the Add to Cart button turns into a `− N +` stepper" behavior on the home page and product detail page:
  - `incrementItem` POSTs — the backend's `/api/cart/items` is an **additive upsert**, so calling it repeatedly is always safe regardless of whether the item is already in the cart.
  - `decrementItem` PUTs the new quantity, or DELETEs if it would hit 0 — because the backend's PUT 404s on a nonexistent cart item.
  - Any page showing a quantity control should go through these two functions, not raw `apiFetch` calls to `/api/cart/items` — that's how the home grid, product detail page, and cart page all stay in sync with each other without extra plumbing.

## `lib/` — framework-free helpers

- **`api.ts`** — `apiFetch<T>(path, options)` attaches the JWT and `Content-Type: application/json`, and throws a typed `ApiError` (with `.status` and optional `.fieldErrors`) on any non-2xx response — every page's `catch` block checks `err instanceof ApiError` to show the backend's actual message instead of a generic one. `apiUpload<T>(path, file)` is the multipart sibling (used only for product image upload) — it deliberately does **not** set `Content-Type`, since the browser needs to generate its own multipart boundary. `resolveImageUrl(url)` is the only correct way to put a product's `imageUrl` into an `<img src>` — it only prepends the API host when the URL is relative (`/uploads/...`); an already-absolute URL (an admin-pasted external link) is left untouched. **Never concatenate `API_URL` with `imageUrl` directly** — that was a real bug once (see the project's own history) and `resolveImageUrl` exists specifically to make it impossible to reintroduce.
- **`search.ts`** — `matchesSearch(product, query)` does client-side, word-boundary-prefix matching (typing "sa" matches "Samosa" even mid-string). No server-side search index exists on purpose — the whole catalog is already fetched for the grid, and this scale (a single shop's product list) doesn't need a real search backend.
- **`sound.ts`** — `playPopSound()` synthesizes a short pop via the Web Audio API (no binary asset to host or load). Wrapped in try/catch since audio can be blocked by browser autoplay policy — sound is a nice-to-have, never something a click handler should fail on.
- **`razorpay.ts`** — `loadRazorpayScript()` injects `checkout.js` once (idempotent — checks `window.Razorpay` first). The actual `new Razorpay(...).open()` call lives in `checkout/page.tsx` itself, not here, since its `handler` callback needs page-local state.
- **`format.ts`** — `STATUS_STYLES` (order status → badge color) and `PAYMENT_METHOD_LABELS` (`COD`/`RAZORPAY` → emoji + label), plus `formatDate`.

## Components worth knowing

- **`QuantityStepper.tsx`** — the reusable `− N +` control (`min`/`max`/`disabled` props). Used in three places: product cards, product detail page, and the cart page — all three read/write cart state through `CartContext`, not through their own local logic.
- **`Hero.tsx`** — the home page banner; fetches `/api/shop-settings` itself for the live shop name (same call the Navbar makes — a small, accepted duplication rather than introducing a shared settings context for one string).
- **`AuthLayout.tsx`** — the split-panel (photo + form) wrapper shared by `/login` and `/register`.
- **`Navbar.tsx`** — fetches the shop name the same way `Hero.tsx` does, and syncs `document.title` to it client-side so the browser tab stays live-accurate after an admin renames the shop (the static `<title>` in `app/layout.tsx` is just the SSR/first-paint default).

## Checkout & payment flow (`app/checkout/page.tsx`)

Two payment methods, one form:
- **COD** (default) — `POST /api/orders` with just `fulfillmentType`/`contactPhone`/`deliveryAddress`, identical to how checkout worked before Razorpay existed.
- **Razorpay** — `POST /api/payments/razorpay/order` first (gets a Razorpay order id + amount from the *live cart*, computed server-side), then `loadRazorpayScript()` and open the modal; its `handler` callback receives `{razorpay_order_id, razorpay_payment_id, razorpay_signature}` on success and only *then* calls the same `POST /api/orders`, now carrying those three fields plus `paymentMethod: "RAZORPAY"`. If the modal is dismissed or payment fails, nothing is ever sent to the backend — no order, no cart change, by construction, not by extra error-handling code.

## Local development

```bash
cd sweetshop-frontend
npm install
npm run dev
```

Needs the backend reachable at `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:8080` if unset — see `src/lib/api.ts`). Remember `NEXT_PUBLIC_*` vars are baked in at **build time**, not read at runtime — if you change it, restart `next dev` (or rebuild, in Docker). See the root `README.md` for the Docker Compose alternative.

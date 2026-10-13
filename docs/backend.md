# Backend documentation

This is the Spring Boot backend for **KING CAKE PLACE**, a single-shop sweets/bakery e-commerce site. It's a deliberate **monolith** — one deployable JAR, one Postgres database, feature-organized packages instead of microservices — sized for roughly ~1000 users/day, not planet scale. If you're new to the codebase, read this top to bottom once; every module below follows the same shape, so once one clicks the rest read fast.

## Stack

- **Spring Boot 4.1.1**, Java 21
- **PostgreSQL**, schema managed by **Flyway** (`src/main/resources/db/migration/V1__...sql` onward — never edit an already-applied migration, always add a new `V{n}__description.sql`)
- **Spring Security** with stateless **JWT** access tokens (15 min) plus a **rotating refresh token** (7 days, stored hashed in the DB, delivered as an httpOnly cookie) — no HTTP sessions
- **Lombok** (`@Getter/@Setter/@Builder` etc.) to cut entity/DTO boilerplate
- **Razorpay** REST API called directly (no SDK) for optional online payment

## Project layout

Every business feature is its own top-level package under `com.sweetshop.backend`, and every feature package follows the identical five-part shape:

```
com.sweetshop.backend.<feature>/
  <Feature>.java              # JPA @Entity
  <Feature>Repository.java    # Spring Data JPA repository interface
  <Feature>Service.java       # business logic, @Transactional where it mutates >1 row
  <Feature>Controller.java    # @RestController, thin — just delegates to the service
  dto/
    <Feature>Request.java     # inbound, @Valid-annotated
    <Feature>Response.java    # outbound, has a static `from(entity)` mapper
```

Once you've read one feature end-to-end (say, `category/`), you already know the shape of `product/`, `order/`, etc. Controllers never contain business logic — if you're looking for "what actually happens," go straight to the `*Service` class.

Cross-cutting stuff lives in `com.sweetshop.backend.config`:
- `SecurityConfig.java` — the single source of truth for which endpoints are public, which need any logged-in user, and which need `ADMIN`. **Read this file before adding a new endpoint** — a route not listed here falls through to `anyRequest().authenticated()`, which is usually what you want for anything customer-facing.
- `WebConfig.java` — serves uploaded product images as static files.
- `GlobalExceptionHandler.java` — the **one** writer of API error bodies: `{"status":400,"message":"...","errors"?:{field: msg}}`. It extends `ResponseEntityExceptionHandler`, so Spring MVC's own errors (malformed JSON, a wrong enum value — reported as `Invalid value for 'fulfillmentType'` —, a non-numeric id, wrong method, unknown route, missing upload part) get the same shape and a readable message, and a catch-all turns anything unexpected into a generic `500` whose details only go to the log. `SecurityConfig` writes the same shape for `401`/`403`. The frontend can therefore always show `message`. (Spring Boot 4 ignores the old `server.error.include-message` property, so it was removed.) Covered by `ApiErrorsIntegrationTest` (MockMvc) and `ApiErrorsOverHttpTest` (real socket).

## Feature-by-feature

### `auth` — registration & login
- `POST /api/auth/register` (public) — creates a `User` with role `CUSTOMER` (there's no self-service admin signup, on purpose — the first admin is promoted with a manual SQL `UPDATE users SET role='ADMIN' ...`), hashes the password with BCrypt, returns a JWT.
- `POST /api/auth/login` (public) — verifies credentials via Spring Security's `AuthenticationManager`, returns a JWT. **Brute-force protection** (`LoginAttemptService`): after 5 wrong passwords for one account within 15 minutes, that account's logins get `429` until the window passes (even with the right password); a successful login resets the count. In memory (single instance) and keyed by account rather than IP, since behind Netlify/Render requests can share a proxy address. Tunable via `AUTH_LOGIN_MAX_FAILURES` / `AUTH_LOGIN_LOCKOUT_MINUTES`.
- `JwtService` issues/parses tokens (HMAC-signed, subject = email, configurable expiry via `jwt.expiration-ms`). `JwtAuthenticationFilter` runs on every request, reads the `Authorization: Bearer <token>` header, and if valid, loads the `User` via `CustomUserDetailsService` and sets it as the Spring Security principal (available in any controller as `@AuthenticationPrincipal UserPrincipal`).
- **Refresh tokens** (`RefreshToken`, `RefreshTokenService`, table `refresh_tokens`, migration V12):
  - `register`/`login` return the access JWT in the body **and** set a `refresh_token` cookie (`HttpOnly`, `Path=/api/auth`, `SameSite` configurable). The cookie value is 32 random bytes; only its SHA-256 hash is stored, so a DB leak can't be replayed.
  - `POST /api/auth/refresh` (public, cookie-authenticated) — validates the cookie token, **revokes it and issues a new one (rotation)**, returns a fresh access JWT + user info. If an already-revoked token is presented (likely theft), **all of that user's refresh tokens are deleted** and the call gets 401. `rotate()` is `noRollbackFor = ResponseStatusException` so that wipe isn't undone by the 401 being thrown.
  - `POST /api/auth/logout` (public) — deletes the presented refresh token and clears the cookie. The access token stays valid until it expires (≤15 min) — that's the inherent trade-off of stateless JWTs.
  - Config: `jwt.expiration-ms` (default 900000), `jwt.refresh-expiration-days` (7), `app.cookie.secure` (`APP_COOKIE_SECURE`, false locally — **set true behind HTTPS**), `app.cookie.same-site` (`APP_COOKIE_SAME_SITE`, `Lax`; use `None` + Secure only if frontend and API are on different *sites*).
  - Expired rows are purged opportunistically whenever a new token is created.
- **Sign in with Google** — `POST /api/auth/google {idToken}` (public). `GoogleTokenVerifier` (google-api-client) checks the Google ID token's signature, expiry and that its audience is our `google.client-id` (`GOOGLE_CLIENT_ID`, a public value). `AuthService.googleLogin` requires `email_verified`, then logs in the user with that email or creates a `CUSTOMER`. An existing email/password account with the same email is **linked automatically** (keeps its role and real password). New Google accounts get a random unusable bcrypt hash plus `password_set = false` (migration V13), so the password form can't log into them and `PUT /api/users/me/password` returns a clear 400. The response is identical to `/login` (access JWT + refresh cookie), so everything downstream is unchanged. Unit-tested in `AuthServiceGoogleLoginTest`.
- **Emails are case-insensitive identities**: `UserRepository.normalizeEmail` (trim + lower-case) is applied on register, login and Google sign-in, and a different-case duplicate can't register. Lookups (`findByLoginEmail`) try the exact address first, then a case-insensitive fallback so older accounts stored with capitals still log in.
- **Input limits mirror the schema**: every request DTO caps strings at their column sizes (name 150, email 255, phone 20, address 500, image URL 500), so over-long input is a `400` with a field error instead of a database error. Passwords are 8–72 characters (bcrypt only uses 72 bytes, and Spring Security rejects longer input with an exception). Checkout's `contactPhone` must look like a phone number. Covered by `AccountInputIntegrationTest`.
- **No email verification of our own** for password signups — deliberate simplicity for this scale (Google sign-ins are verified by Google).

### `user` — profile & self-service account management
- `GET /api/users/me`, `PUT /api/users/me` (name/phone only), `PUT /api/users/me/password` — all `authenticated()`, all scoped to the caller via `@AuthenticationPrincipal`, never take a user id from the URL.
- `PUT /api/users/me/password` also **revokes every refresh token** of the user (`RefreshTokenService.revokeAll`), so all other devices are signed out once their ≤15-min access token expires; the frontend logs the current device straight back in with the new password.
- **Email is intentionally not editable** here — it's the JWT subject and login identity; changing it would mean re-issuing tokens, which is out of scope for a simple profile edit.

### `category` — product categories
- Plain CRUD (`GET` public, mutations `ADMIN`-only). Categories are just `{name, description}` — no nesting, no hierarchy.

### `product` — the catalog, plus image upload
- Plain CRUD (`GET` public, mutations `ADMIN`-only), one price per product, a free-text `unit` string (`"1kg"`, `"1 piece"`, `"6 pieces"`) instead of a real variants system — enough realism for a single shop without weight/size variant complexity.
- `POST /api/products/images` (`ADMIN`-only, multipart) — `FileStorageService` validates content-type (JPEG/PNG/WEBP/GIF only), generates a random filename (never trusts the client's filename — avoids collisions and path traversal), saves it under `app.upload.dir` (default `uploads/products/`, configurable, mounted as a Docker volume so it survives container rebuilds), and returns a URL like `/uploads/products/<uuid>.jpg`. That URL just gets stored in the product's existing `imageUrl` string column — uploading a file and pasting an external URL both end up in the exact same field, so nothing else about the product model had to change.
- `imageUrl` can therefore be either a relative `/uploads/...` path (your own upload) **or** an absolute `https://...` URL (manually pasted) — the frontend's `resolveImageUrl()` helper is what makes both work correctly; don't build a second way to render a product image without going through it.

### `cart` — one row per (user, product)
- No separate `Cart` entity — a user's cart is just their `CartItem` rows, keyed by `(user_id, product_id)`.
- `POST /api/cart/items` is an **additive upsert**: if the product is already in the cart, the given quantity is *added* to the existing quantity (not replaced) — this is what lets the frontend's "+" stepper button just POST `{quantity: 1}` repeatedly without needing to know the current quantity first.
- `PUT /api/cart/items/{productId}` **replaces** the quantity outright, and 404s if the item isn't already in the cart — this is what the "-" stepper button and the cart page's manual quantity field use.
- Stock is checked (not yet deducted) on every add/update — deduction only happens at checkout.

### `order` — checkout, order history, admin fulfillment, payment
This is the most involved service — `OrderService.checkout()` is the one method most likely to need care when you touch it.

- `POST /api/orders` (checkout) — in one `@Transactional` method: validates the cart isn't empty, validates `deliveryAddress` is present when `fulfillmentType=DELIVERY`, **locks each product row** (`SELECT … FOR UPDATE` via `ProductRepository.findByIdForUpdate`, in product-id order so concurrent checkouts can't deadlock), refuses products an admin has since taken off sale (`409`), **deducts stock** for every cart line (throws `409` if insufficient — the row lock means two customers can never both buy the last unit; covered by a concurrent test in `CheckoutStockIntegrationTest`), snapshots each product's name/price into `OrderItem` rows (so a later price change never rewrites history), computes the total, creates the `Order`, and clears the cart. If anything in that method throws, the whole transaction rolls back — no partial stock deduction, no half-cleared cart.
- `fulfillmentType`: `DINE_IN` / `TAKEAWAY` / `DELIVERY`. `status` (admin-managed fulfillment progress): `PENDING` → `CONFIRMED` → `COMPLETED`, or `CANCELLED`. These are two independent enums — don't conflate "has this been paid" with "has this been cooked/delivered."
- **Payment** (`paymentMethod`: `COD` | `RAZORPAY`, `paymentStatus`: `PENDING` | `PAID`) is optional and additive on top of the same endpoint — see the `payment` section below for how the two interact. When `paymentMethod` is omitted entirely, it defaults to `COD`, so any old caller that only ever sent `fulfillmentType`/`contactPhone`/`deliveryAddress` keeps working unmodified.
- `GET /api/orders` — the caller's own orders. `GET /api/orders/all` — `ADMIN`-only, every order, for the admin order-management screen. `GET /api/orders/{id}` — a customer can only fetch their own (404, not 403, if it's someone else's — don't leak that the order exists). `PATCH /api/orders/{id}/status` — `ADMIN`-only, updates fulfillment status.
- **Status rules** (`OrderStatus.canTransitionTo`): fulfilment only moves forward — `PENDING → CONFIRMED | COMPLETED | CANCELLED`, `CONFIRMED → COMPLETED | CANCELLED`; `COMPLETED` and `CANCELLED` are final (`409` otherwise; setting the current status again is a no-op). Moving to `CANCELLED` **puts every line's stock back** (rows locked in the same product-id order as checkout).
- `POST /api/orders/{id}/cancel` — customer self-service cancel of their **own `PENDING`, pay-at-counter** order (404 for someone else's; `409` once the shop has confirmed it, or if it was paid online — refunds go through the shop). Restores stock and sends the shop owner a WhatsApp "cancelled by the customer" alert (`OrderCancelledEvent`, same after-commit/async path as new-order alerts). Covered by `OrderCancellationIntegrationTest`.

### `payment` — Razorpay integration
- **Deliberately no `razorpay-java` SDK dependency.** The only two things needed — creating an order and verifying a signature — are a single REST call and an HMAC-SHA256 comparison, both trivial with Spring's built-in `RestClient` and `javax.crypto.Mac`. Pulling in a whole SDK for that would be more dependency than the job needs.
- `RazorpayService.createOrder(amount)` — POSTs to Razorpay's `/v1/orders` REST endpoint (`razorpay.api-base`, overridable only so tests can use a local stub) with HTTP Basic auth (key id/secret), returns the Razorpay order id. Gateway failures become a generic `502` (the upstream message is logged, never echoed).
- `POST /api/payments/razorpay/order` → `PaymentService.startRazorpayPayment()` computes the amount from the **caller's live cart** server-side (never from the client), creates the Razorpay order, and stores a `RazorpayPayment` row (table `razorpay_payments`, migration V14): *which customer* started it and *exactly how much* they were asked to pay.
- `RazorpayService.verifySignature(orderId, paymentId, signature)` — recomputes `HMAC-SHA256(orderId + "|" + paymentId, key_secret)`. A valid signature only proves "this Razorpay order was paid", so on `paymentMethod=RAZORPAY` checkout calls `PaymentService.claim()` *before* touching stock or the cart: signature valid → the `RazorpayPayment` row exists, belongs to this customer (row-locked, so concurrent attempts serialize) → it hasn't paid for an order yet. After the order total is computed, `PaymentService.complete()` refuses the order unless the total **equals** the paid amount (`409`, "your cart changed after payment started"), then links the payment to the order so it can never be reused (`409`, "already been used for order #N"). Any refusal rolls back the whole checkout — **zero side effects**. Covered end-to-end by `RazorpayCheckoutIntegrationTest` (replay, swapped cart, someone else's payment, unknown order id, forged signature).
- **No webhook.** The recommended production hardening (Razorpay calling your server directly and independently of the customer's browser) needs a public HTTPS URL, which means a tunnel like ngrok for local dev — not implemented here. The frontend-callback + signature-verification flow above is what ships; a webhook can be layered on later without changing this design.
- Both `razorpay.key-id` / `razorpay.key-secret` come from `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` env vars with **no default** (unlike `JWT_SECRET`, which has a dev-only fallback) — if either is blank, online payment answers `503` with a customer-friendly "not available, choose pay at counter" message and logs a "Razorpay is not configured" warning for the operator, rather than a confusing gateway error. **Never hardcode real keys into `application.properties`** — it's committed to source control.

### Free-hosting support (see `docs/deploy-free.md`)
- **Images:** `FileStorageService.store()` now returns the URL to save in `Product.imageUrl`. With `CLOUDINARY_*` set, `CloudinaryUploader` pushes the image to Cloudinary via its signed-upload REST API (SHA-1 signature over the sorted signed params + secret; no SDK) and returns the permanent `https://res.cloudinary.com/...` URL; with them blank it keeps writing to local disk and returns `/uploads/products/<uuid>.<ext>`. Cloudinary failures become a generic 502 (upstream detail is never echoed). Content-type validation still happens first.
- **Small hosts:** `server.port=${PORT:8080}` (Render supplies `PORT`), Hikari pool `DB_POOL_SIZE` (default 5) with a 5-minute `max-lifetime` (free Postgres like Neon drops idle connections), and the Dockerfile's `JAVA_OPTS` (`-XX:MaxRAMPercentage=55 -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -Xss512k`; ≈360 MB resident measured with a 280 MB heap).
- **Same-origin proxy:** the frontend can forward `/api/*` and `/uploads/*` to the backend (`BACKEND_URL` in `next.config.ts`), keeping the refresh cookie first-party when the two live on different free hosts.

### `notification` — WhatsApp alert to the shop owner on every new order
- `OrderService.checkout()` publishes an `OrderPlacedEvent` (message text pre-built by `OrderMessageFormatter` while the entities are still loaded). `OrderNotificationListener` handles it with `@TransactionalEventListener(AFTER_COMMIT)` + `@Async` (`AsyncConfig` enables `@Async`), so a rolled-back checkout (empty cart, out of stock, bad payment signature) sends nothing and the customer's response never waits on WhatsApp.
- `WhatsAppNotifier` calls CallMeBot's free **personal-use** API (`GET api.callmebot.com/whatsapp.php?phone=&text=&apikey=`) with 5s connect / 15s read timeouts. Values go in as RestClient URI variables so `+`, `&`, newlines and emoji are percent-encoded correctly. **It never throws** — failures are logged as a WARN and the order is unaffected (the notification is simply lost; there's no retry queue).
- Opt-in: set `CALLMEBOT_PHONE` (with country code, e.g. `+919876543210`) and `CALLMEBOT_API_KEY` (env vars; the key is a secret, never put it in `application.properties`). Either blank = nothing is sent. `whatsapp.callmebot.url` is overridable (`WHATSAPP_CALLMEBOT_URL`) — tests point it at a local stub.
- Message contents: order number, customer name + contact phone, fulfillment type, delivery address (delivery only), items with quantities and subtotals, total, payment method. **New orders** and **customer self-cancellations** notify; admin status changes don't.
- Limits to know: CallMeBot is unofficial and meant for personal use, so it can change or stop; it messages only the one number that did the activation. Moving to Meta's WhatsApp Cloud API later means replacing only `WhatsAppNotifier.send()`.

### `review` — one review per (user, product), purchase-gated
- `ReviewController` (`/api/products/{productId}/reviews`): `GET` (public), `POST` (upsert — a customer can only review a product they've actually ordered; submitting again just updates their existing review rather than creating a duplicate), `DELETE` (a customer deleting their own review).
- `ReviewModerationController` (`/api/reviews/{reviewId}`): `ADMIN`-only delete of *any* review — separated into its own controller because it's a different actor (admin, not the review's author) even though it operates on the same entity.

### `settings` — shop identity
- Single-row table (`shop_settings`), always the first row, seeded via migration with the shop name `KING CAKE PLACE`. `GET /api/shop-settings` is public (the storefront's navbar needs it for logged-out visitors too); `PUT` is `ADMIN`-only. The response also carries `onlinePaymentEnabled` (not stored — true when Razorpay keys are configured) so the checkout only offers "Pay online now" when it can work. This is what makes the shop's name/branding editable without a code change or redeploy.

## Query performance

List endpoints fetch what their response DTOs need in the **same** query via `@EntityGraph` on the repository finder (orders → customer + items, products → category, cart lines → product, reviews → author, order messages → sender), so their SQL count stays constant instead of growing with the number of rows (`QueryCountIntegrationTest` pins this: e.g. `GET /api/orders/all` went from 236 statements to 2 on the test database). Catalog lists are ordered by name, categories too. When you add a list endpoint whose DTO touches a lazy association, add an entity graph and a line to that test. One deliberate exception: checkout's `CartItemRepository.findByUserId` does **not** fetch products, so the `SELECT … FOR UPDATE` that follows reads fresh stock rather than an entity already cached in the persistence context. SQL logging is off unless `JPA_SHOW_SQL=true`.

## Adding a new endpoint — the checklist

1. Add the DTO(s) in the feature's `dto/` package, `@Valid`-annotate the request.
2. Add the method to the `*Service` — this is where validation-that-needs-the-database and the actual mutation happen. Throw `ResponseStatusException(HttpStatus.X, "message")` for expected failures (not-found, conflict, bad state) — `GlobalExceptionHandler` turns these into the standard error JSON automatically.
3. Add the thin controller method — no logic beyond calling the service and mapping the response status.
4. **Add a `SecurityConfig` rule if the endpoint isn't meant to fall under the default `anyRequest().authenticated()`** — public GETs and admin-only mutations both need an explicit line, in the right order (Spring Security matches top-to-bottom, first match wins).
5. If you added/changed a table, write a new Flyway migration (`V{next}__description.sql`) — never edit a migration that's already been applied to any running database.

## Local development

```bash
cd sweetshop-backend
./mvnw spring-boot:run
```

Needs a local Postgres reachable at whatever `spring.datasource.url` resolves to (see `application.properties` — overridable via `DB_URL`/`DB_USERNAME`/`DB_PASSWORD` env vars). Flyway migrates the schema automatically on startup. See the root `README.md` for the Docker Compose alternative, which sets all of this up for you.

# KING CAKE PLACE

A full-stack e-commerce site for a real sweet shop — cakes, birthday orders, Indian sweets, snacks, and bakery items. Built as a deliberately right-sized **monolith** (Spring Boot backend + Next.js frontend + PostgreSQL) for a single shop at roughly ~1000 users/day, not a microservices playground.

## Features

- Browse products by category, with a fast client-side prefix search ("sa" finds "Samosa")
- Cart with an Amazon-style `− N +` quantity stepper right on the product card
- Checkout with a choice of **Cash/Pay at counter** or **online payment via Razorpay** (cards, UPI, netbanking, wallets)
- Order history for customers, full order management for admins (status updates)
- Product reviews — gated so a customer can only review something they actually bought
- Admin panel: categories, products (with real image upload), orders, and shop settings (shop name is editable, not hardcoded)
- Customer + admin profile pages (edit details, change password)

## Tech stack

| Layer | Tech |
|---|---|
| Backend | Spring Boot 4.1.1, Java 21, Spring Security (JWT), Spring Data JPA, Flyway |
| Database | PostgreSQL |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 |
| Payments | Razorpay (REST API, no SDK) |

Full details, module-by-module, in [`docs/backend.md`](docs/backend.md) and [`docs/frontend.md`](docs/frontend.md) — start there if you're new to this codebase.

## Quick start (Docker)

The fastest way to run the whole stack:

```bash
cp .env.example .env
# edit .env — at minimum set DB_PASSWORD and JWT_SECRET;
# RAZORPAY_KEY_ID/SECRET are optional (online payment just stays disabled without them)
docker compose up --build
```

Then open:
- **http://localhost:3000** — the storefront
- **http://localhost:8080** — the API

The database schema is created automatically by Flyway on first backend startup — no manual setup needed.

## Quick start (manual, for active development)

You'll want this instead of Docker while actively coding, since it gives you hot-reload on both sides.

**Backend** (needs a local PostgreSQL running, database `sweetshop_db`):
```bash
cd sweetshop-backend
./mvnw spring-boot:run
```

**Frontend**:
```bash
cd sweetshop-frontend
npm install
npm run dev
```

Environment variables the backend reads (all have local-dev defaults except Razorpay — see `sweetshop-backend/src/main/resources/application.properties`):

| Variable | Purpose | Required? |
|---|---|---|
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | PostgreSQL connection | has local dev defaults |
| `JWT_SECRET` | Signs auth tokens | has a dev-only fallback — **set a real one for anything beyond local dev** |
| `CORS_ALLOWED_ORIGINS` | Which frontend origin(s) may call the API | defaults to `http://localhost:3000` |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Online payment | optional — "Pay online now" is disabled without them |

The frontend reads `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:8080`), baked in at **build time**.

## First admin account

There's no self-service admin signup, on purpose (security). Register a normal account through the app, then promote it manually:

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'you@example.com';
```

## Project structure

```
sweetshop-backend/    Spring Boot API — see docs/backend.md
sweetshop-frontend/   Next.js storefront + admin panel — see docs/frontend.md
docs/                 Detailed developer documentation for both sides
docker-compose.yml    Full local stack: postgres + backend + frontend
.env.example          Template for the env vars docker-compose.yml reads
```

## Going live with real payments

Razorpay requires a publicly deployed, HTTPS website (with Terms & Conditions / Privacy Policy / Refund Policy / Contact pages) before it will issue **Live Mode** API keys — a `localhost` site won't pass their verification. Test Mode keys work fine locally in the meantime and don't move real money.

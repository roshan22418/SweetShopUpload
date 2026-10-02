# Deploying for free (Path B): Netlify + Render + Neon + Cloudinary

Everything here has a free plan. Free plans change often — **check each service's current limits before you rely on
them** (links in each step). The code side is built and tested; the steps below are the parts only you can do
(creating accounts and pasting values).

```
 Customer's browser
        │  https://your-shop.netlify.app        ← the ONLY address the browser talks to
        ▼
 Netlify (Next.js frontend) ──/api/* and /uploads/* are forwarded (BACKEND_URL)──▶ Render (Spring Boot backend)
                                                                                     │            │
                                                                                     ▼            ▼
                                                                              Neon (Postgres)  Cloudinary (product images)
```

Why forward `/api/*` through Netlify: the login "remember me" cookie (the refresh token) must stay on the same site as
the page, or browsers may block it. Forwarding makes the browser see one site. (`next.config.ts`)

## Honest limits of the free setup — read first
| Thing | What happens | What we do about it |
|---|---|---|
| Render free web service **sleeps after ~15 min without traffic** | The next visitor waits while Spring Boot starts (can be a minute or more on the tiny free CPU) | Step 7: a free pinger (UptimeRobot) hits the site every 5 min so it never sleeps. A single always-on free service fits within Render's monthly free hours — verify on Render's pricing page. |
| Netlify forwards requests with a time limit | A request that lands on a *sleeping* backend can time out once | Same fix: keep the backend warm (Step 7). |
| Render free disk is **wiped on every deploy/restart** | Locally-saved product images would vanish | Images go to Cloudinary instead (Step 3). |
| Neon free database **auto-pauses after 5 min idle** | First query after a quiet spell is slightly slower; **data is kept** | Nothing needed. The app's DB pool is tuned for this. |
| Free databases are small (Neon ≈ 0.5 GB) | Plenty for text data; images are NOT in the DB | — |
| 512 MB RAM on Render free | Spring Boot is configured to fit (≈360 MB measured locally) | JVM flags are in the Dockerfile (`JAVA_OPTS`). |
| `*.netlify.app` / `*.onrender.com` addresses | Fine for testing. For Razorpay Live Mode you'll likely want your own domain (≈ ₹600–1,000/yr — the one cost that isn't free) | Add it in Netlify → Domain management later. |

## Step 0 — Get the code on GitHub (Render and Netlify deploy from it)
Your repo is `https://github.com/roshan22418/SweetShop` (public). Commit and push your latest work to `main`.
**Never commit** `.env` files or keys (they are git-ignored already). Because the repo is public, anything you
paste in a file and push is public — all secrets below go into the services' dashboards only.

## Step 1 — Neon (database)
1. Sign up at <https://neon.com> → **Create project**. Region: **AWS Singapore** (nearest to India; use the same region for Render in Step 4).
2. On the project dashboard click **Connect**. Turn **off** "Connection pooling" so you get the **direct** host (the Flyway migrations need it). You'll see something like
   `postgresql://USER:PASSWORD@ep-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`.
3. Convert it into three values for Render:
   - `DB_URL` = `jdbc:postgresql://ep-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`
     (starts with `jdbc:postgresql://`, **no** user/password inside, and **drop** `&channel_binding=require` if present)
   - `DB_USERNAME` = the USER
   - `DB_PASSWORD` = the PASSWORD
4. Tables are created automatically on first start (Flyway). Nothing to import.

## Step 2 — (skip) keep your local data? 
A fresh Neon database starts empty. You'll add categories/products from `/admin` after deploying (Step 9).

## Step 3 — Cloudinary (product images)
1. Sign up at <https://cloudinary.com> (free plan).
2. Open the **Dashboard** → copy **Cloud name**, **API Key**, **API Secret**.
3. These become `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` on Render. Treat the secret like a password.

## Step 4 — Render (backend)
1. Sign up at <https://render.com> with GitHub.
2. **New → Web Service →** pick your `SweetShop` repo, then set:
   - **Root Directory:** `sweetshop-backend`
   - **Runtime/Language:** `Docker`
   - **Region:** Singapore (same as Neon)
   - **Instance type:** **Free**
   - **Health Check Path:** `/api/shop-settings`
   - (Shortcut: `render.yaml` in the repo root describes the same thing as a Blueprint — *New → Blueprint*. It is untested against a live Render account, so if anything is rejected just use the manual form.)
3. **Environment variables** (Add each one):

   | Key | Value |
   |---|---|
   | `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | from Step 1 |
   | `JWT_SECRET` | a long random string (e.g. 64+ random characters). **Do not** use the default. |
   | `APP_COOKIE_SECURE` | `true` |
   | `CORS_ALLOWED_ORIGINS` | your Netlify URL from Step 5 (come back and set it after Step 5), e.g. `https://your-shop.netlify.app` |
   | `GOOGLE_CLIENT_ID` | your Google client ID |
   | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | from Step 3 |
   | `CALLMEBOT_PHONE`, `CALLMEBOT_API_KEY` | optional — your WhatsApp alert settings (see backend docs) |
   | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | optional — only when you use online payment |

4. **Create Web Service.** The first build takes several minutes. When it's live, note the URL, e.g. `https://sweetshop-backend.onrender.com`.
5. Check it: open `https://<your-render-url>/api/shop-settings` — you should see JSON. (The first load after idle can be slow.)

## Step 5 — Netlify (frontend)
1. Sign up at <https://www.netlify.com> with GitHub → **Add new site → Import an existing project →** your `SweetShop` repo.
2. The root `netlify.toml` already sets the base directory (`sweetshop-frontend`) and build command. Don't change them.
3. **Environment variables** (Site configuration → Environment variables; they must exist **before** the build):

   | Key | Value |
   |---|---|
   | `BACKEND_URL` | your Render URL, e.g. `https://sweetshop-backend.onrender.com` (no trailing slash) |
   | `NEXT_PUBLIC_API_URL` | the word `same-origin` |
   | `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | your Google client ID |

4. **Deploy.** Note the site URL, e.g. `https://your-shop.netlify.app`. Go back to Render and set `CORS_ALLOWED_ORIGINS` to it.
5. If you change any of these variables later, **trigger a new deploy** — they're baked in at build time.

## Step 6 — Google sign-in
In Google Cloud Console → APIs & Services → Credentials → your Web client → **Authorized JavaScript origins**, add your
Netlify URL (and `http://localhost:3000` for local testing). Wait a few minutes.

## Step 7 — Keep the backend awake (free)
1. Sign up at <https://uptimerobot.com> (free plan; check the current check interval).
2. **Add monitor** → type *HTTP(s)* → URL `https://<your-render-url>/api/shop-settings` → interval **5 minutes**.
3. This keeps Render from sleeping, so customers don't hit the slow first load.

## Step 8 — Make yourself the admin
Sign up on your live site, then in Neon → **SQL Editor** run:
```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'you@example.com';
```
Log out and in again. (There's no self-service admin signup, on purpose.)

## Step 9 — Fill the shop
Open `/admin`: set the shop name/phone/address in **Settings**, create **Categories**, then **Products** — upload images
with the file picker (they go to Cloudinary and keep working across deploys).

## Step 10 — Check it works (5 minutes)
- [ ] Home page loads over `https://`
- [ ] Register → logged in → stays logged in after a refresh
- [ ] Wait 20+ minutes, come back: still logged in (refresh token works through the proxy)
- [ ] Upload a product image in `/admin`, then redeploy Render — the image is still there
- [ ] Place an order with the chatbot and the normal checkout
- [ ] (If configured) the WhatsApp alert arrives; Google sign-in works

## If something goes wrong
| Symptom | Likely cause |
|---|---|
| Site loads but data is empty / "Failed to fetch" | `BACKEND_URL` wrong, or Netlify wasn't redeployed after setting variables |
| Everything works, then first visit after hours is very slow/502 | Backend was asleep — check the UptimeRobot monitor |
| Render logs: "Connection refused" / SSL / auth error to the DB | `DB_URL` needs `?sslmode=require`, the *direct* host, and no `channel_binding`; check user/password |
| Logged out after ~15 min | `APP_COOKIE_SECURE=true` set but the site isn't on `https`; or `NEXT_PUBLIC_API_URL` isn't `same-origin` (cookie is cross-site) |
| Images disappear after a deploy | Cloudinary variables missing on Render (uploads fell back to the local disk) |
| Google button says origin not allowed | Add the exact site URL to Authorized JavaScript origins (Step 6) |

## Moving off free later
The code doesn't change. When real orders flow, the easiest upgrade is Render's paid instance (no sleeping, more RAM)
and/or a paid Neon plan; or move everything to one small VPS using `docker-compose.yml`.

# --- Dependencies stage ---
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- Build stage ---
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* variables are baked into the JS bundle at build time, not read at runtime,
# so this has to be a build arg rather than a plain compose "environment:" entry.
ARG NEXT_PUBLIC_API_URL=http://localhost:8080
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID=
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID

RUN npm run build

# --- Runtime stage ---
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -S nextjs && adduser -S nextjs -G nextjs
USER nextjs:nextjs

# "output: standalone" (next.config.ts) produces a minimal self-contained server —
# only these three paths are needed at runtime, not the full node_modules tree.
COPY --from=build --chown=nextjs:nextjs /app/public ./public
COPY --from=build --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nextjs /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]

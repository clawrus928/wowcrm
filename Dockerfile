# ── Stage 1: build frontend ─────────────────────────────────
FROM node:20-bookworm-slim AS frontend
WORKDIR /app
ARG GIT_SHA=dev
ARG BUILD_TIME=unknown
ENV VITE_GIT_SHA=$GIT_SHA
ENV VITE_BUILD_TIME=$BUILD_TIME
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.js ./
COPY src ./src
RUN npm run build

# ── Stage 2: install backend deps ───────────────────────────
FROM node:20-bookworm-slim AS backend-deps
WORKDIR /srv/server
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 build-essential \
    && rm -rf /var/lib/apt/lists/*
COPY server/package.json server/package-lock.json* ./
RUN npm install --omit=dev

# ── Stage 3: runtime ────────────────────────────────────────
FROM node:20-bookworm-slim
WORKDIR /srv

# Tini for clean shutdown
RUN apt-get update && apt-get install -y --no-install-recommends tini \
    && rm -rf /var/lib/apt/lists/*

COPY --from=backend-deps /srv/server/node_modules /srv/server/node_modules
COPY server/package.json /srv/server/package.json
COPY server/src /srv/server/src
COPY --from=frontend /app/dist /srv/dist

ENV NODE_ENV=production \
    PORT=8080 \
    HOST=0.0.0.0 \
    DB_PATH=/data/wowcrm.db \
    STATIC_DIR=/srv/dist

VOLUME ["/data"]
EXPOSE 8080

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "/srv/server/src/index.js"]

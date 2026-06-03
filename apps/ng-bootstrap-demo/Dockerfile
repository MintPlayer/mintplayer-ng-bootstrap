# Stage 1: build the Angular app (browser/ + SSR server/ bundles)
FROM node:22-alpine AS builder

WORKDIR /usr/local/app
COPY ./ /usr/local/app/
RUN npm install --legacy-peer-deps
RUN npx nx build ng-bootstrap-demo --configuration=production

# Stage 2: serve via the Node SSR server (request-time SSR so <mp-shell>'s
# Declarative Shadow DOM is injected — the old static nginx deploy served
# prerendered HTML without the DSD, so the no-JS shell didn't work in prod).
FROM node:22-alpine
LABEL org.opencontainers.image.source="https://github.com/MintPlayer/mintplayer-ng-bootstrap"

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=80
# Angular 19 SSR rejects unknown Host headers (SSRF protection) and silently
# falls back to client-side rendering. The allowed host(s) are set per
# deployment in docker-compose.yml (NG_ALLOWED_HOSTS); default to localhost so
# `docker run` works out of the box.
ENV NG_ALLOWED_HOSTS=localhost

# The Angular SSR server bundle is self-contained (express is bundled), so the
# runtime only needs the build output — no node_modules / npm install.
COPY --from=builder /usr/local/app/dist/apps/ng-bootstrap-demo ./dist/apps/ng-bootstrap-demo

EXPOSE 80
CMD ["node", "dist/apps/ng-bootstrap-demo/browser/server/server.mjs"]

# docker build -f apps/ng-bootstrap-demo/Dockerfile -t ng-bootstrap-demo .
# docker run -p 4201:80 -e NG_ALLOWED_HOSTS=localhost ng-bootstrap-demo
# Visit http://localhost:4201

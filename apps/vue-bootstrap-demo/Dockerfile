# Stage 1: build the client (browser/) + SSR server (server/) bundles
FROM node:22-alpine AS builder

WORKDIR /usr/local/app
COPY ./ /usr/local/app/
RUN npm install --legacy-peer-deps
RUN npx nx build vue-bootstrap-demo --configuration=production
RUN npx nx build-ssr vue-bootstrap-demo

# Stage 2: serve via the Node SSR server (request-time SSR so <mp-shell>'s
# Declarative Shadow DOM is injected — the no-JS shell needs request-time SSR,
# which the old static nginx deploy could not provide).
FROM node:22-alpine
LABEL org.opencontainers.image.source="https://github.com/MintPlayer/mintplayer-ng-bootstrap"

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=80

# server.mjs imports express + compression; every other dependency is bundled
# into the SSR build (vite `ssr.noExternal`), so the runtime image stays slim.
RUN npm init -y >/dev/null 2>&1 && npm install express@^5.1.0 compression@^1.8.0

COPY --from=builder /usr/local/app/dist/apps/vue-bootstrap-demo ./dist/apps/vue-bootstrap-demo
COPY --from=builder /usr/local/app/apps/vue-bootstrap-demo/server.mjs ./apps/vue-bootstrap-demo/server.mjs

EXPOSE 80
CMD ["node", "apps/vue-bootstrap-demo/server.mjs"]

# docker build -f apps/vue-bootstrap-demo/Dockerfile -t vue-bootstrap-demo .
# docker run -p 4100:80 vue-bootstrap-demo

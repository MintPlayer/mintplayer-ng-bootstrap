# Stage 1: build the client (browser/) + SSR server (server/) bundles
FROM node:22-alpine AS builder

WORKDIR /usr/local/app
COPY ./ /usr/local/app/
RUN npm install --legacy-peer-deps
RUN npx nx build react-bootstrap-demo --configuration=production
RUN npx nx build-ssr react-bootstrap-demo

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

COPY --from=builder /usr/local/app/dist/apps/react-bootstrap-demo ./dist/apps/react-bootstrap-demo
COPY --from=builder /usr/local/app/apps/react-bootstrap-demo/server.mjs ./apps/react-bootstrap-demo/server.mjs

EXPOSE 80
CMD ["node", "apps/react-bootstrap-demo/server.mjs"]

# docker build -f apps/react-bootstrap-demo/Dockerfile -t react-bootstrap-demo .
# docker run -p 4000:80 react-bootstrap-demo

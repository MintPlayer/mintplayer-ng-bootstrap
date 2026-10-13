# Two ways to build this image, one runtime:
#
#   CI (publish-master.yml): the `prebuilt` target COPIES the client + SSR
#   bundles the build job produced and the tests ran against, from a named
#   build context:
#     docker build -f apps/react-bootstrap-demo/Dockerfile --target prebuilt \
#       --build-context dist=dist/apps/react-bootstrap-demo .
#   No npm install and no nx build inside Docker, and the image is byte-for-byte
#   the tested build.
#
#   Locally, from a clean checkout: the default (last) target builds from source.
#     docker build -f apps/react-bootstrap-demo/Dockerfile -t react-bootstrap-demo .
#     docker run -p 4000:80 react-bootstrap-demo
#
# Node 24 on Debian slim: the same Node major and libc (glibc) as the Ubuntu
# runners that build and test the bundles.

# Serve via the Node SSR server (request-time SSR so <mp-shell>'s Declarative
# Shadow DOM is injected — the no-JS shell needs request-time SSR, which the old
# static nginx deploy could not provide).
FROM node:24-slim AS runtime
LABEL org.opencontainers.image.source="https://github.com/MintPlayer/mintplayer-ng-bootstrap"

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=80

# server.mjs imports express + compression; every other dependency is bundled
# into the SSR build (vite `ssr.noExternal`), so the runtime image stays slim.
# Pinned to the versions in package-lock.json, so the image runs what the tests
# ran.
RUN npm init -y >/dev/null 2>&1 && npm install express@5.2.1 compression@1.8.1
COPY apps/react-bootstrap-demo/server.mjs ./apps/react-bootstrap-demo/server.mjs

EXPOSE 80
CMD ["node", "apps/react-bootstrap-demo/server.mjs"]

FROM runtime AS prebuilt
COPY --from=dist . ./dist/apps/react-bootstrap-demo

FROM node:24-slim AS builder
WORKDIR /usr/local/app
COPY ./ /usr/local/app/
RUN npm ci
RUN npx nx run-many -t build build-ssr --projects=react-bootstrap-demo --configuration=production

FROM runtime AS standalone
COPY --from=builder /usr/local/app/dist/apps/react-bootstrap-demo ./dist/apps/react-bootstrap-demo

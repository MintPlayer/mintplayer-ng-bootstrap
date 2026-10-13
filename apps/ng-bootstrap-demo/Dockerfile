# Two ways to build this image, one runtime:
#
#   CI (publish-master.yml): the `prebuilt` target COPIES the bundle the build
#   job produced and the tests ran against, from a named build context:
#     docker build -f apps/ng-bootstrap-demo/Dockerfile --target prebuilt \
#       --build-context dist=dist/apps/ng-bootstrap-demo .
#   No npm install and no nx build inside Docker (those were ~95% of the image
#   time), and the image is byte-for-byte the tested build.
#
#   Locally, from a clean checkout: the default (last) target builds from source.
#     docker build -f apps/ng-bootstrap-demo/Dockerfile -t ng-bootstrap-demo .
#     docker run -p 4201:80 -e NG_ALLOWED_HOSTS=localhost ng-bootstrap-demo
#     Visit http://localhost:4201
#
# Node 24 on Debian slim: the same Node major and libc (glibc) as the Ubuntu
# runners that build and test the bundle.

# Serve via the Node SSR server (request-time SSR so <mp-shell>'s Declarative
# Shadow DOM is injected — the old static nginx deploy served prerendered HTML
# without the DSD, so the no-JS shell didn't work in prod).
FROM node:24-slim AS runtime
LABEL org.opencontainers.image.source="https://github.com/MintPlayer/mintplayer-ng-bootstrap"

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=80
# Angular 19 SSR rejects unknown Host headers (SSRF protection) and silently
# falls back to client-side rendering. The allowed host(s) are set per
# deployment in docker-compose.yml (NG_ALLOWED_HOSTS); default to localhost so
# `docker run` works out of the box.
ENV NG_ALLOWED_HOSTS=localhost

EXPOSE 80
# The Angular SSR server bundle is self-contained (express is bundled), so the
# runtime only needs the build output — no node_modules / npm install.
CMD ["node", "dist/apps/ng-bootstrap-demo/browser/server/server.mjs"]

FROM runtime AS prebuilt
COPY --from=dist . ./dist/apps/ng-bootstrap-demo

FROM node:24-slim AS builder
WORKDIR /usr/local/app
COPY ./ /usr/local/app/
RUN npm ci
RUN npx nx build ng-bootstrap-demo --configuration=production

FROM runtime AS standalone
COPY --from=builder /usr/local/app/dist/apps/ng-bootstrap-demo ./dist/apps/ng-bootstrap-demo

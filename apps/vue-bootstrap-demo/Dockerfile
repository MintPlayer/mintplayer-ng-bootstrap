# Stage 1: build the Vue SPA
FROM node:latest AS builder

WORKDIR /usr/local/app
COPY ./ /usr/local/app/
RUN npm install --legacy-peer-deps
RUN npx nx build vue-bootstrap-demo --configuration=production

# Stage 2: serve via nginx
FROM nginx:latest
LABEL org.opencontainers.image.source="https://github.com/MintPlayer/mintplayer-ng-bootstrap"

COPY --from=builder /usr/local/app/dist/apps/vue-bootstrap-demo /usr/share/nginx/html
COPY apps/vue-bootstrap-demo/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# docker build -f apps/vue-bootstrap-demo/Dockerfile -t vue-bootstrap-demo .
# docker run -p 4100:80 vue-bootstrap-demo

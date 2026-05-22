# Stage 1: build the React SPA
FROM node:latest AS builder

WORKDIR /usr/local/app
COPY ./ /usr/local/app/
RUN npm install --legacy-peer-deps
RUN npx nx build react-bootstrap-demo --configuration=production

# Stage 2: serve via nginx
FROM nginx:latest
LABEL org.opencontainers.image.source="https://github.com/MintPlayer/mintplayer-ng-bootstrap"

COPY --from=builder /usr/local/app/dist/apps/react-bootstrap-demo /usr/share/nginx/html
COPY apps/react-bootstrap-demo/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# docker build -f apps/react-bootstrap-demo/Dockerfile -t react-bootstrap-demo .
# docker run -p 4000:80 react-bootstrap-demo

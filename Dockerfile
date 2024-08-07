# Stage 1: Compile and Build angular codebase

# Use official node image as the base image
FROM node:latest as node_image

# Set the working directory
WORKDIR /usr/local/app

# Add the source code to app
COPY ./ /usr/local/app/

# Install all the dependencies
RUN npm install

# Generate the build of the application
RUN npm run build -- --configuration=production


# Stage 2: Serve app with nginx server

# Use official nginx image as the base image
FROM nginx:latest
LABEL org.opencontainers.image.source="https://github.com/MintPlayer/mintplayer-ng-bootstrap"

# Copy the build output to replace the default nginx contents.
COPY --from=node_image /usr/local/app/dist/apps/ng-bootstrap-demo/browser/browser /usr/share/nginx/html
COPY --from=node_image /usr/local/app/dist/apps/ng-bootstrap-demo/browser/browser/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# docker build --tag 'ng-bootstrap-demo' .
# docker run -p 4201:80 ng-bootstrap-demo
# Visit http://localhost:4201
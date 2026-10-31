# Feeef UI docs (ui.feeef.dev): Vite build of docs/ → static files on nginx.
# Dokploy: Dockerfile build, domain ui.feeef.dev, port 80. No build args or secrets needed.

FROM node:24-alpine AS build
WORKDIR /app
RUN apk add --no-cache git
COPY package.json package-lock.json ./
RUN npm ci --include=dev --no-audit --no-fund
COPY . .
RUN npm run docs:build && find docs/dist -type f \( -name '*.js' -o -name '*.css' -o -name '*.html' -o -name '*.svg' \) -exec gzip -k -9 {} \;

FROM nginx:1.29-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/docs/dist /usr/share/nginx/html
EXPOSE 80

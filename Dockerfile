ARG CI_REGISTRY_BASE=""

# Use a lean base image
FROM ${CI_REGISTRY_BASE}node:22-alpine

# Install nginx, supervisor, curl, wget
RUN apk update && apk add --no-cache \
    nginx \
    supervisor \
    curl \
    wget

# Set working directory
WORKDIR /app

# Backend setup using pnpm
COPY backend/package*.json ./backend/
RUN cd backend && corepack enable && corepack prepare pnpm@latest --activate && pnpm install --prod --no-frozen-lockfile
COPY backend ./backend

# Configuration
COPY default.conf /etc/nginx/http.d/default.conf
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Setup frontend static files from pre-built dist (from build-assets artifact)
RUN mkdir -p /var/www/html/fin
COPY frontend/dist /var/www/html/fin

EXPOSE 4821 4820

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]

# Official Node.js LTS Alpine Image
FROM node:22-alpine

LABEL maintainer="manasjadhav0086"
LABEL repository="https://github.com/manasjadhav0086/Finance360"
LABEL description="Finance360 Enterprise Financial Intelligence Suite"

# Install nginx, supervisor, curl, wget
RUN apk update && apk add --no-cache \
    nginx \
    supervisor \
    curl \
    wget

# Set working directory
WORKDIR /app

# Backend setup
COPY backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev --no-audit

COPY backend ./backend

# Configuration
COPY default.conf /etc/nginx/http.d/default.conf
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Setup frontend static files from pre-built dist
RUN mkdir -p /var/www/html/fin
COPY frontend/dist /var/www/html/fin

# Expose Nginx (4821) and Backend (4820)
EXPOSE 4821 4820

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]

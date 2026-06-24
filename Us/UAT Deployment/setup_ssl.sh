#!/bin/bash
set -e

echo "=== SSL Setup Script for ornetops.online ==="

# Check DNS resolution
echo "Checking DNS resolution for ornetops.online..."
IPS=$(nslookup ornetops.online 8.8.8.8 | grep "Address:" | awk '{print $2}' | grep -v "#" || true)
echo "Resolved IPs:"
echo "$IPS"

# Stop containers to free port 80
cd /home/ubuntu/app
echo "Stopping Docker containers to free port 80..."
docker-compose down

echo "Requesting Let's Encrypt certificate..."
if sudo certbot certonly --standalone \
  -d ornetops.online \
  --non-interactive --agree-tos --email hello@ornetops.com; then

  echo "Certificate obtained successfully!"
  
  # Update nginx.conf to use Let's Encrypt certificates
  echo "Configuring Nginx with Let's Encrypt SSL..."
  cat << 'EOF' > nginx.conf
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    # Gzip Compression Settings
    gzip on;
    gzip_disable "msie6";
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_buffers 16 8k;
    gzip_http_version 1.1;
    gzip_min_length 256;
    gzip_types
        text/plain
        text/css
        application/json
        application/javascript
        application/x-javascript
        text/xml
        application/xml
        application/xml+rss
        text/javascript
        image/svg+xml
        image/x-icon;

    # Security headers applied globally
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://*.posthog.com https://www.googletagmanager.com https://www.google-analytics.com https://*.clarity.ms https://assets.calendly.com; worker-src 'self' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://api.fontshare.com https://assets.calendly.com; font-src 'self' data: https://fonts.gstatic.com https://api.fontshare.com https://cdn.fontshare.com; img-src 'self' data: blob: https://images.unsplash.com https://*.unsplash.com https://*.posthog.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://*.clarity.ms; connect-src 'self' https://*.posthog.com https://ornetops.online https://www.ornetops.online https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://*.clarity.ms; frame-src 'self' https://calendly.com; frame-ancestors 'none';" always;

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name ornetops.online www.ornetops.online;

        location / {
            return 301 https://$host$request_uri;
        }
    }

    # HTTPS Server
    server {
        listen 443 ssl;
        server_name ornetops.online www.ornetops.online;

        ssl_certificate /etc/letsencrypt/live/ornetops.online/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/ornetops.online/privkey.pem;

        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers on;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 1d;
        ssl_session_tickets off;

        client_max_body_size 100M;

        location / {
            proxy_pass http://app:8000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
EOF

  # Update docker-compose.yml to mount /etc/letsencrypt
  echo "Updating docker-compose.yml configuration..."
  cat << 'EOF' > docker-compose.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: aurumtech_app
    expose:
      - "8000"
    volumes:
      - uploads_data:/app/backend/uploads
    restart: always

  nginx:
    image: nginx:alpine
    container_name: aurumtech_nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - app
    restart: always

volumes:
  uploads_data:
EOF

  echo "Starting Docker containers with Let's Encrypt SSL..."
  docker-compose up -d
  echo "=== SUCCESS: SSL setup complete and site is secure ==="
else
  echo "=== ERROR: Let's Encrypt challenge failed ==="
  echo "Starting fallback containers with self-signed certificate..."
  docker-compose up -d
  exit 1
fi

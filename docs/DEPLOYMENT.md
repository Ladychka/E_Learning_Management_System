# ELMS — Production Deployment Guide

This guide describes how to deploy the ELMS platform using Docker Compose and standard production infrastructure.

---

## 1. System Requirements

- **Operating System:** Linux (Ubuntu 22.04 LTS or Debian 12 recommended) / Windows Server / macOS
- **CPU:** 2+ vCPUs
- **RAM:** 4GB minimum (8GB recommended for video processing & database)
- **Disk:** 40GB+ NVMe SSD storage
- **Installed Tooling:**
  - Docker & Docker Compose (`docker compose version >= 2.20`)
  - Node.js `20.x LTS`
  - Flutter SDK `3.22+` (for mobile builds)

---

## 2. Docker Compose Deployment

The repo includes a ready-to-run [docker-compose.yml](file:///d:/AUB%20Y4%20S1/Financial%20application%20design%20%28Teacher%20Piseth%20%29/FinTech/FinTech/elms/docker-compose.yml) service configuration.

### Starting PostgreSQL:
```bash
cd elms
docker compose up -d
```
This spins up PostgreSQL on port `5435` with persistent volume `postgres_data` and automatic container health checks.

---

## 3. Environment Configuration (`.env`)

Create or review `.env` in `backend/`:
```env
PORT=5000
NODE_ENV=production
DATABASE_URL="postgresql://elms:elms_secret@localhost:5435/elms_db?schema=public"

JWT_ACCESS_SECRET="generate-a-strong-32-byte-hex-secret-here"
JWT_REFRESH_SECRET="generate-a-distinct-32-byte-hex-secret-here"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

FRONTEND_URL="https://elms.edu.kh"
STORAGE_PROVIDER="local"
UPLOAD_DIR="./uploads"

# SMTP Email (Optional - mocks to console if absent)
SMTP_HOST="smtp.mailtrap.io"
SMTP_PORT=587
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="noreply@elms.edu.kh"
```

---

## 4. Database Setup & Seeding

Run Prisma migrations and database seeds:
```bash
cd backend
npm install
npx prisma migrate deploy
npm run db:seed
```

---

## 5. Web Console Production Build

Build the React + Vite single page application:
```bash
cd frontend
npm install
npm run build
```
The optimized bundle is generated into `frontend/dist/`.

---

## 6. Student Mobile App Build (Flutter)

Compile the Flutter mobile client for Android or iOS:

### Android APK / App Bundle:
```bash
cd mobile
flutter pub get
flutter build apk --release
# Output: mobile/build/app/outputs/flutter-apk/app-release.apk
```

### iOS Bundle:
```bash
cd mobile
flutter build ipa --release
```

---

## 7. Nginx Reverse Proxy Configuration

Recommended reverse proxy configuration snippet:
```nginx
server {
    listen 80;
    server_name elms.edu.kh api.elms.edu.kh;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name elms.edu.kh;

    ssl_certificate /etc/letsencrypt/live/elms.edu.kh/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/elms.edu.kh/privkey.pem;

    root /var/www/elms/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        alias /var/www/elms/backend/uploads/;
        add_header Access-Control-Allow-Origin *;
        add_header Cross-Origin-Resource-Policy cross-origin;
    }
}
```

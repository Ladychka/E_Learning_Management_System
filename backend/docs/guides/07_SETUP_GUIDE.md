# Setup Guide

Complete installation and configuration instructions for development, staging, and production environments.

---

## Prerequisites

| Requirement | Version | Purpose |
|-------------|---------|---------|
| Node.js | 20.x LTS | Runtime for backend and frontend |
| PostgreSQL | 15+ | Primary database |
| Docker & Docker Compose | Latest | Local infrastructure (optional but recommended) |
| pnpm (or npm/yarn) | 9+ | Package management |
| Git | 2.40+ | Version control |

---

## Quick Start (Docker Compose — Recommended)

The fastest way to get started uses Docker Compose for PostgreSQL.

### Step 1: Clone and Navigate

```bash
cd W:/FinTech/elms
```

### Step 2: Start PostgreSQL

```bash
docker-compose up -d
```

This creates:
- Container: `elms-db`
- Port: `5432`
- Database: `elms_db`
- User: `elms`
- Password: `elms_secret`

### Step 3: Backend Setup

```bash
cd backend

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
```

Edit `.env`:
```
DATABASE_URL="postgresql://elms:elms_secret@localhost:5432/elms_db?schema=public"
JWT_SECRET="your-super-secret-key-change-this"
JWT_EXPIRES_IN="7d"
REFRESH_TOKEN_EXPIRES_IN="30d"
FRONTEND_URL="http://localhost:5173"

# Email (optional — mock mode works without these)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="ELMS <noreply@elms.edu>"
```

Run database migrations:
```bash
npx prisma migrate dev --name init
```

Seed demo data:
```bash
npx prisma db seed
```

Start development server:
```bash
pnpm dev
```

Backend runs at: **http://localhost:5000**

### Step 4: Frontend Setup

Open a new terminal:

```bash
cd W:/FinTech/elms/frontend

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Frontend runs at: **http://localhost:5173**

### Step 5: Verify Installation

1. Open http://localhost:5173
2. Log in with demo accounts:
   - Admin: `admin@elms.edu` / `Admin123!`
   - Instructor: `instructor@elms.edu` / `Instructor123!`
   - Student: `student@elms.edu` / `Student123!`
3. Test API health: http://localhost:5000/health

---

## Manual Setup (Without Docker)

If you already have PostgreSQL installed locally:

### 1. Create Database

```bash
psql -U postgres
CREATE DATABASE elms_db;
CREATE USER elms WITH ENCRYPTED PASSWORD 'elms_secret';
GRANT ALL PRIVILEGES ON DATABASE elms_db TO elms;
```

### 2. Backend Configuration

Follow the same backend steps above, but adjust `DATABASE_URL` to match your local PostgreSQL instance.

### 3. Frontend Configuration

No additional configuration needed for local development. The Vite proxy handles API routing.

---

## Environment Variables Reference

### Backend `.env`

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `JWT_SECRET` | Yes | — | Secret key for JWT signing |
| `JWT_EXPIRES_IN` | No | `7d` | Access token lifetime |
| `REFRESH_TOKEN_EXPIRES_IN` | No | `30d` | Refresh token lifetime |
| `FRONTEND_URL` | No | `http://localhost:5173` | CORS origin |
| `PORT` | No | `5000` | API server port |
| `NODE_ENV` | No | `development` | Runtime environment |
| `SMTP_HOST` | No | — | Email server host |
| `SMTP_PORT` | No | `587` | Email server port |
| `SMTP_USER` | No | — | Email account |
| `SMTP_PASS` | No | — | Email password/app password |
| `SMTP_FROM` | No | — | Sender address |
| `KHQR_API_KEY` | No | — | KHQR sandbox key (Sprint 4) |
| `ABA_PAYWAY_MERCHANT_ID` | No | — | ABA merchant ID (Sprint 4) |
| `BAKONG_API_KEY` | No | — | Bakong API key (Sprint 4) |

### Frontend `.env` (if needed)

```
VITE_API_URL=http://localhost:5000/api/v1
```

---

## Database Management

### Reset Database

```bash
cd backend
npx prisma migrate reset
npx prisma db seed
```

**Warning:** This drops all tables and recreates them.

### View Database

```bash
npx prisma studio
```

Opens Prisma Studio at http://localhost:5555 for visual data browsing.

### Generate Migration

After schema changes:
```bash
npx prisma migrate dev --name descriptive_name
```

---

## Development Workflow

### Branch Strategy

```
main          ← production-ready code
develop       ← integration branch
feature/xxx   ← individual features
hotfix/xxx    ← urgent production fixes
```

### Commit Convention

```
feat: add module builder UI
fix: correct lesson ordering after drag-drop
docs: update API documentation
refactor: extract file upload utility
test: add enrollment flow tests
```

### Running Tests

Backend (when tests are added):
```bash
cd backend
pnpm test
```

---

## Production Deployment Checklist

- [ ] Change `JWT_SECRET` to cryptographically secure random string (≥32 bytes)
- [ ] Set `NODE_ENV=production`
- [ ] Configure production SMTP credentials
- [ ] Set up S3-compatible object storage (AWS S3, MinIO, etc.)
- [ ] Configure CDN for static asset delivery
- [ ] Set up Redis for session management (optional but recommended)
- [ ] Configure SSL/TLS certificates (HTTPS only)
- [ ] Enable database connection pooling
- [ ] Set up log aggregation (CloudWatch, Datadog, etc.)
- [ ] Configure backup strategy for PostgreSQL
- [ ] Set up monitoring and alerting
- [ ] Run security audit (`npm audit`)
- [ ] Remove seed data from production database
- [ ] Configure rate limiting thresholds for production traffic

---

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 5000
lsof -i :5000        # macOS/Linux
netstat -ano | findstr :5000   # Windows

# Kill process or change port in .env
PORT=5001
```

### Database Connection Failed

```bash
# Verify PostgreSQL is running
docker ps

# Check logs
docker logs elms-db

# Verify credentials
psql postgresql://elms:elms_secret@localhost:5432/elms_db
```

### Prisma Migration Errors

```bash
# Reset and regenerate
npx prisma migrate reset
npx prisma generate

# If schema drift detected
npx prisma migrate dev --create-only
npx prisma migrate deploy
```

### Frontend Proxy Not Working

Ensure backend is running on the port specified in `vite.config.ts` proxy settings (default: 5000).

---

*Document Version: 1.0*  
*Last Updated: 2026-07-24*

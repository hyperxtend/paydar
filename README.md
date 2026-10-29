# 🔔 Paydar

*Send the invoice. Ping the client. Get paid.*

Paydar is a full-stack invoicing system with a not-so-secret superpower: it **won't let overdue invoices go quietly into the night**. Create clients, raise invoices, and let the notification engine chase payments over email, SMS, WhatsApp and in-app alerts — so you don't have to.

---

## ✨ What it does

- 🔐 **Auth & orgs** — JWT login, role-aware access, everything scoped to your organisation
- 🛡️ **MFA** — TOTP two-factor authentication with QR enrolment, backup codes, and step-up login
- 👥 **Client management** — a proper address book for the people who owe you money
- 🧾 **Invoicing** — line items, tax, discounts, statuses — full CRUD from draft to paid
- 📣 **Multi-channel nudges** — email, SMS, WhatsApp and a live in-app bell, all rule-driven
- ⏰ **Overdue detection** — a Quartz scheduler that quietly checks due dates so you don't have to
- 💳 **Payments** — Stripe hosted checkout + webhooks, or just log a payment manually
- 📊 **Reporting** — live dashboard KPIs, AR aging buckets, and a one-click CSV export
- 🔒 **Security** — rate limiting, security headers, audit log, structured logging, health probes

---

## 🧱 Tech stack

| | |
|---|---|
| **Backend** | Java 21 · Spring Boot 3 · Spring Security 6 · Spring Data JPA · Flyway · Quartz · PostgreSQL |
| **Realtime & jobs** | Spring WebSocket (STOMP) for the live notification bell · Quartz for scheduled overdue sweeps |
| **Integrations** | Twilio (SMS & WhatsApp) · SendGrid (email) · Stripe (checkout + webhooks) · Google Authenticator (TOTP MFA) |
| **Frontend** | React 18 · TypeScript · Vite · Tailwind CSS · TanStack Query v5 · React Hook Form + Zod |
| **Security** | Bucket4j rate limiting · HSTS / CSP / X-Frame-Options headers · Audit log · BCrypt backup codes |
| **Monitoring** | Spring Boot Actuator · custom DB health indicator · liveness + readiness probes · structured JSON logs |
| **Infra** | Docker Compose (Postgres 16 + Redis 7) · multi-stage Dockerfiles · Nginx SPA server · GitHub Actions CI + deploy |

---

## 🚀 Running it locally

### Prerequisites

- Java 21
- Node 20
- Docker Desktop

### 1. Clone and start the datastores

```bash
git clone https://github.com/hyperxtend/paydar.git
cd paydar
docker compose up -d
```

This gives you Postgres on `5432` and Redis on `6379`, both with local defaults (`paydar` / `paydar`).

### 2. Start the backend

```bash
cd backend
./mvnw spring-boot:run
```

Flyway migrations run automatically on boot. The API comes up at **`http://localhost:8080/api`**.

> **First run?** The app works out of the box — email, SMS, Stripe and MFA are all opt-in. Just register an account and go.

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

The app runs at **`http://localhost:5173`** and proxies `/api` to the backend — no CORS config needed in dev.

---

## ⚙️ Environment variables

Copy `.env.example` to `.env` and fill in what you need. Nothing is required to get started locally — all integrations gracefully skip if unconfigured.

| Variable | Purpose | Required |
|---|---|---|
| `JWT_SECRET` | Base64 256-bit signing key — **generate a real one for any non-local env** | Dev default provided |
| `DB_URL` / `DB_USERNAME` / `DB_PASSWORD` | PostgreSQL connection | Docker Compose defaults |
| `MAIL_HOST` / `MAIL_USERNAME` / `MAIL_PASSWORD` / `MAIL_FROM` | SendGrid (or any SMTP) for email reminders | Optional |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM_NUMBER` / `TWILIO_WHATSAPP_FROM` | SMS + WhatsApp delivery | Optional |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Hosted checkout and webhook verification | Optional |
| `BASE_URL` | Public URL — used in Stripe redirect links | Optional |
| `CORS_ORIGINS` | Allowed frontend origin(s) in non-local setups | Optional |
| `REDIS_PASSWORD` | Redis auth (prod) | Optional |

> Generate a JWT secret: `openssl rand -base64 32`

> Forward Stripe webhooks locally: `stripe listen --forward-to localhost:8080/api/v1/payments/stripe-webhook`

---

## 🛡️ MFA setup

MFA is opt-in per user. Once logged in:

1. Go to **Account → Two-Factor Authentication → Set up**
2. Scan the QR code with Google Authenticator, Authy, or 1Password
3. Enter the 6-digit code to confirm pairing
4. Save your 8 backup codes somewhere safe — they're shown once

On subsequent logins, after entering your password you'll be prompted for a TOTP code. Backup codes work as a one-time fallback.

---

## 🐳 Production deployment

### Build and run with Docker Compose

```bash
cp .env.example .env   # fill in real values
docker compose -f docker-compose.prod.yml up -d
```

This starts Postgres, Redis, the Spring Boot backend, and an Nginx frontend — all on an isolated internal network. Only Nginx is exposed to the host.

### GitHub Actions deploy pipeline

Push to `main` → CI runs → Docker images are built and pushed to GHCR → SSH deploy to your server.

Set these secrets in your GitHub repo settings:

| Secret | Value |
|---|---|
| `DEPLOY_HOST` | Your server IP or hostname |
| `DEPLOY_USER` | SSH user on the server |
| `DEPLOY_SSH_KEY` | Private key for the deploy user |

All other secrets (`STRIPE_SECRET_KEY`, `TWILIO_*`, etc.) are passed as environment variables on the server via the `.env` file.

---

## 📁 Project layout

```
backend/
  src/main/java/com/paydar/
    auth/           JWT auth, MFA verify endpoint
    mfa/            TOTP enrolment, verification, backup codes
    domain/         JPA entities — Invoice, Client, Payment, Notification, User
    invoice/        Invoice service + controller
    client/         Client service + controller
    payment/        Manual payments + Stripe integration
    notification/   Rule engine, channel senders (Email/SMS/WhatsApp/InApp)
    reporting/      Dashboard metrics, AR aging, CSV export
    audit/          Immutable audit log
    scheduler/      Quartz jobs — overdue detection + notification dispatch
    config/         Security, CORS, rate limiting, WebSocket, health
  src/main/resources/
    db/migration/   Flyway V1–V9
    application.yml

frontend/
  src/
    api/            Axios clients for every backend resource
    context/        AuthContext — session, MFA challenge state
    hooks/          useInAppNotifications (STOMP WebSocket), useOnClickOutside
    pages/          LoginPage, Dashboard, Invoices, Clients, Notifications,
                    NotificationRules, Reports, Account, MfaSetupPage, MfaVerifyPage
    components/     AppLayout, NotificationBell, RecordPaymentModal, InvoiceStatusBadge
    types/          TypeScript types mirroring backend DTOs
  nginx.conf        SPA fallback + /api proxy + security headers
  Dockerfile        Multi-stage Node → Nginx

docker-compose.yml          Local dev (Postgres + Redis)
docker-compose.prod.yml     Production (all services, isolated network)
.env.example                Reference for all environment variables
.github/workflows/
  ci.yml                    Backend + frontend CI on every PR
  deploy.yml                Build → push GHCR → SSH deploy on merge to main
```

---

## 📜 How this thing got built

| Phase | What shipped |
|---|---|
| **1 — Foundation** | Spring Boot scaffold, JWT auth, org model, Flyway migrations, Docker Compose, GitHub Actions CI |
| **2 — Core domain** | Client + Invoice CRUD, line items, tax, status state machine, React frontend, protected routes |
| **3 — Notifications** | Quartz overdue detection, Email/SMS/WhatsApp/In-app senders, rule engine, WebSocket bell, notification history + rules UI |
| **4 — Payments** | Stripe hosted checkout + webhook auto-reconciliation, manual payment recording, balance tracking, payment history |
| **5 — Reporting** | Live dashboard KPIs, 5-bucket AR aging, CSV export, Reports page |
| **6 — Production-ready** | Bucket4j rate limiting, security headers, audit log, TOTP MFA (backend + frontend), Actuator health probes, multi-stage Dockerfiles, Nginx, deploy pipeline |

Want the play-by-play? `git log --oneline --reverse` tells the same story with receipts.

---

*Built phase by phase, commit by commit — auth first, money last (on purpose).*

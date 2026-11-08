# Paydar — Project Plan

**Status:** Planning
**Date:** 2026-07-04
**Type:** Full Stack — Business Invoice & Overdue Payment Notification System

---

## Overview

Paydar is a bespoke, end-to-end invoice management system with an intelligent notification engine. It enables businesses to create and manage invoices, track payment status, and automatically notify clients when payments are overdue — via email, SMS, and in-app channels.

---

## Feature Catalogue

### 1. Authentication & User Management
- User registration and login (email + password, OAuth via Google/Microsoft)
- Role-based access control: Admin, Finance, Viewer
- JWT-based session management with refresh tokens
- Multi-factor authentication (MFA/TOTP)
- Audit log of all user actions
- Password reset and account recovery flows

### 2. Client Management
- Create, update, archive client records
- Client contact book (multiple contacts per client, assign primary billing contact)
- Client portal — clients can log in to view and pay their own invoices
- Client payment history and outstanding balance summary

### 3. Invoice Management
- Create invoices with line items, tax, discounts, and custom notes
- Invoice numbering (auto-increment with configurable prefix e.g. `INV-0042`)
- Invoice statuses: Draft → Sent → Viewed → Partially Paid → Paid → Overdue → Void
- Recurring invoice schedules (weekly / monthly / custom)
- Invoice PDF generation (branded, downloadable)
- Duplicate/clone invoices
- Multi-currency support
- Invoice templates with company branding (logo, colours, terms)

### 4. Notification & Reminder Engine (Core Feature)
- Configurable reminder schedules per invoice or globally (e.g. 7 days before due, on due date, 3/7/14 days after due)
- Multi-channel delivery:
  - **Email** — HTML templates with invoice PDF attached
  - **SMS** — via Twilio or similar
  - **In-app** — notification bell / dashboard alerts
  - **WhatsApp** — optional, via WhatsApp Business API
- Escalation rules — escalate to a different contact or channel if unpaid after N days
- Notification history log per invoice — who was notified, when, on what channel, delivery status
- Manual "ping" — trigger an ad-hoc reminder from the dashboard
- Opt-out/unsubscribe management for clients
- Scheduled job system (cron / queue-based) for reliable delivery

### 5. Payment Tracking
- Mark invoices as paid manually (with payment reference and date)
- Partial payment recording
- Payment gateway integration for online payment links:
  - Stripe (recommended)
  - PayPal (optional)
- Automatic status update when payment is received via webhook
- Overdue detection — nightly job compares due dates against today

### 6. Dashboard & Reporting
- Overview dashboard: total outstanding, overdue, paid this month, upcoming due
- Invoice aging report (0–30, 31–60, 61–90, 90+ days overdue)
- Revenue timeline chart (monthly/quarterly/annual)
- Client-level reports — payment behaviour, average days to pay
- Export reports to CSV/PDF
- Email digest — weekly summary to admin/finance users

### 7. Settings & Configuration
- Company profile (name, logo, address, bank details, tax ID)
- Notification template editor (customise email/SMS copy per reminder stage)
- Default payment terms (net 15, net 30, etc.)
- Tax rates and codes (per region/client)
- Currency and locale settings
- Webhook configuration (notify external systems on payment events)

### 8. Security & Compliance
- HTTPS everywhere (TLS 1.3)
- All passwords hashed with bcrypt/argon2
- Input validation and output sanitisation (prevent XSS/injection)
- Rate limiting on all API endpoints
- CSRF protection
- Data encryption at rest (database-level)
- GDPR / data privacy considerations — right to erasure, data export
- Secrets managed via environment variables / secrets manager (never in code)
- Dependency vulnerability scanning (CI pipeline)

---

## Confirmed Stack & Scope

- **Users:** Internal team only (staff manage all invoices on behalf of the business)
- **Notification channels:** Email, SMS, In-app, WhatsApp
- **Core requirement:** Full CRUD on invoices — create, read, update, delete, and status tracking

---

## Recommended Tech Stack

### Frontend
- **React** (Vite) + **TypeScript**
- **Tailwind CSS** for styling
- **React Query (TanStack)** for server state
- **React Hook Form** for forms and validation
- **Recharts** for dashboard charts

### Backend
- **Java 21** + **Spring Boot 3** + **Spring Security**
- **Spring Data JPA** + **Hibernate** ORM
- **PostgreSQL** as primary database
- **Redis** for session caching and job queues
- **Spring Batch / Quartz Scheduler** for overdue detection cron jobs
- **Spring AMQP / RabbitMQ** (or Redis-backed queue) for notification job processing

### Notifications (all four channels)
- **Email** — JavaMailSender + SendGrid / AWS SES
- **SMS** — Twilio SDK (Java)
- **In-app** — Spring WebSocket + STOMP for real-time bell notifications
- **WhatsApp** — Twilio WhatsApp API or 360Dialog / Meta Cloud API

### Infrastructure
- **Docker + Docker Compose** for local development
- **PostgreSQL** (managed — AWS RDS, Supabase, or Railway)
- **Redis** (Upstash or Railway)
- **Hosting:** AWS ECS / Railway (Spring Boot backend), Vercel / Netlify (React frontend)
- **CI/CD:** GitHub Actions (Maven build, test, Docker image push)
- **Storage:** AWS S3 / Cloudflare R2 for invoice PDF storage

### Security Tools
- **Spring Security** (auth, CSRF, CORS, method-level security)
- **Bucket4j** (rate limiting)
- **Hibernate Validator** (Bean Validation — server-side input validation)
- **jjwt** for JWT handling
- **Google Authenticator / TOTP** (optional MFA via `dev.samstevens.totp`)

---

## Database Schema (Core Tables)

```
users               — id, email, password_hash, role, mfa_secret, created_at
organisations       — id, name, logo_url, address, tax_id, currency, created_at
clients             — id, org_id, name, email, phone, address, created_at
invoices            — id, org_id, client_id, number, status, issue_date, due_date, subtotal, tax, total, currency, notes
invoice_items       — id, invoice_id, description, quantity, unit_price, tax_rate
payments            — id, invoice_id, amount, payment_date, reference, method
notifications       — id, invoice_id, channel, scheduled_at, sent_at, status, error_message
notification_rules  — id, org_id, name, trigger_days_offset, channels[], template_id
templates           — id, org_id, channel, stage, subject, body
audit_logs          — id, user_id, action, entity_type, entity_id, metadata, created_at
```

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Client Browser / Mobile                                    │
│  React SPA                                                  │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS REST / WebSocket
┌──────────────────────▼──────────────────────────────────────┐
│  API Server (Node.js / Express)                             │
│  Auth · Invoices · Clients · Reports · Webhooks             │
└──────┬───────────────┬────────────────────┬─────────────────┘
       │               │                    │
┌──────▼──┐    ┌───────▼───────┐   ┌────────▼────────┐
│PostgreSQL│    │  Redis / BullMQ│   │  File Storage   │
│(primary  │    │  Job Queue     │   │  (S3 / R2)      │
│ data)    │    │                │   │  Invoice PDFs   │
└──────────┘    └───────┬───────┘   └─────────────────┘
                        │
              ┌─────────▼──────────┐
              │  Notification Worker│
              │  (background process│
              │   polls queue)      │
              └─────┬──────┬───────┘
                    │      │
             ┌──────▼─┐ ┌──▼──────┐
             │ Email   │ │  SMS    │
             │SendGrid │ │ Twilio  │
             └─────────┘ └─────────┘
```

---

## Development Phases

### Phase 1 — Foundation (Weeks 1–2)
- [ ] Project scaffolding (monorepo or separate repos for frontend/backend)
- [ ] Database setup with Prisma migrations
- [ ] Auth system (register, login, JWT, refresh tokens)
- [ ] Basic user and organisation management APIs
- [ ] Docker Compose dev environment
- [ ] CI pipeline (lint, type-check, tests)

### Phase 2 — Core Invoice System (Weeks 3–4)
- [ ] Client CRUD APIs + frontend
- [ ] Invoice CRUD APIs (create, edit, send, void)
- [ ] Invoice PDF generation (puppeteer or react-pdf)
- [ ] Invoice status state machine
- [ ] Dashboard skeleton + invoice list view

### Phase 3 — Notification Engine (Weeks 5–6)
- [ ] Notification rules configuration (UI + API)
- [ ] Email template system with variable substitution
- [ ] BullMQ job queue setup
- [ ] Overdue detection cron job
- [ ] Email delivery (SendGrid integration)
- [ ] Notification history log
- [ ] SMS delivery (Twilio integration)
- [ ] In-app notification bell (real-time via Socket.io)

### Phase 4 — Payments (Week 7)
- [ ] Manual payment recording
- [ ] Stripe payment link generation per invoice
- [ ] Stripe webhook handler (auto-mark paid)
- [ ] Partial payment support
- [ ] Payment history view

### Phase 5 — Reporting & Polish (Week 8)
- [ ] Dashboard metrics (outstanding, overdue, revenue chart)
- [ ] Invoice aging report
- [ ] CSV/PDF export
- [ ] Client portal (read-only login for clients)
- [ ] Notification template editor
- [ ] RBAC enforcement throughout

### Phase 6 — Security Hardening & Launch Prep
- [ ] Rate limiting, CSRF, Helmet.js
- [ ] MFA implementation
- [ ] Penetration test / security review
- [ ] Audit log UI
- [ ] Load testing
- [ ] Deployment pipeline (staging + production)
- [ ] Monitoring & alerting (Sentry, Uptime monitoring)

---

## Key Engineering Decisions

| Decision | Recommendation | Rationale |
|---|---|---|
| Monorepo vs separate repos | Monorepo (Turborepo) | Shared types, single CI pipeline |
| REST vs GraphQL | REST + OpenAPI spec | Simpler, well-understood, easier to document |
| ORM | Spring Data JPA + Hibernate | Native Spring ecosystem, mature, type-safe with proper entity design |
| Job queue | Quartz Scheduler + Redis queue | Reliable cron for overdue detection, Redis for async notification jobs |
| Email service | SendGrid via JavaMailSender | Deliverability, templates, free tier |
| PDF generation | iText 7 or Apache PDFBox | Production-grade Java PDF libraries |
| Auth strategy | Spring Security + JWT (httpOnly cookies) | Stateless, secure, first-class Spring integration |
| Database | PostgreSQL | Relational data model suits invoicing perfectly |
| WhatsApp | Twilio WhatsApp API | Easiest Java SDK, handles delivery receipts |

---

## Security Checklist (Non-Negotiables)

- [ ] All secrets in `.env` / secrets manager — never committed to git
- [ ] HTTPS enforced in production
- [ ] Passwords hashed with argon2id (min cost factor 3)
- [ ] JWT stored in httpOnly, Secure, SameSite=Strict cookies
- [ ] All user input validated server-side with Zod
- [ ] SQL injected prevented by ORM (parameterised queries only)
- [ ] Rate limiting: auth endpoints ≤10 req/min, general ≤200 req/min
- [ ] Webhook payloads verified by signature (e.g. Stripe-Signature header)
- [ ] GDPR: data export and deletion endpoints available
- [ ] Dependency audit in CI (`npm audit` / Snyk)

---

## Getting Started — First Steps

1. **Scaffold the project** — Generate a Spring Boot project at [start.spring.io](https://start.spring.io) with dependencies: Spring Web, Spring Security, Spring Data JPA, PostgreSQL Driver, Spring WebSocket, Validation, Lombok. For the frontend, scaffold with `npm create vite@latest frontend -- --template react-ts`.
2. **Stand up the database** — Use Docker Compose to run PostgreSQL locally. Design your first Hibernate entity classes and let Spring generate the schema (DDL auto), then lock it down with Flyway migrations.
3. **Build auth first** — Configure Spring Security for JWT, implement register/login/refresh endpoints. Everything else gates on identity.
4. **Build invoice CRUD next** — This is the core of the system. Full REST API for invoices with proper status transitions, then wire up the React frontend to it.
5. **Add the notification engine** — Once invoices are solid, build the Quartz scheduler job for overdue detection and the delivery workers for each channel (email → SMS → in-app → WhatsApp).
6. **Iterate in phases** — Use the Phase plan above as your sprint structure.

---

*Last updated: 2026-07-04*

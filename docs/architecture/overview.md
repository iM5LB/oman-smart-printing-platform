# Oman Smart Printing Platform — Architecture Overview

## Product Vision

A production-ready smart printing platform for Omani print shops, libraries, and copy centers. Customers order via mobile-friendly Arabic website; shops fulfill via Windows desktop application with automatic printing.

**Core value:** Customer sends a print order from their phone before arriving; documents are printed and waiting when they arrive with only an order number.

---

## System Components

```
┌─────────────────┐     HTTPS/WSS      ┌─────────────────┐
│  Customer Web   │◄──────────────────►│   API Server    │
│  (Next.js RTL)  │                    │   (NestJS)      │
└─────────────────┘                    └────────┬────────┘
                                                │
                    ┌───────────────────────────┼───────────────────────────┐
                    │                           │                           │
                    ▼                           ▼                           ▼
            ┌───────────────┐           ┌───────────────┐           ┌───────────────┐
            │  PostgreSQL   │           │     Redis     │           │ Object Storage│
            │  (Prisma)     │           │ BullMQ/Cache  │           │ (R2/S3/MinIO) │
            └───────────────┘           └───────────────┘           └───────────────┘
                                                │
                                                │ WebSocket
                                                ▼
                                        ┌───────────────┐
                                        │ Shop Desktop  │
                                        │ (.NET Win)    │
                                        │ + BG Service  │
                                        └───────┬───────┘
                                                │
                                                ▼
                                        ┌───────────────┐
                                        │ Windows       │
                                        │ Printers      │
                                        └───────────────┘
```

---

## Monorepo Structure

```
apps/
  customer-web/       Next.js — Arabic RTL customer website
  shop-desktop/       .NET WPF/WinUI — shop employee application
  api/                NestJS — REST + WebSocket backend

packages/
  database/           Prisma schema + migrations
  shared/             Business logic, validators, money utils
  types/              Shared TypeScript types/DTOs
  ui/                 Shared React components (RTL)

services/
  document-processing/  PDF conversion, preview generation

docs/
  architecture/       System design documents
  adr/                Architecture Decision Records
```

---

## Technology Choices

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Customer Web | Next.js 15, React, TypeScript, Tailwind | SSR, mobile performance, RTL support |
| API | NestJS, TypeScript | Modular architecture, WebSocket, validation |
| Database | PostgreSQL + Prisma | Relational data, migrations, type safety |
| Queue/Cache | Redis + BullMQ | Jobs, real-time, rate limiting |
| Storage | Private object storage (R2/S3) | Signed URLs, no public access |
| Desktop | C# .NET 8 | Reliable Windows printer API access |
| Desktop UI | WPF or WinUI 3 | Native Windows, Arabic RTL support |
| Notifications | Provider abstraction | SMS/WhatsApp — Oman providers pluggable |
| Payments | Provider abstraction | Webhook-verified, OMR 3-decimal |

---

## Multi-Tenancy

Each **store** is a tenant. Strict isolation:

- All queries scoped by `store_id`
- Row-level security enforced at application layer
- Device credentials bound to single store
- Signed file URLs include store + permission validation
- Shop A cannot access Shop B data under any circumstance

Store entry URL: `print.example.om/shop/{slug}` (e.g. `al-noor`)

---

## Security Principles

1. **Files never public** — signed URLs, short TTL, device authorization
2. **Payment verified server-side** — never trust browser payment success
3. **Device authentication** — each desktop registers with revocable credentials
4. **RBAC** — owner, manager, employee, cashier, print worker roles
5. **Audit logging** — all order, payment, print, price changes logged
6. **Idempotent printing** — unique `print_job_id`, no duplicate jobs on reconnect
7. **Money as integers** — store amounts in baisa (1 OMR = 1000 baisa), never float

---

## Real-Time Communication

- **WebSocket** (primary): Desktop ↔ API for orders, print commands, status
- **Server-Sent Events** (fallback): Order status for customer tracking page
- Desktop maintains persistent connection; no polling
- Offline resilience: local status cache, sync on reconnect with idempotency

---

## Phase 1 MVP Scope

End-to-end flow must work:

1. Customer uploads PDF → configures options → sees price → pays (online or pickup)
2. Order appears instantly on desktop
3. Auto-print on verified payment (if enabled)
4. Printer routing by capabilities
5. Finishing workflow (stapling → ready)
6. SMS notification to customer
7. Pickup by order number
8. File auto-deletion per privacy policy

See [order-lifecycle.md](./order-lifecycle.md), [payment-lifecycle.md](./payment-lifecycle.md), [printing-lifecycle.md](./printing-lifecycle.md).

---

## Deployment (Target)

| Service | Platform |
|---------|----------|
| Customer Web | Netlify or Vercel |
| API | Render or Railway |
| PostgreSQL | Render Postgres / Neon |
| Redis | Upstash / Render Key Value |
| Object Storage | Cloudflare R2 |
| Desktop | MSIX/ClickOnce distribution |

---

## Key ADRs

- [ADR-001: Money representation](../adr/001-money-representation.md)
- [ADR-002: Desktop technology](../adr/002-desktop-dotnet.md)
- [ADR-003: Real-time protocol](../adr/003-websocket-protocol.md)

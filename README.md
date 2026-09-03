# Oman Smart Printing Platform

Production-ready smart printing platform for Omani print shops, libraries, and copy centers.

**Core value:** Customers send print orders from their phone before arriving — documents are printed and waiting when they walk in with their order number.

## Products

| Product | Technology | Description |
|---------|-----------|-------------|
| Customer Website | Next.js | Arabic RTL mobile-first ordering |
| Shop Desktop App | Tauri 2 + React | Windows shop operations + printing |
| Print Worker | .NET 8 | Local Windows printer bridge |
| API Server | NestJS | REST + WebSocket backend |

## Monorepo Structure

```
apps/
  customer-web/      Customer-facing Arabic website
  shop-desktop-app/  Tauri shop desktop (React + Rust)
  print-worker/      .NET print bridge for Windows
  shop-desktop/      Legacy WPF prototype (transitional)
  api/               Backend API server
packages/
  database/          Prisma schema + PostgreSQL
  shared/            Business logic (money, phone, pricing)
  types/             Shared TypeScript types
services/
  document-processing/  PDF conversion (future)
docs/
  architecture/      System design documents
  adr/               Architecture Decision Records
  desktop/           Desktop app architecture & design
```

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 16+ (native install — no Docker required)
- .NET 8 SDK (for desktop app, later)

### Quick Start (no Docker)

```bash
npm install
cp .env.example .env   # default: postgres:postgres@localhost:5432/postgres
npm run db:generate
npm run db:push
npm run db:seed

# Terminal 1
npm run dev --workspace=@omsp/api

# Terminal 2
npm run dev --workspace=@omsp/customer-web
```

Or start everything with embedded PostgreSQL (no native PG install needed):

```bash
npm run dev:all
```

### Setup (with Docker — optional)

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database, Redis, and storage credentials

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Start all apps in development
npm run dev
```

### Development URLs

| App | URL |
|-----|-----|
| Customer Web | http://localhost:3000 |
| API | http://localhost:4000 |
| API WebSocket | ws://localhost:4000/ws/shop |

### Shop desktop (Windows)

```bash
npm run desktop:dev
```

Requires .NET 8 SDK for `print-worker`, plus the Tauri/Rust toolchain for the desktop shell.

## Phase 1 MVP

See [docs/architecture/overview.md](docs/architecture/overview.md) for full architecture.

End-to-end scenario that must work:
1. Customer uploads PDF on mobile → configures print options → sees price
2. Customer pays online or selects pay-at-pickup
3. Desktop app receives order instantly via WebSocket
4. Auto-print on verified payment with correct printer settings
5. Employee handles finishing (stapling) → marks ready
6. Customer receives SMS notification
7. Customer picks up with order number

## Key Design Decisions

- **Money:** Stored as integer baisa (1 OMR = 1000 baisa), never float
- **Language:** Arabic-only, RTL-first design
- **Payments:** Webhook-verified before auto-print
- **Files:** Private storage with signed URLs, auto-deletion
- **Printing:** Idempotent jobs, no duplicate prints on reconnect
- **Tenancy:** Strict store isolation

## Documentation

- [Architecture Overview](docs/architecture/overview.md)
- [Order Lifecycle](docs/architecture/order-lifecycle.md)
- [Payment Lifecycle](docs/architecture/payment-lifecycle.md)
- [Printing Lifecycle](docs/architecture/printing-lifecycle.md)
- [WebSocket Protocol](docs/architecture/websocket-protocol.md)
- [File Privacy](docs/architecture/file-privacy-lifecycle.md)
- [Arabic UX Design](docs/architecture/arabic-ux-design.md)
- [WhatsApp Cloud API OTP](docs/whatsapp-otp.md)

## License

Proprietary — All rights reserved.

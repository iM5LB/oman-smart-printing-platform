# ADR-003: Real-Time Communication Protocol

## Status
Accepted

## Context
Desktop application must receive orders instantly without polling. Customer tracking page needs status updates.

## Decision
- **WebSocket** for desktop ↔ API (bidirectional, persistent)
- **Server-Sent Events** for customer order tracking (read-only, simpler)
- **Redis pub/sub** for multi-instance API coordination

## Alternatives Considered
| Option | Pros | Cons |
|--------|------|------|
| Polling | Simple | Latency, server load |
| SSE only | Simple server push | No desktop → server channel |
| WebSocket everywhere | Unified | Overkill for customer tracking |

## Consequences
- NestJS `@WebSocketGateway` for shop connections
- Device token auth on WebSocket handshake
- Message protocol documented in `websocket-protocol.md`
- Idempotency keys on all print dispatch messages

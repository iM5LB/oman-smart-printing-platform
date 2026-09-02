# Design system (desktop UI)

## Direction
Dark, professional, information-dense, Arabic RTL. Borders over heavy shadows. No glass/neon/over-round.

## Color tokens

```css
--bg-base: #0f1419;
--bg-surface: #161b22;
--bg-elevated: #1c2330;
--bg-hover: #242d3a;

--border-default: #2a3441;
--border-strong: #3d4a5c;

--text-primary: #e8eef6;
--text-secondary: #a8b3c4;
--text-muted: #7a8699;

--primary: #3b82f6;
--primary-hover: #2563eb;

--success: #22c55e;
--warning: #f59e0b;
--danger: #ef4444;
--info: #38bdf8;
```

## Typography
Font: professional Arabic + Latin (e.g. IBM Plex Sans Arabic or Tajawal + system).

| Token | Size | Use |
|-------|------|-----|
| display | 24–28 | rare |
| page-title | 18–20 | top bar / page |
| section | 14–15 | section heads |
| body | 13 | default |
| small | 12 | meta |
| caption | 11 | table secondary |
| table | 12–13 | grids |

## Spacing
4 · 8 · 12 · 16 · 20 · 24 · 32

## Radius
6 · 8 · 10 (avoid 20+)

## Motion
Hover 100–150ms · Drawer 180–220ms · Modal 150–200ms · respect `prefers-reduced-motion`

## Component inventory (Phase 1 priority)
Button, IconButton, Input, SearchInput, Select, Checkbox, Switch, Tabs, StatusBadge, OrderBadge, PaymentBadge, PrinterBadge, Card, MetricCard, Table/DataGrid, Modal, ConfirmDialog, Drawer, Dropdown, Tooltip, Toast, Alert, Skeleton, EmptyState, ErrorState, OfflineBanner, PageHeader, MoneyDisplay, PhoneDisplay, QueueItem, PrinterCard, Timeline

## States
Default · Hover · Pressed · Focus (visible) · Disabled · Loading · Error · Success

## Mixed bidi
`dir="ltr"` islands for phones, filenames, printer names, order ids where needed; logical CSS properties everywhere.

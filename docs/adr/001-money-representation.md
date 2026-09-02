# ADR-001: Money Representation

## Status
Accepted

## Context
Omani Rial uses 3 decimal places (e.g., 1.700 OMR). Floating-point arithmetic causes rounding errors in financial calculations.

## Decision
Store all monetary values as **integer baisa** (1 OMR = 1000 baisa).

- Database: `INTEGER` columns named `*_baisa`
- API: all amounts in baisa
- Display: format as `{baisa / 1000}` with 3 decimal places + ` ر.ع`
- Calculations: integer arithmetic only, round half-up at final step if needed

## Examples
| Display | Stored (baisa) |
|---------|---------------|
| 0.020 ر.ع | 20 |
| 0.500 ر.ع | 500 |
| 1.700 ر.ع | 1700 |
| 10.000 ر.ع | 10000 |

## Consequences
- Shared utility `formatOMR(baisa: number): string` in `@omsp/shared`
- Prisma schema uses `Int` for all money fields
- Payment providers receive amount in baisa or converted at provider boundary

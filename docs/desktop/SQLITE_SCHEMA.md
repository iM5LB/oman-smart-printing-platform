# SQLite schema (print service)

Location: `%ProgramData%\OMSP\print-service\omsp-local.db`  
Not the source of truth for business data.

## Tables

### device_configuration
| Column | Type | Notes |
|--------|------|-------|
| key | TEXT PK | |
| value | TEXT | JSON or scalar |
| updated_at | TEXT | ISO |

### printer_mappings
| Column | Type | Notes |
|--------|------|-------|
| local_printer_id | TEXT PK | Windows name/id |
| cloud_printer_id | TEXT | nullable until synced |
| roles_json | TEXT | `["bw","fast"]` |
| priority | INTEGER | |
| enabled | INTEGER | 0/1 |
| caps_json | TEXT | cached capabilities |
| updated_at | TEXT | |

### local_print_jobs
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | local uuid |
| cloud_job_id | TEXT UNIQUE | idempotency |
| order_id | TEXT | |
| order_number | TEXT | |
| state | TEXT | state machine |
| printer_id | TEXT | |
| file_path | TEXT | |
| checksum | TEXT | |
| settings_json | TEXT | |
| spooler_id | TEXT | nullable |
| error_code | TEXT | |
| attempt | INTEGER | |
| created_at | TEXT | |
| updated_at | TEXT | |

### job_events
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| local_job_id | TEXT FK | |
| state | TEXT | |
| message | TEXT | |
| created_at | TEXT | |

### pending_sync_events
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| kind | TEXT | `job.status`, `order.ready`, … |
| payload_json | TEXT | |
| idempotency_key | TEXT UNIQUE | |
| attempts | INTEGER | |
| next_attempt_at | TEXT | |
| created_at | TEXT | |

### cached_configuration
| Column | Type | Notes |
|--------|------|-------|
| key | TEXT PK | auto_print_policy, retention, … |
| value | TEXT | |
| version | INTEGER | server settings version |
| updated_at | TEXT | |

### service_state
| Column | Type | Notes |
|--------|------|-------|
| key | TEXT PK | |
| value | TEXT | last_sync, ws_cursor, … |

## Retention

- Do not store file bytes in SQLite.
- Delete job file paths after retention policy; null out `file_path`.
- Cap `job_events` (e.g. 30 days) via maintenance task.

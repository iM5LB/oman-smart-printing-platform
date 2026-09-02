# File lifecycle

```text
Cloud object (private)
    → authenticated request / signed URL
    → download to ProgramData\OMSP\jobs\{cloudJobId}\source.pdf
    → checksum verify
    → print service submits to spooler
    → monitor completion
    → on success/failure per policy: delete or retain until TTL
    → startup sweeper removes expired orphans
```

## Rules

- Never permanent customer file archive on desktop.
- Never public URLs.
- One working directory per `cloudJobId`.
- Reprint downloads again (or reuses if TTL valid) under **new** job id folder.
- Logs store filenames only, not paths to other users’ data beyond job folder name.

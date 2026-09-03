# Desktop auto-updates (GitHub Releases)

Windows builds publish updater artifacts (`latest.json` + signed installers) to GitHub Releases. The Tauri app checks that feed on launch and from **الإعدادات → تحقق من التحديثات**.

Repo: `iM5LB/oman-smart-printing-platform`  
Endpoint: `https://github.com/iM5LB/oman-smart-printing-platform/releases/latest/download/latest.json`

## 1. Signing keys (one-time)

A keypair was generated locally (not in git):

| File | Path |
|------|------|
| Private key | `%USERPROFILE%\.tauri\omsp-desktop.key` |
| Public key | `%USERPROFILE%\.tauri\omsp-desktop.key.pub` (also in `tauri.conf.json`) |

**Never commit the private key.** If you lose it, users on old builds cannot receive signed updates.

Regenerate (only if starting fresh — breaks updates for existing installs):

```powershell
npx --yes @tauri-apps/cli signer generate -w "$env:USERPROFILE\.tauri\omsp-desktop.key" --ci --force
```

Then paste the new `.pub` contents into `src-tauri/tauri.conf.json` → `plugins.updater.pubkey`.

## 2. GitHub Actions secrets

Repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Value |
|--------|--------|
| `TAURI_SIGNING_PRIVATE_KEY` | Full contents of `omsp-desktop.key` (one line / whole file) |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Empty string if the key has no password (this key was generated without one) |

`GITHUB_TOKEN` is provided automatically by the workflow.

PowerShell helper to copy the private key:

```powershell
Get-Content "$env:USERPROFILE\.tauri\omsp-desktop.key" -Raw | Set-Clipboard
```

## 3. Cut a release

1. Bump **the same** version in:
   - `apps/shop-desktop-app/package.json`
   - `apps/shop-desktop-app/src-tauri/tauri.conf.json`
   - `apps/shop-desktop-app/src-tauri/Cargo.toml`
2. Commit and push to `main` (or your release branch).
3. Tag and push:

```powershell
git tag v0.1.1
git push origin v0.1.1
```

4. Workflow `.github/workflows/release-desktop.yml` builds a self-contained print-worker + Tauri NSIS on `windows-latest`, then creates a GitHub Release with `latest.json` (`includeUpdaterJson: true`). Local `npm run desktop:build` skips updater signing unless `TAURI_SIGNING_PRIVATE_KEY` is set.

You can also run the workflow manually via **Actions → Release desktop → Run workflow**.

## 4. Verify an update

1. Install an **older** NSIS build (e.g. `0.1.0`).
2. Publish a newer tag (e.g. `v0.1.1`) and wait for the release assets.
3. Open the old app — silent check should show **يتوفر تحديث** / **تحديث الآن** / **لاحقاً**.
4. Or open **الإعدادات** → **تحقق من التحديثات**.
5. After install + relaunch, Settings should show the new version.

Offline / browser / no update → fails quietly (no error toast on launch).

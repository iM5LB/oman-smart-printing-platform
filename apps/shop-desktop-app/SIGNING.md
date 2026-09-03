# Windows Authenticode signing — eliminating SmartScreen

Unsigned installers show **"Windows protected your PC"**. The only fix is a real
code-signing certificate from a CA trusted by Microsoft. Self-signed certs and SSL
certs do **not** help SmartScreen.

> **Good news (2024/2026 change):** EV certificates no longer give instant
> SmartScreen bypass — Microsoft now builds reputation the same way for OV and EV.
> You do NOT need to pay the EV premium.

---

## Cost comparison (as of Sep 2026)

| Option | Cost | Who | Notes |
|--------|------|-----|-------|
| **Azure Artifact Signing** | ~$10/mo (~$120/yr) | Orgs in USA, CA, EU, UK · Individuals US/CA only | Cheapest cloud, no token, CI/CD native. **Not available to individual devs in Oman.** Org registration needed. |
| **Certum Cloud OV (via SSLmentor)** | ~$108–116/yr | Any country (org or individual) | Cloud-based SimplySign — no USB token. **Best value if Azure is blocked by region.** |
| **SSL.com IV/OV** | ~$65–129/yr | Any country | Physical FIPS token shipped to you, or eSigner cloud (+~$180/yr) |
| **Sectigo OV** | ~$280–530/yr | Any country | Requires shipping token to Oman address |
| **DigiCert OV** | ~$400+/yr | Any country | Enterprise |

**Recommended for Tibaa:**

- If you can register a business entity (LLC/SAOC) in Oman — use **Azure Artifact Signing** (~$10/mo, no hardware). Organisation identity verification takes a few business days.
- If you're an individual developer or cannot wait for Azure validation — use **Certum Cloud OV Individual** via [SSLmentor](https://www.sslmentor.com/ssl/code-signing) (~$115/yr, cloud signing, no physical token to ship).

Both sign the installer silently in GitHub Actions — the pipeline is already wired.

---

## Option A — Azure Artifact Signing (~$10/mo)

### Prerequisites
- Azure subscription (free tier works, but billing must be enabled)
- Organisation registered in USA, CA, EU, UK — OR individual dev in US/CA

### Steps
1. Go to [portal.azure.com](https://portal.azure.com) → search **Artifact Signing** → Create account (Basic plan).
2. Create a **Certificate profile** (Public Trust, OV).
3. Identity validation: upload business registration documents. Microsoft verifies in 1–3 business days.
4. Create an **App Registration** (Microsoft Entra ID → App registrations → New registration).
5. Under that app, create a **Client secret** (Certificates & secrets → New client secret). Copy the value now — you won't see it again.
6. In your Artifact Signing account → Access control (IAM) → Add role assignment → **Artifact Signing Certificate Profile Signer** → assign to your App Registration.

### GitHub secrets to add
Go to your repo → Settings → Secrets and variables → Actions → New repository secret:

| Secret name | Value |
|-------------|-------|
| `AZURE_TENANT_ID` | Directory (tenant) ID (from App Registration overview) |
| `AZURE_CLIENT_ID` | Application (client) ID |
| `AZURE_CLIENT_SECRET` | Client secret value |
| `AZURE_TRUSTED_SIGNING_ENDPOINT` | e.g. `https://eus.codesigning.azure.net` |
| `AZURE_TRUSTED_SIGNING_ACCOUNT` | Your Artifact Signing account name |
| `AZURE_TRUSTED_SIGNING_PROFILE` | Your certificate profile name |

Tag a new release — the workflow detects the secrets automatically.

---

## Option B — Certum Cloud OV Individual (~$115/yr, any country)

Best for individual developers or when Azure's regional restriction applies.

### Steps
1. Buy **Certum Code Signing Individual in Cloud** from [SSLmentor](https://www.sslmentor.com/ssl/code-signing) (~$115/yr, 1 yr) or [sslpoint.com](https://www.sslpoint.com).
2. Complete identity validation (passport/national ID scan). Takes 3–5 business days.
3. Certum gives you a **SimplySign** account — cloud HSM, no USB token needed.
4. Export/download a `.pfx` file from SimplySign portal, or note the signing command they provide.

### GitHub secrets to add

| Secret name | Value |
|-------------|-------|
| `WINDOWS_CERTIFICATE` | Base64 of your `.pfx` — run `certutil -encode cert.pfx out.txt` and paste the content |
| `WINDOWS_CERTIFICATE_PASSWORD` | PFX export password |

The workflow imports the PFX into the runner's cert store and passes the thumbprint to Tauri automatically.

---

## Local build with a PFX (option B)

```powershell
$env:WINDOWS_CERTIFICATE_FILE = "C:\certs\tibaa.pfx"
$env:WINDOWS_CERTIFICATE_PASSWORD = "your-password"
npm run desktop:build
```

`scripts/desktop-build.mjs` imports the PFX and passes the thumbprint to Tauri.

---

## After signing — verify it worked

```powershell
Get-AuthenticodeSignature .\Tibaa_*_x64-setup.exe
```

- **Status** should be `Valid`
- **SignerCertificate.Subject** should show your name / org name

SmartScreen still builds reputation over time — the first few hundred downloads may
still show a soft warning, but the **"Unknown Publisher"** / **"Windows protected
your PC"** block is gone. As more users download and run without issue, the warning
disappears completely.

---

## What the CI does automatically

Once secrets are present, `.github/workflows/release-desktop.yml`:

1. Detects which secret set is present (Azure → `mode=azure`, PFX → `mode=pfx`, none → `mode=none`).
2. For Azure: installs `artifact-signing-cli`, writes a `signCommand` merge-config.
3. For PFX: imports the cert, captures the thumbprint, writes a `certificateThumbprint` merge-config.
4. Passes the config to `tauri build` via `--config`. Tauri calls signtool internally.
5. The signed `.exe` and NSIS installer are uploaded to the GitHub Release.

No code changes needed — just add secrets and tag a release.

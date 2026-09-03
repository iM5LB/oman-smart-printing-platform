# WhatsApp Cloud API OTP

Customer login and library device-pairing codes are sent through the official **Meta WhatsApp Cloud API**. There is no Baileys / whatsapp-web.js session.

**Business WhatsApp line (sender):** `+96876655365` (Oman, national `76655365`).

This is the number to register and connect in [WhatsApp Manager](https://business.facebook.com/). Cloud API does **not** send “from” an arbitrary MSISDN via env alone — `WHATSAPP_PHONE_NUMBER_ID` is Meta’s ID for that registered line.

| Direction | Number |
| --- | --- |
| **From** (platform) | `+96876655365` — must be the WhatsApp Business number in Meta |
| **To** (customer login OTP) | Each customer’s own phone |
| **To** (library device-pairing OTP) | That store’s `deviceConfirmPhone` (demo seed uses `+96876655365`) |

Set `SMS_PROVIDER=mock` locally (codes are logged and returned as `dev_code`). Set `SMS_PROVIDER=whatsapp` on Render once the Meta template is approved and Phone number ID is pasted.

## 1. Meta Business setup

1. Open [Meta Business Suite](https://business.facebook.com/) and create or select a Business.
2. Go to [Meta for Developers](https://developers.facebook.com/) → **My Apps** → **Create App** → type **Business**.
3. Add the **WhatsApp** product.
4. In **WhatsApp Manager**, add / connect the business number **`+96876655365`**. Complete Meta’s SMS/voice verification on that handset.
5. In **WhatsApp → API Setup** copy:
   - **Phone number ID** (numeric Meta ID for `+96876655365`, **not** `96876655365`) → `WHATSAPP_PHONE_NUMBER_ID`
   - A permanent **system user** token (not the short-lived temp token) → `WHATSAPP_TOKEN`
6. Create a **system user** in Business Settings → Users → System users:
   - Assign the WhatsApp Business Account with **whatsapp_business_messaging** and **whatsapp_business_management**.
   - Generate a token and store it only in Render env (never commit it).

If you only have the MSISDN (`+96876655365`) so far: finish adding that number in WhatsApp Manager, then copy **Phone number ID** from API Setup into Render. OTP cannot send until that ID and `WHATSAPP_TOKEN` are set with `SMS_PROVIDER=whatsapp`.

During development you can use the Cloud API **test number**. It can only message numbers listed under **To** / allowed recipients in API Setup.

## 2. Authentication template (required for OTP)

Business-initiated OTPs must use an **AUTHENTICATION** template (free-form session messages are not allowed).

1. WhatsApp Manager → **Message templates** → **Create template**.
2. Category: **Authentication**.
3. Language: Arabic (`ar`) and/or English (`en` / `en_US`) — must match `WHATSAPP_OTP_TEMPLATE_LANG`.
4. Enable **Copy code** button. Body text is preset by Meta and includes `{{1}}` for the code (you do not write a custom OTP body).
5. Optional: security disclaimer + footer expiry **5 minutes**.
6. Name example: `otp_verify` or `authentication`. Copy that name into `WHATSAPP_OTP_TEMPLATE_NAME`.
7. Submit. Authentication templates are often auto-approved.

The API sends the same code as:

- body parameter `{{1}}`
- copy-code button parameter (`sub_type: url`, index `0`)

If your template has no copy-code button, set `WHATSAPP_OTP_SKIP_COPY_BUTTON=true`.

## 3. Environment

```
SMS_PROVIDER=whatsapp
WHATSAPP_BUSINESS_NUMBER=+96876655365
WHATSAPP_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_OTP_TEMPLATE_NAME=otp_verify
WHATSAPP_OTP_TEMPLATE_LANG=ar
# optional utility template: {{1}} order number, {{2}} store name
WHATSAPP_ORDER_READY_TEMPLATE_NAME=
```

- `WHATSAPP_BUSINESS_NUMBER` is optional documentation / sanity-check (E.164 of the Meta-registered sender). It does **not** replace `WHATSAPP_PHONE_NUMBER_ID` and does **not** redirect customer OTPs.
- `WHATSAPP_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` are secrets — set them in the Render dashboard, never commit them.

On Render (`omsp-api`): Dashboard → Environment → set the keys above, then change `SMS_PROVIDER` from `mock` to `whatsapp`. Redeploy or restart the API.

Keep `OTP_DEV_EXPOSE=false` in production so codes are not returned in JSON.

## 4. Phone numbers

Stored numbers are E.164. Oman mobiles are 8 digits starting with **7** or **9** (e.g. `76655365` → `+96876655365`). The Cloud API `to` field is sent **without** `+` (`96876655365`). Recipients must have WhatsApp installed.

Shared `normalizePhone` / `formatPhoneForWhatsApp` handle Oman `7xxxxxxxx` and `9xxxxxxxx` plus international E.164.

## 5. Optional: order-ready

Create a **Utility** template, for example:

> طلبك {{1}} جاهز للاستلام — {{2}}

Set `WHATSAPP_ORDER_READY_TEMPLATE_NAME`. If unset, OTP still works; order-ready WhatsApp is skipped.

## 6. Local mock

```
SMS_PROVIDER=mock
```

OTP is printed in the API console and returned as `dev_code` (non-production). No Meta account required.

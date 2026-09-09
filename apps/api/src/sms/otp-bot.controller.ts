import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { WhatsAppBaileysClient } from './whatsapp-baileys.client';

function assertSetupPassword(password?: string) {
  const expected = process.env.LIBRARY_SETUP_PASSWORD ?? '';
  if (!expected || expected.length < 8) {
    throw new UnauthorizedException(
      'كلمة مرور الإعداد غير مهيأة على الخادم (LIBRARY_SETUP_PASSWORD)',
    );
  }
  if (!password || password !== expected) {
    throw new UnauthorizedException('كلمة مرور الإعداد غير صحيحة');
  }
}

@Controller('otp-bot')
export class OtpBotController {
  constructor(private readonly baileys: WhatsAppBaileysClient) {}

  @Get('status')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  status(@Headers('x-setup-password') headerPassword?: string) {
    assertSetupPassword(headerPassword);
    return this.baileys.getStatus();
  }

  @Get('qr')
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  async qr(
    @Headers('x-setup-password') headerPassword?: string,
    @Query('refresh') refresh?: string,
  ) {
    assertSetupPassword(headerPassword);
    return this.baileys.getQrDataUrl(refresh === '1' || refresh === 'true');
  }

  @Post('logout')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async logout(@Headers('x-setup-password') headerPassword?: string) {
    assertSetupPassword(headerPassword);
    await this.baileys.logout();
    return { ok: true };
  }

  /** Unlock form — never put the setup password in the URL. */
  @Get('link')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  linkForm(@Query('error') error?: string) {
    return renderUnlockPage(error === '1');
  }

  /** Submit password via POST body, then show QR (password stays out of the address bar). */
  @Post('link')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async linkUnlock(@Body('password') password?: string) {
    try {
      assertSetupPassword(typeof password === 'string' ? password.trim() : undefined);
    } catch {
      return renderUnlockPage(true);
    }

    const data = await this.baileys.getQrDataUrl(true);
    const status = this.baileys.getStatus();
    return renderQrPage(status, data);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pageShell(title: string, body: string): string {
  return `<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeHtml(title)}</title>
<body style="font-family:system-ui;background:#0f1419;color:#e8eef6;display:grid;place-items:center;min-height:100vh;margin:0">
  <div style="text-align:center;max-width:28rem;padding:2rem;width:100%">
    ${body}
  </div>
</body></html>`;
}

function renderUnlockPage(badPassword: boolean): string {
  const err = badPassword
    ? `<p style="color:#f87171;font-size:.9rem;margin-bottom:1rem">كلمة مرور الإعداد غير صحيحة</p>`
    : '';
  return pageShell(
    'ربط واتساب OTP',
    `<h1>ربط بوت واتساب</h1>
    <p style="opacity:.8;margin:0.75rem 0 1.25rem">أدخل كلمة مرور الإعداد (لا تضعها في الرابط).</p>
    ${err}
    <form method="POST" action="/api/v1/otp-bot/link" id="unlock" style="display:grid;gap:0.75rem;text-align:start">
      <label style="font-size:.85rem;opacity:.75">كلمة مرور الإعداد
        <input name="password" type="password" required autocomplete="current-password" dir="ltr"
          style="display:block;width:100%;margin-top:0.35rem;padding:0.75rem;border-radius:0.5rem;border:1px solid #334155;background:#1e293b;color:#e8eef6"/>
      </label>
      <button type="submit" style="padding:0.75rem 1rem;border:0;border-radius:0.5rem;background:#3b82f6;color:#fff;font-weight:600;cursor:pointer">
        عرض رمز QR
      </button>
    </form>
    <script>
      document.getElementById('unlock').addEventListener('submit', function (e) {
        var v = e.target.password.value;
        if (v) sessionStorage.setItem('omsp_otp_bot_pw', v);
      });
    </script>
    <p style="opacity:.5;font-size:.8rem;margin-top:1.5rem">الأفضل: استخدم شاشة «بوت واتساب OTP» داخل تطبيق سطح المكتب.</p>`,
  );
}

function renderQrPage(
  status: { status: string; detail: string; connected_user: string | null },
  data: { status: string; qr_data_url: string | null; detail: string },
): string {
  if (status.status === 'ready') {
    return pageShell(
      'واتساب مرتبط',
      `<h1>تم الربط</h1>
      <p>البوت جاهز لإرسال رموز OTP عبر واتساب.</p>
      <p style="opacity:.7;font-size:.9rem">${escapeHtml(status.connected_user ?? '')}</p>
      <p style="opacity:.55;font-size:.8rem;margin-top:1rem">يفضّل رقم واتساب احتياطي. بعد إعادة نشر Render قد تحتاج إعادة المسح إن فُقدت الجلسة.</p>
      <p style="margin-top:1.25rem"><a href="/api/v1/otp-bot/link" style="color:#93c5fd">رجوع</a></p>`,
    );
  }

  const img = data.qr_data_url
    ? `<img alt="QR" src="${data.qr_data_url}" style="width:280px;height:280px;background:#fff;padding:12px;border-radius:12px"/>`
    : `<p>جاري تجهيز رمز QR… أعد الإرسال بعد ثوانٍ.</p>`;

  return pageShell(
    'ربط واتساب OTP',
    `<h1>امسح الرمز بهاتفك</h1>
    <p>واتساب → الإعدادات → الأجهزة المرتبطة → ربط جهاز</p>
    <div style="margin:1.5rem 0">${img}</div>
    <p style="opacity:.75;font-size:.85rem">الحالة: ${escapeHtml(data.status)} — ${escapeHtml(data.detail)}</p>
    <form method="POST" action="/api/v1/otp-bot/link" id="refresh" style="margin-top:1rem">
      <input type="hidden" name="password" id="pw"/>
      <button type="submit" style="padding:0.6rem 1rem;border:0;border-radius:0.5rem;background:#334155;color:#e8eef6;cursor:pointer">تحديث الرمز</button>
    </form>
    <script>
      (function () {
        var hidden = document.getElementById('pw');
        var stored = sessionStorage.getItem('omsp_otp_bot_pw');
        if (stored) hidden.value = stored;
        else document.getElementById('refresh').style.display = 'none';
      })();
    </script>
    <p style="opacity:.55;font-size:.8rem;margin-top:1.5rem">تحذير: طريقة غير رسمية. قد تحظر واتساب الرقم. استخدم رقماً احتياطياً إن أمكن.</p>`,
  );
}

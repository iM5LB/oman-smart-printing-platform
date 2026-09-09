import {
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
  if (!expected || !password || password !== expected) {
    throw new UnauthorizedException('كلمة مرور الإعداد غير صحيحة');
  }
}

@Controller('otp-bot')
export class OtpBotController {
  constructor(private readonly baileys: WhatsAppBaileysClient) {}

  @Get('status')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  status(@Headers('x-setup-password') headerPassword?: string, @Query('password') q?: string) {
    assertSetupPassword(headerPassword ?? q);
    return this.baileys.getStatus();
  }

  @Get('qr')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async qr(
    @Headers('x-setup-password') headerPassword?: string,
    @Query('password') q?: string,
    @Query('refresh') refresh?: string,
  ) {
    assertSetupPassword(headerPassword ?? q);
    return this.baileys.getQrDataUrl(refresh === '1' || refresh === 'true');
  }

  @Post('logout')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async logout(
    @Headers('x-setup-password') headerPassword?: string,
    @Query('password') q?: string,
  ) {
    assertSetupPassword(headerPassword ?? q);
    await this.baileys.logout();
    return { ok: true };
  }

  /** Simple HTML page to scan the QR with your phone. */
  @Get('link')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async linkPage(@Query('password') password?: string) {
    assertSetupPassword(password);
    const data = await this.baileys.getQrDataUrl(true);
    const status = this.baileys.getStatus();

    if (status.status === 'ready') {
      return `<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"/>
<title>واتساب مرتبط</title>
<body style="font-family:system-ui;background:#0f1419;color:#e8eef6;display:grid;place-items:center;min-height:100vh;margin:0">
  <div style="text-align:center;max-width:28rem;padding:2rem">
    <h1>تم الربط</h1>
    <p>البوت جاهز لإرسال رموز OTP عبر واتساب.</p>
    <p style="opacity:.7;font-size:.9rem">${status.connected_user ?? ''}</p>
  </div>
</body></html>`;
    }

    const img = data.qr_data_url
      ? `<img alt="QR" src="${data.qr_data_url}" style="width:280px;height:280px;background:#fff;padding:12px;border-radius:12px"/>`
      : `<p>جاري تجهيز رمز QR… حدّث الصفحة بعد ثوانٍ.</p>`;

    return `<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"/>
<meta http-equiv="refresh" content="8"/>
<title>ربط واتساب OTP</title>
<body style="font-family:system-ui;background:#0f1419;color:#e8eef6;display:grid;place-items:center;min-height:100vh;margin:0">
  <div style="text-align:center;max-width:28rem;padding:2rem">
    <h1>امسح الرمز بهاتفك</h1>
    <p>واتساب → الإعدادات → الأجهزة المرتبطة → ربط جهاز</p>
    <div style="margin:1.5rem 0">${img}</div>
    <p style="opacity:.75;font-size:.85rem">الحالة: ${data.status} — ${data.detail}</p>
    <p style="opacity:.55;font-size:.8rem;margin-top:1.5rem">تحذير: طريقة غير رسمية. قد تحظر واتساب الرقم. استخدم رقماً احتياطياً إن أمكن.</p>
  </div>
</body></html>`;
  }
}

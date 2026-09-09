import { Injectable, type OnModuleInit } from '@nestjs/common';
import { normalizePhone } from '@omsp/shared';
import { TwilioSmsClient } from './twilio-sms.client';
import { WhatsAppBaileysClient } from './whatsapp-baileys.client';
import { WhatsAppCloudClient } from './whatsapp-cloud.client';

/** Production default: `baileys` (WhatsApp QR bot). Also: twilio | whatsapp | mock. */
export type OtpProviderName = 'mock' | 'baileys' | 'twilio' | 'whatsapp';
export type SmsProviderName = OtpProviderName;
export type SmsOtpPurpose = 'login' | 'device_pairing';

@Injectable()
export class SmsService implements OnModuleInit {
  constructor(
    private readonly twilio: TwilioSmsClient,
    private readonly whatsapp: WhatsAppCloudClient,
    private readonly baileys: WhatsAppBaileysClient,
  ) {}

  onModuleInit(): void {
    const provider = this.getProvider();
    if (process.env.NODE_ENV === 'production' && provider === 'mock') {
      console.warn(
        '[otp] production is using mock OTP. Set SMS_PROVIDER=baileys (QR WhatsApp bot) or twilio.',
      );
    }
    if (provider === 'twilio' && !this.twilio.isConfigured()) {
      console.warn(
        '[otp] SMS_PROVIDER=twilio but Twilio env vars are incomplete.',
      );
    }
    if (provider === 'baileys') {
      console.log(
        '[otp] using WhatsApp QR bot (Baileys). Link at GET /api/v1/otp-bot/link?password=...',
      );
    }
    logWhatsAppCloudConfigSanity(provider);
  }

  getProvider(): OtpProviderName {
    const raw = (process.env.SMS_PROVIDER ?? process.env.OTP_PROVIDER ?? 'mock')
      .toLowerCase()
      .trim();
    if (raw === 'baileys' || raw === 'whatsapp-qr' || raw === 'qr') return 'baileys';
    if (raw === 'twilio' || raw === 'sms') return 'twilio';
    if (raw === 'whatsapp' || raw === 'whatsapp-cloud') return 'whatsapp';
    if (raw === 'mock' || !raw) return 'mock';
    console.warn(`[otp] unsupported provider "${raw}". Use mock | baileys | twilio | whatsapp`);
    return 'mock';
  }

  isMock(): boolean {
    return this.getProvider() === 'mock';
  }

  shouldExposeDevCode(): boolean {
    if (process.env.NODE_ENV === 'production') {
      return process.env.OTP_DEV_EXPOSE === 'true';
    }
    return this.isMock() || process.env.OTP_DEV_EXPOSE === 'true';
  }

  otpSentMessage(purpose: SmsOtpPurpose): string {
    const provider = this.getProvider();
    if (provider === 'whatsapp' || provider === 'baileys') {
      return purpose === 'device_pairing'
        ? 'تم إرسال رمز التأكيد عبر واتساب إلى رقم هاتف المكتبة المسجّل'
        : 'تم إرسال رمز التحقق عبر واتساب';
    }
    if (provider === 'twilio') {
      return purpose === 'device_pairing'
        ? 'تم إرسال رمز التأكيد عبر رسالة نصية إلى رقم هاتف المكتبة المسجّل'
        : 'تم إرسال رمز التحقق عبر رسالة نصية';
    }
    return purpose === 'device_pairing'
      ? 'تم إنشاء رمز التأكيد (وضع التطوير — راجع سجل الخادم)'
      : 'تم إنشاء رمز التحقق (وضع التطوير — راجع سجل الخادم)';
  }

  async sendOtp(phone: string, code: string, purpose: SmsOtpPurpose): Promise<void> {
    const text =
      purpose === 'device_pairing'
        ? `رمز ربط جهاز المكتبة: ${code} (صالح 5 دقائق)`
        : `رمز الدخول لطباعة: ${code} (صالح 5 دقائق)`;

    const provider = this.getProvider();

    if (provider === 'mock') {
      console.log(`[otp mock] To ${phone}: ${text}`);
      return;
    }

    if (provider === 'baileys') {
      const id = await this.baileys.sendText(phone, text);
      console.log(`[baileys] OTP sent purpose=${purpose} to ${phone} id=${id ?? 'n/a'}`);
      return;
    }

    if (provider === 'twilio') {
      const sid = await this.twilio.sendSms(phone, text);
      console.log(`[twilio] OTP sent purpose=${purpose} to ${phone} sid=${sid ?? 'n/a'}`);
      return;
    }

    const messageId = await this.whatsapp.sendAuthenticationOtp(phone, code);
    console.log(`[whatsapp] OTP sent purpose=${purpose} to ${phone} id=${messageId ?? 'n/a'}`);
  }

  async sendOrderReady(
    phone: string,
    orderNumber: string,
    storeName: string,
  ): Promise<{ ok: boolean; skipped?: boolean; providerMessageId?: string }> {
    const text = `طلبك ${orderNumber} جاهز للاستلام — ${storeName}`;
    const provider = this.getProvider();

    if (provider === 'mock') {
      console.log(`[otp mock] To ${phone}: ${text}`);
      return { ok: true };
    }

    if (provider === 'baileys') {
      const id = await this.baileys.sendText(phone, text);
      return { ok: true, providerMessageId: id };
    }

    if (provider === 'twilio') {
      const sid = await this.twilio.sendSms(phone, text);
      return { ok: true, providerMessageId: sid };
    }

    if (!this.whatsapp.hasOrderReadyTemplate()) {
      return { ok: false, skipped: true };
    }

    const providerMessageId = await this.whatsapp.sendOrderReady(phone, orderNumber, storeName);
    return { ok: true, providerMessageId };
  }
}

function logWhatsAppCloudConfigSanity(provider: OtpProviderName): void {
  if (provider !== 'whatsapp') return;
  if (!process.env.WHATSAPP_PHONE_NUMBER_ID?.trim()) {
    console.warn('[whatsapp] WHATSAPP_PHONE_NUMBER_ID is empty.');
  }
  if (!process.env.WHATSAPP_TOKEN?.trim()) {
    console.warn('[whatsapp] WHATSAPP_TOKEN is empty.');
  }
  const businessRaw = process.env.WHATSAPP_BUSINESS_NUMBER?.trim();
  if (businessRaw && !normalizePhone(businessRaw)) {
    console.warn('[whatsapp] WHATSAPP_BUSINESS_NUMBER is invalid.');
  }
}

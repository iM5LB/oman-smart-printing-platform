import { Injectable, type OnModuleInit } from '@nestjs/common';
import { normalizePhone } from '@omsp/shared';
import { TwilioSmsClient } from './twilio-sms.client';
import { WhatsAppCloudClient } from './whatsapp-cloud.client';

/** Production: `twilio` (SMS). Optional: `whatsapp` (Meta). Local: `mock`. */
export type OtpProviderName = 'mock' | 'twilio' | 'whatsapp';
export type SmsProviderName = OtpProviderName;
export type SmsOtpPurpose = 'login' | 'device_pairing';

@Injectable()
export class SmsService implements OnModuleInit {
  constructor(
    private readonly twilio: TwilioSmsClient,
    private readonly whatsapp: WhatsAppCloudClient,
  ) {}

  onModuleInit(): void {
    const provider = this.getProvider();
    if (process.env.NODE_ENV === 'production' && provider === 'mock') {
      console.warn(
        '[otp] production is using mock OTP. Set SMS_PROVIDER=twilio (recommended) or whatsapp.',
      );
    }
    if (provider === 'twilio' && !this.twilio.isConfigured()) {
      console.warn(
        '[otp] SMS_PROVIDER=twilio but Twilio env vars are incomplete (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER).',
      );
    }
    logWhatsAppConfigSanity(provider);
  }

  getProvider(): OtpProviderName {
    const raw = (process.env.SMS_PROVIDER ?? process.env.OTP_PROVIDER ?? 'mock')
      .toLowerCase()
      .trim();
    if (raw === 'twilio' || raw === 'sms') return 'twilio';
    if (raw === 'whatsapp') return 'whatsapp';
    if (raw === 'mock' || !raw) return 'mock';
    console.warn(`[otp] unsupported provider "${raw}". Use mock | twilio | whatsapp`);
    return 'mock';
  }

  isMock(): boolean {
    return this.getProvider() === 'mock';
  }

  /** Mock always returns `dev_code` in non-production. Production never leaks unless OTP_DEV_EXPOSE=true. */
  shouldExposeDevCode(): boolean {
    if (process.env.NODE_ENV === 'production') {
      return process.env.OTP_DEV_EXPOSE === 'true';
    }
    return this.isMock() || process.env.OTP_DEV_EXPOSE === 'true';
  }

  otpSentMessage(purpose: SmsOtpPurpose): string {
    const provider = this.getProvider();
    if (provider === 'whatsapp') {
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

  /** Recipient is the customer or library confirm phone. Never rewrite to the business sender line. */
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

    if (provider === 'twilio') {
      const sid = await this.twilio.sendSms(phone, text);
      console.log(`[twilio] order-ready sent to ${phone} sid=${sid ?? 'n/a'}`);
      return { ok: true, providerMessageId: sid };
    }

    if (!this.whatsapp.hasOrderReadyTemplate()) {
      console.warn(
        '[whatsapp] order-ready skipped: set WHATSAPP_ORDER_READY_TEMPLATE_NAME to enable',
      );
      return { ok: false, skipped: true };
    }

    const providerMessageId = await this.whatsapp.sendOrderReady(phone, orderNumber, storeName);
    console.log(`[whatsapp] order-ready sent to ${phone} id=${providerMessageId ?? 'n/a'}`);
    return { ok: true, providerMessageId };
  }
}

function logWhatsAppConfigSanity(provider: OtpProviderName): void {
  if (provider !== 'whatsapp') return;

  const businessRaw = process.env.WHATSAPP_BUSINESS_NUMBER?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const token = process.env.WHATSAPP_TOKEN?.trim();

  if (businessRaw) {
    const normalized = normalizePhone(businessRaw);
    if (!normalized) {
      console.warn(
        '[whatsapp] WHATSAPP_BUSINESS_NUMBER is set but is not a valid phone (use E.164, e.g. +96876655365)',
      );
    } else {
      console.log(
        `[whatsapp] sender line ${maskPhone(normalized)} must be registered in Meta WhatsApp Manager.`,
      );
    }
  }

  if (!phoneNumberId) {
    console.warn(
      '[whatsapp] SMS_PROVIDER=whatsapp but WHATSAPP_PHONE_NUMBER_ID is empty.',
    );
  }
  if (!token) {
    console.warn('[whatsapp] SMS_PROVIDER=whatsapp but WHATSAPP_TOKEN is empty.');
  }
}

function maskPhone(e164: string): string {
  if (e164.length < 6) return e164;
  return `${e164.slice(0, 4)}****${e164.slice(-2)}`;
}

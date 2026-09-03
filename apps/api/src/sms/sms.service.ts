import { Injectable, type OnModuleInit } from '@nestjs/common';
import { normalizePhone } from '@omsp/shared';
import { WhatsAppCloudClient } from './whatsapp-cloud.client';

/** OTP channel: Meta WhatsApp Cloud API only (no SMS gateway). `mock` is local/dev. */
export type OtpProviderName = 'mock' | 'whatsapp';
export type SmsProviderName = OtpProviderName;
export type SmsOtpPurpose = 'login' | 'device_pairing';

@Injectable()
export class SmsService implements OnModuleInit {
  constructor(private readonly whatsapp: WhatsAppCloudClient) {}

  onModuleInit(): void {
    const provider = this.getProvider();
    if (process.env.NODE_ENV === 'production' && provider !== 'whatsapp') {
      console.warn(
        '[otp] production OTP should use Meta WhatsApp Cloud API (SMS_PROVIDER=whatsapp). SMS is not supported.',
      );
    }
    logWhatsAppConfigSanity(provider);
  }

  getProvider(): OtpProviderName {
    const raw = (process.env.SMS_PROVIDER ?? process.env.OTP_PROVIDER ?? 'mock').toLowerCase().trim();
    if (raw === 'whatsapp') return 'whatsapp';
    if (raw === 'mock' || !raw) return 'mock';
    console.warn(`[otp] unsupported provider "${raw}" (SMS not supported). Use mock | whatsapp`);
    return 'mock';
  }

  isMock(): boolean {
    return this.getProvider() === 'mock';
  }

  /** Mock always returns `dev_code`. Real WhatsApp only when OTP_DEV_EXPOSE or non-production. */
  shouldExposeDevCode(): boolean {
    return (
      this.isMock() ||
      process.env.OTP_DEV_EXPOSE === 'true' ||
      process.env.NODE_ENV !== 'production'
    );
  }

  otpSentMessage(purpose: SmsOtpPurpose): string {
    if (this.getProvider() === 'whatsapp') {
      return purpose === 'device_pairing'
        ? 'تم إرسال رمز التأكيد عبر واتساب إلى رقم هاتف المكتبة المسجّل'
        : 'تم إرسال رمز التحقق عبر واتساب';
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

    if (this.isMock()) {
      console.log(`[otp mock] To ${phone}: ${text}`);
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

    if (this.isMock()) {
      console.log(`[otp mock] To ${phone}: ${text}`);
      return { ok: true };
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
  const businessRaw = process.env.WHATSAPP_BUSINESS_NUMBER?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const token = process.env.WHATSAPP_TOKEN?.trim();

  if (businessRaw) {
    const normalized = normalizePhone(businessRaw);
    if (!normalized) {
      console.warn(
        '[whatsapp] WHATSAPP_BUSINESS_NUMBER is set but is not a valid phone (use E.164, e.g. +96876655365)',
      );
    } else if (provider === 'whatsapp') {
      const hint = maskPhone(normalized);
      console.log(
        `[whatsapp] sender line ${hint} must be registered in Meta WhatsApp Manager. Customer OTPs still go to each customer’s phone.`,
      );
    }
  }

  if (provider !== 'whatsapp') return;

  if (!phoneNumberId) {
    console.warn(
      '[whatsapp] SMS_PROVIDER=whatsapp but WHATSAPP_PHONE_NUMBER_ID is empty. After adding +96876655365 in WhatsApp Manager, copy Phone number ID (not the MSISDN) into WHATSAPP_PHONE_NUMBER_ID.',
    );
  } else if (normalizePhone(phoneNumberId)) {
    console.warn(
      '[whatsapp] WHATSAPP_PHONE_NUMBER_ID looks like a phone number. Paste Meta’s Phone number ID from WhatsApp → API Setup, not +968…',
    );
  }

  if (!token) {
    console.warn(
      '[whatsapp] WHATSAPP_TOKEN is empty. Use a permanent system user token from Meta Business Settings.',
    );
  }
}

function maskPhone(phone: string): string {
  if (phone.length < 6) return '****';
  return `${phone.slice(0, 4)}****${phone.slice(-2)}`;
}

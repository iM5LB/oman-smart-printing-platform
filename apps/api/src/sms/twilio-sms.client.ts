import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { formatPhoneForWhatsApp, normalizePhone } from '@omsp/shared';

/**
 * Twilio Programmable Messaging (SMS) for production OTP.
 * Docs: https://www.twilio.com/docs/sms/api/message-resource
 */
@Injectable()
export class TwilioSmsClient {
  isConfigured(): boolean {
    return Boolean(
      process.env.TWILIO_ACCOUNT_SID?.trim() &&
        process.env.TWILIO_AUTH_TOKEN?.trim() &&
        process.env.TWILIO_FROM_NUMBER?.trim(),
    );
  }

  async sendSms(toPhone: string, body: string): Promise<string | undefined> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
    const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
    const from = process.env.TWILIO_FROM_NUMBER?.trim();

    if (!accountSid || !authToken || !from) {
      console.error('[twilio] SMS credentials are incomplete');
      throw new ServiceUnavailableException(
        'تعذر إرسال رمز التحقق حالياً. حاول لاحقاً.',
      );
    }

    const normalized = normalizePhone(toPhone);
    if (!normalized) {
      throw new ServiceUnavailableException('رقم الهاتف غير صالح لإرسال الرسالة');
    }

    // Twilio accepts E.164 with +
    const to = `+${formatPhoneForWhatsApp(normalized)}`;
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
    });

    const data = (await res.json().catch(() => ({}))) as {
      sid?: string;
      message?: string;
      error_message?: string;
      code?: number;
    };

    if (!res.ok) {
      console.error('[twilio] send failed:', {
        status: res.status,
        code: data.code,
        message: data.error_message || data.message,
      });
      throw new ServiceUnavailableException(
        'تعذر إرسال الرسالة النصية. تحقق من الرقم وحاول مجدداً.',
      );
    }

    return data.sid;
  }
}

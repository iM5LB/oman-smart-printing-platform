import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { formatPhoneForWhatsApp } from '@omsp/shared';

const GRAPH_VERSION_DEFAULT = 'v21.0';
const REQUEST_TIMEOUT_MS = 20_000;

interface GraphError {
  message?: string;
  type?: string;
  code?: number;
  error_subcode?: number;
  error_user_msg?: string;
  error_user_title?: string;
  fbtrace_id?: string;
}

interface GraphResponse {
  error?: GraphError;
  messages?: Array<{ id?: string }>;
}

interface TemplateComponent {
  type: 'body' | 'button';
  sub_type?: 'url';
  index?: string;
  parameters: Array<{ type: 'text'; text: string }>;
}

@Injectable()
export class WhatsAppCloudClient {
  async sendAuthenticationOtp(phone: string, code: string): Promise<string | undefined> {
    const templateName = process.env.WHATSAPP_OTP_TEMPLATE_NAME?.trim();
    if (!templateName) {
      throw new BadRequestException(
        'تعذر إرسال واتساب: اسم قالب رمز التحقق غير معيّن (WHATSAPP_OTP_TEMPLATE_NAME)',
      );
    }

    const components: TemplateComponent[] = [
      {
        type: 'body',
        parameters: [{ type: 'text', text: code }],
      },
    ];

    // AUTHENTICATION copy-code templates require the OTP in the body and the URL button.
    if (process.env.WHATSAPP_OTP_SKIP_COPY_BUTTON !== 'true') {
      components.push({
        type: 'button',
        sub_type: 'url',
        index: '0',
        parameters: [{ type: 'text', text: code }],
      });
    }

    return this.sendTemplate({
      to: toWhatsAppRecipient(phone),
      name: templateName,
      language: otpTemplateLanguage(),
      components,
    });
  }

  async sendOrderReady(
    phone: string,
    orderNumber: string,
    storeName: string,
  ): Promise<string | undefined> {
    const templateName = process.env.WHATSAPP_ORDER_READY_TEMPLATE_NAME?.trim();
    if (!templateName) {
      return undefined;
    }

    return this.sendTemplate({
      to: toWhatsAppRecipient(phone),
      name: templateName,
      language:
        process.env.WHATSAPP_ORDER_READY_TEMPLATE_LANG?.trim() || otpTemplateLanguage(),
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: sanitizeTemplateText(orderNumber) },
            { type: 'text', text: sanitizeTemplateText(storeName) },
          ],
        },
      ],
    });
  }

  hasOrderReadyTemplate(): boolean {
    return Boolean(process.env.WHATSAPP_ORDER_READY_TEMPLATE_NAME?.trim());
  }

  private async sendTemplate(input: {
    to: string;
    name: string;
    language: string;
    components: TemplateComponent[];
  }): Promise<string | undefined> {
    const { token, phoneNumberId } = this.requireConfig();
    const version = process.env.WHATSAPP_GRAPH_API_VERSION?.trim() || GRAPH_VERSION_DEFAULT;
    const url = `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: input.to,
      type: 'template',
      template: {
        name: input.name,
        language: { code: input.language },
        components: input.components,
      },
    };

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (err) {
      console.error('[whatsapp] network error', err);
      throw new ServiceUnavailableException('تعذر الاتصال بخدمة واتساب. حاول لاحقاً');
    }

    let body: GraphResponse = {};
    try {
      body = (await res.json()) as GraphResponse;
    } catch {
      body = {};
    }

    if (!res.ok || body.error) {
      console.error('[whatsapp] Cloud API error', {
        status: res.status,
        to: input.to,
        template: input.name,
        error: body.error,
      });
      throw new ServiceUnavailableException(arabicGraphError(res.status, body.error));
    }

    return body.messages?.[0]?.id;
  }

  private requireConfig(): { token: string; phoneNumberId: string } {
    const token = process.env.WHATSAPP_TOKEN?.trim();
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
    if (!token || !phoneNumberId) {
      throw new BadRequestException(
        'تعذر إرسال واتساب: الإعدادات غير مكتملة (WHATSAPP_TOKEN أو WHATSAPP_PHONE_NUMBER_ID)',
      );
    }
    return { token, phoneNumberId };
  }
}

/** WhatsApp `to` field: E.164 digits without `+` (shared normalize; Oman 7/9 mobiles included). */
export function toWhatsAppRecipient(phone: string): string {
  const digits = formatPhoneForWhatsApp(phone);
  if (!digits) {
    throw new BadRequestException('رقم الهاتف غير صالح لإرسال واتساب');
  }
  return digits;
}

function otpTemplateLanguage(): string {
  return process.env.WHATSAPP_OTP_TEMPLATE_LANG?.trim() || 'ar';
}

function sanitizeTemplateText(value: string): string {
  return value.replace(/[\r\n\t]+/g, ' ').trim().slice(0, 120) || '-';
}

function arabicGraphError(status: number, error?: GraphError): string {
  const code = error?.code;
  const msg = `${error?.error_user_msg ?? ''} ${error?.message ?? ''}`.toLowerCase();

  if (code === 190 || status === 401) {
    return 'تعذر إرسال واتساب: رمز الوصول غير صالح أو منتهٍ. راجع إعدادات المنصة';
  }
  if (code === 132001 || code === 132000 || msg.includes('template')) {
    return 'تعذر إرسال واتساب: قالب الرسالة غير موجود أو غير موافق عليه أو لا يطابق المتغيرات';
  }
  if (code === 131026 || code === 131047 || code === 131048) {
    return 'تعذر إرسال واتساب إلى هذا الرقم. تأكد أن واتساب مفعّل على الهاتف';
  }
  if (code === 100 || status === 400) {
    return 'تعذر إرسال واتساب: بيانات القالب أو الرقم غير صحيحة';
  }
  return 'تعذر إرسال رمز التحقق عبر واتساب. حاول لاحقاً';
}

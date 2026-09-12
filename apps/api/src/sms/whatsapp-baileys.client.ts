import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { formatPhoneForWhatsApp, normalizePhone } from '@omsp/shared';
import * as QRCodeImport from 'qrcode';

/** CJS/ESM interop — `import QRCode from 'qrcode'` is undefined under Nest CommonJS on Render. */
const QRCode = (QRCodeImport as { default?: typeof QRCodeImport }).default ?? QRCodeImport;

type AnyContent = Record<string, unknown>;

type WaSocket = {
  user?: { id?: string };
  sendMessage: (
    jid: string,
    content: AnyContent,
    options?: AnyContent,
  ) => Promise<{ key?: { id?: string | null } } | undefined>;
  relayMessage: (
    jid: string,
    message: unknown,
    options?: AnyContent,
  ) => Promise<unknown>;
  end: (error?: Error) => void;
  ev: {
    on: (event: string, cb: (...args: unknown[]) => void) => void;
  };
};

export type BaileysInteractiveButton =
  | { type: 'copy'; displayText: string; copyCode: string; id?: string }
  | { type: 'url'; displayText: string; url: string; id?: string }
  | { type: 'call'; displayText: string; phoneNumber: string; id?: string };

export type OrderReadyMessageInput = {
  orderNumber: string;
  storeName: string;
  storePhone?: string | null;
  storeAddress?: string | null;
  shopUrl?: string | null;
  mapsUrl?: string | null;
};

/**
 * Unofficial WhatsApp Web session (Baileys) — scan QR once, then send chats.
 * Risk: against WhatsApp ToS; number may be banned. Prefer a spare phone number.
 */
@Injectable()
export class WhatsAppBaileysClient implements OnModuleInit, OnModuleDestroy {
  private sock: WaSocket | null = null;
  private starting: Promise<void> | null = null;
  private latestQr: string | null = null;
  private latestQrDataUrl: string | null = null;
  private status: 'disconnected' | 'qr' | 'connecting' | 'ready' = 'disconnected';
  private statusDetail = 'لم يبدأ بعد';
  private connectedUser: string | null = null;

  onModuleInit(): void {
    const provider = (process.env.SMS_PROVIDER ?? '').toLowerCase().trim();
    if (provider === 'baileys' || provider === 'whatsapp-qr' || provider === 'qr') {
      void this.ensureStarted().catch((err) => {
        console.error('[baileys] auto-start failed:', err);
      });
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      this.sock?.end(undefined);
    } catch {
      /* ignore */
    }
    this.sock = null;
  }

  getStatus() {
    return {
      provider: 'baileys',
      status: this.status,
      detail: this.statusDetail,
      connected_user: this.connectedUser,
      has_qr: Boolean(this.latestQr),
      warning:
        'يفضّل استخدام رقم واتساب احتياطي. أعد الربط من الإعدادات إذا انقطع الاتصال.',
    };
  }

  async getQrDataUrl(forceRefresh = false): Promise<{
    status: string;
    qr_data_url: string | null;
    detail: string;
  }> {
    await this.ensureStarted();
    if (this.status === 'ready') {
      return {
        status: this.status,
        qr_data_url: null,
        detail: 'واتساب مرتبط وجاهز',
      };
    }
    if (forceRefresh && this.status !== 'qr') {
      await this.restart();
    }
    for (let i = 0; i < 20 && !this.latestQrDataUrl; i++) {
      await new Promise((r) => setTimeout(r, 250));
    }
    return {
      status: this.status,
      qr_data_url: this.latestQrDataUrl,
      detail: this.statusDetail,
    };
  }

  async logout(): Promise<void> {
    try {
      this.sock?.end(undefined);
    } catch {
      /* ignore */
    }
    this.sock = null;
    this.latestQr = null;
    this.latestQrDataUrl = null;
    this.status = 'disconnected';
    this.statusDetail = 'تم قطع الربط — امسح رمز QR مجدداً';
    this.connectedUser = null;
    await this.ensureStarted();
  }

  isReady(): boolean {
    return this.status === 'ready' && Boolean(this.sock);
  }

  async sendText(toPhone: string, text: string): Promise<string | undefined> {
    const sock = await this.requireSock();
    const jid = this.toJid(toPhone);
    try {
      const result = await sock.sendMessage(jid, { text });
      return result?.key?.id ?? undefined;
    } catch (err) {
      console.error('[baileys] send failed:', err);
      throw new ServiceUnavailableException(
        'تعذر إرسال رسالة واتساب. حاول مجدداً بعد قليل.',
      );
    }
  }

  /** OTP with copy button when WhatsApp accepts interactive payload; else clean text. */
  async sendOtp(
    toPhone: string,
    code: string,
    purpose: 'login' | 'device_pairing',
  ): Promise<string | undefined> {
    const title =
      purpose === 'device_pairing' ? 'رمز ربط الجهاز' : 'رمز التحقق';
    const body = [
      `*طباعة* — ${title}`,
      '',
      `*${code}*`,
      '',
      'صالح لمدة 5 دقائق.',
      'لا تشارك الرمز مع أحد.',
    ].join('\n');

    return this.sendInteractiveOrText(toPhone, {
      title,
      body,
      footer: 'طباعة · OMSP',
      buttons: [
        {
          type: 'copy',
          displayText: 'نسخ الرمز',
          copyCode: code,
          id: 'copy_otp',
        },
      ],
      textFallback: body,
    });
  }

  /** Order-ready alert with optional maps / shop / call actions. */
  async sendOrderReady(
    toPhone: string,
    input: OrderReadyMessageInput,
  ): Promise<string | undefined> {
    const orderLabel = input.orderNumber.startsWith('#')
      ? input.orderNumber
      : `#${input.orderNumber}`;

    const lines = [
      '*طلبك جاهز للاستلام*',
      '',
      `الطلب: *${orderLabel}*`,
      `المكتبة: *${input.storeName}*`,
    ];
    if (input.storeAddress?.trim()) {
      lines.push(`العنوان: ${input.storeAddress.trim()}`);
    }
    lines.push('', 'تفضل بالاستلام من المكتبة.');

    const body = lines.join('\n');
    const buttons: BaileysInteractiveButton[] = [];

    if (input.mapsUrl) {
      buttons.push({
        type: 'url',
        displayText: 'الموقع على الخريطة',
        url: input.mapsUrl,
        id: 'maps',
      });
    }
    if (input.shopUrl) {
      buttons.push({
        type: 'url',
        displayText: 'صفحة المكتبة',
        url: input.shopUrl,
        id: 'shop',
      });
    }
    if (input.storePhone) {
      const digits = formatPhoneForWhatsApp(
        normalizePhone(input.storePhone) ?? input.storePhone,
      );
      if (digits) {
        buttons.push({
          type: 'call',
          displayText: 'اتصال بالمكتبة',
          phoneNumber: `+${digits}`,
          id: 'call_store',
        });
      }
    }

    const fallbackExtra = [
      input.mapsUrl ? `الخريطة: ${input.mapsUrl}` : null,
      input.shopUrl ? `المكتبة: ${input.shopUrl}` : null,
      input.storePhone ? `هاتف: ${input.storePhone}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    return this.sendInteractiveOrText(toPhone, {
      title: 'طلب جاهز',
      body,
      footer: input.storeName,
      buttons,
      textFallback: fallbackExtra ? `${body}\n\n${fallbackExtra}` : body,
    });
  }

  private async sendInteractiveOrText(
    toPhone: string,
    opts: {
      title: string;
      body: string;
      footer?: string;
      buttons: BaileysInteractiveButton[];
      textFallback: string;
    },
  ): Promise<string | undefined> {
    if (opts.buttons.length === 0) {
      return this.sendText(toPhone, opts.textFallback);
    }

    try {
      const id = await this.sendNativeFlow(toPhone, opts);
      if (id) return id;
    } catch (err) {
      console.warn(
        '[baileys] interactive send failed — falling back to text:',
        err instanceof Error ? err.message : err,
      );
    }

    return this.sendText(toPhone, opts.textFallback);
  }

  private async sendNativeFlow(
    toPhone: string,
    opts: {
      title: string;
      body: string;
      footer?: string;
      buttons: BaileysInteractiveButton[];
    },
  ): Promise<string | undefined> {
    const sock = await this.requireSock();
    const jid = this.toJid(toPhone);
    const baileys = await import('@whiskeysockets/baileys');
    const { generateWAMessageFromContent, proto, generateMessageID } = baileys;

    const Interactive = proto.Message.InteractiveMessage;
    const buttons = opts.buttons.slice(0, 3).map((btn) => {
      if (btn.type === 'copy') {
        return {
          name: 'cta_copy',
          buttonParamsJson: JSON.stringify({
            display_text: btn.displayText,
            id: btn.id ?? 'copy',
            copy_code: btn.copyCode,
          }),
        };
      }
      if (btn.type === 'url') {
        return {
          name: 'cta_url',
          buttonParamsJson: JSON.stringify({
            display_text: btn.displayText,
            id: btn.id ?? 'url',
            url: btn.url,
            merchant_url: btn.url,
          }),
        };
      }
      return {
        name: 'cta_call',
        buttonParamsJson: JSON.stringify({
          display_text: btn.displayText,
          id: btn.id ?? 'call',
          phone_number: btn.phoneNumber,
        }),
      };
    });

    const interactiveMessage = Interactive.create({
      body: Interactive.Body.create({ text: opts.body }),
      footer: opts.footer
        ? Interactive.Footer.create({ text: opts.footer })
        : undefined,
      header: Interactive.Header.create({
        title: opts.title,
        subtitle: 'طباعة',
        hasMediaAttachment: false,
      }),
      nativeFlowMessage: Interactive.NativeFlowMessage.create({
        buttons,
      }),
    });

    const msg = generateWAMessageFromContent(
      jid,
      {
        viewOnceMessage: {
          message: {
            messageContextInfo: {
              deviceListMetadata: {},
              deviceListMetadataVersion: 2,
            },
            interactiveMessage,
          },
        },
      },
      { userJid: sock.user?.id ?? jid },
    );

    const messageId = msg.key?.id || generateMessageID();
    await sock.relayMessage(jid, msg.message, {
      messageId,
      additionalNodes: [
        {
          tag: 'biz',
          attrs: {},
          content: [
            {
              tag: 'interactive',
              attrs: { type: 'native_flow', v: '1' },
              content: [
                {
                  tag: 'native_flow',
                  attrs: { v: '9', name: 'mixed' },
                },
              ],
            },
          ],
        },
        { tag: 'bot', attrs: { biz_bot: '1' } },
      ],
    });

    return messageId;
  }

  private async requireSock(): Promise<WaSocket> {
    await this.ensureStarted();
    if (!this.sock || this.status !== 'ready') {
      throw new ServiceUnavailableException(
        'تعذر إرسال رسالة واتساب حالياً. حاول بعد قليل أو تواصل مع الدعم.',
      );
    }
    return this.sock;
  }

  private toJid(toPhone: string): string {
    const normalized = normalizePhone(toPhone);
    if (!normalized) {
      throw new ServiceUnavailableException('رقم الهاتف غير صالح لإرسال واتساب');
    }
    return `${formatPhoneForWhatsApp(normalized)}@s.whatsapp.net`;
  }

  private sessionPath(): string {
    const custom = process.env.WHATSAPP_SESSION_PATH?.trim();
    if (custom) return custom;
    const storage = process.env.STORAGE_LOCAL_PATH?.trim();
    if (storage) return join(storage, '..', 'whatsapp-session');
    return join(process.cwd(), '.data', 'whatsapp-session');
  }

  private async ensureStarted(): Promise<void> {
    if (this.sock && (this.status === 'ready' || this.status === 'qr' || this.status === 'connecting')) {
      return;
    }
    if (this.starting) {
      await this.starting;
      return;
    }
    this.starting = this.startSocket().finally(() => {
      this.starting = null;
    });
    await this.starting;
  }

  private async restart(): Promise<void> {
    try {
      this.sock?.end(undefined);
    } catch {
      /* ignore */
    }
    this.sock = null;
    this.latestQr = null;
    this.latestQrDataUrl = null;
    this.status = 'disconnected';
    await this.ensureStarted();
  }

  private async startSocket(): Promise<void> {
    const baileys = await import('@whiskeysockets/baileys');
    const makeWASocket = baileys.default;
    const { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = baileys;

    const authDir = this.sessionPath();
    mkdirSync(authDir, { recursive: true });
    const { state, saveCreds } = await useMultiFileAuthState(authDir);

    let version: [number, number, number] | undefined;
    try {
      const latest = await fetchLatestBaileysVersion();
      version = latest.version;
    } catch {
      version = undefined;
    }

    this.status = 'connecting';
    this.statusDetail = 'جاري الاتصال بواتساب…';

    const sock = makeWASocket({
      auth: state,
      version,
      printQRInTerminal: false,
      syncFullHistory: false,
      markOnlineOnConnect: false,
    }) as unknown as WaSocket;

    this.sock = sock;

    sock.ev.on('creds.update', (...args: unknown[]) => {
      void (saveCreds as (...a: unknown[]) => unknown)(...args);
    });

    sock.ev.on('connection.update', (...args: unknown[]) => {
      const update = (args[0] ?? {}) as {
        connection?: string;
        lastDisconnect?: { error?: { output?: { statusCode?: number }; message?: string } };
        qr?: string;
      };

      if (update.qr) {
        this.latestQr = update.qr;
        this.status = 'qr';
        this.statusDetail = 'امسح رمز QR من واتساب ← الأجهزة المرتبطة';
        void Promise.resolve()
          .then(() => QRCode.toDataURL(update.qr!, { width: 280, margin: 2 }))
          .then((url) => {
            this.latestQrDataUrl = url;
          })
          .catch((err) => {
            console.error('[baileys] QR image encode failed:', err);
            this.latestQrDataUrl = null;
          });
        console.log('[baileys] QR ready — open /api/v1/otp-bot/link to scan');
      }

      if (update.connection === 'open') {
        this.status = 'ready';
        this.statusDetail = 'واتساب مرتبط';
        this.latestQr = null;
        this.latestQrDataUrl = null;
        this.connectedUser = sock.user?.id ?? null;
        console.log('[baileys] connected', this.connectedUser ?? '');
      }

      if (update.connection === 'close') {
        const code = update.lastDisconnect?.error?.output?.statusCode;
        const loggedOut = code === DisconnectReason.loggedOut;
        this.status = 'disconnected';
        this.statusDetail = loggedOut
          ? 'تم تسجيل الخروج — امسح رمز QR مجدداً'
          : 'انقطع الاتصال — جاري إعادة المحاولة…';
        this.sock = null;
        this.connectedUser = null;

        if (!loggedOut) {
          setTimeout(() => {
            void this.ensureStarted().catch((err) =>
              console.error('[baileys] reconnect failed:', err),
            );
          }, 2000);
        }
      }
    });
  }
}

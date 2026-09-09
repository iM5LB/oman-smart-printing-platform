import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { formatPhoneForWhatsApp, normalizePhone } from '@omsp/shared';
import QRCode from 'qrcode';

type WaSocket = {
  sendMessage: (
    jid: string,
    content: { text: string },
  ) => Promise<{ key?: { id?: string | null } } | undefined>;
  end: (error?: Error) => void;
  ev: {
    on: (event: string, cb: (...args: unknown[]) => void) => void;
  };
};

/**
 * Unofficial WhatsApp Web session (Baileys) — scan QR once, then send OTP as normal chats.
 * Risk: against WhatsApp ToS; number may be banned. Prefer a spare phone number.
 */
@Injectable()
export class WhatsAppBaileysClient implements OnModuleInit, OnModuleDestroy {
  private sock: WaSocket | null = null;
  private starting: Promise<void> | null = null;
  private latestQr: string | null = null;
  private latestQrDataUrl: string | null = null;
  private status: 'disconnected' | 'qr' | 'connecting' | 'ready' = 'disconnected';
  private statusDetail = 'not started';
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
      session_path: this.sessionPath(),
      warning:
        'Unofficial WhatsApp Web bot. Account ban risk. Use a spare number. Persist WHATSAPP_SESSION_PATH across deploys.',
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
        detail: 'already linked',
      };
    }
    if (forceRefresh && this.status !== 'qr') {
      await this.restart();
    }
    // Wait briefly for QR if still connecting
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
    this.statusDetail = 'logged out — call QR link again';
    this.connectedUser = null;
    await this.ensureStarted();
  }

  isReady(): boolean {
    return this.status === 'ready' && Boolean(this.sock);
  }

  async sendText(toPhone: string, text: string): Promise<string | undefined> {
    await this.ensureStarted();
    if (!this.sock || this.status !== 'ready') {
      throw new ServiceUnavailableException(
        'واتساب غير مرتبط. افتح صفحة ربط QR وامسح الرمز من هاتفك.',
      );
    }

    const normalized = normalizePhone(toPhone);
    if (!normalized) {
      throw new ServiceUnavailableException('رقم الهاتف غير صالح');
    }
    const digits = formatPhoneForWhatsApp(normalized);
    const jid = `${digits}@s.whatsapp.net`;

    try {
      const result = await this.sock.sendMessage(jid, { text });
      return result?.key?.id ?? undefined;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[baileys] send failed:', msg);
      throw new ServiceUnavailableException(`تعذر إرسال واتساب: ${msg}`);
    }
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
    this.statusDetail = 'starting WhatsApp Web session';

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
        this.statusDetail = 'scan QR with WhatsApp → Linked devices';
        void QRCode.toDataURL(update.qr, { width: 280, margin: 2 }).then((url) => {
          this.latestQrDataUrl = url;
        });
        console.log('[baileys] QR ready — open /api/v1/otp-bot/link to scan');
      }

      if (update.connection === 'open') {
        this.status = 'ready';
        this.statusDetail = 'connected';
        this.latestQr = null;
        this.latestQrDataUrl = null;
        const user = (sock as unknown as { user?: { id?: string } }).user?.id ?? null;
        this.connectedUser = user;
        console.log('[baileys] connected', user ?? '');
      }

      if (update.connection === 'close') {
        const code = update.lastDisconnect?.error?.output?.statusCode;
        const loggedOut = code === DisconnectReason.loggedOut;
        this.status = 'disconnected';
        this.statusDetail = loggedOut
          ? 'logged out — scan QR again'
          : `disconnected (${code ?? 'unknown'}) — reconnecting`;
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

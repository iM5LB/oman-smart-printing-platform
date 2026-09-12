import { Inject, Injectable } from '@nestjs/common';
import { PrismaClient } from '@omsp/database';
import { PRISMA } from '../prisma/prisma.module';
import { SmsService } from '../sms/sms.service';

function customerWebBase(): string {
  return (
    process.env.PUBLIC_WEB_URL ??
    process.env.CUSTOMER_WEB_URL ??
    'https://omsp-web.onrender.com'
  ).replace(/\/+$/, '');
}

function mapsUrl(lat?: number | null, lng?: number | null): string | null {
  if (lat == null || lng == null) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

function storeAddressLine(store: {
  address?: string | null;
  area?: string | null;
  wilayat?: string | null;
  governorate?: string | null;
}): string | null {
  const parts = [store.address, store.area, store.wilayat, store.governorate]
    .map((p) => p?.trim())
    .filter(Boolean);
  return parts.length ? parts.join('، ') : null;
}

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(PRISMA) private readonly db: PrismaClient,
    private readonly sms: SmsService,
  ) {}

  async sendOrderReadySms(orderId: string): Promise<void> {
    const order = await this.db.order.findUnique({
      where: { id: orderId },
      include: { store: true },
    });
    if (!order?.customerPhone) return;

    const message = `طلبك ${order.displayNumber} جاهز للاستلام — ${order.store.name}`;
    const provider = this.sms.getProvider();
    const channel =
      provider === 'whatsapp' || provider === 'baileys' ? 'whatsapp' : 'sms';

    const shopUrl = order.store.slug
      ? `${customerWebBase()}/${order.store.slug}`
      : null;

    let status: 'sent' | 'failed' = 'sent';
    let providerMessageId: string | undefined;

    try {
      const result = await this.sms.sendOrderReady(
        order.customerPhone,
        order.displayNumber,
        order.store.name,
        {
          storePhone: order.store.phone,
          storeAddress: storeAddressLine(order.store),
          shopUrl,
          mapsUrl: mapsUrl(order.store.latitude, order.store.longitude),
        },
      );
      if (!result.ok) {
        status = 'failed';
      } else {
        providerMessageId = result.providerMessageId;
      }
    } catch (err) {
      status = 'failed';
      console.error('[notifications] order-ready send failed', err);
    }

    await this.db.notification.create({
      data: {
        storeId: order.storeId,
        orderId: order.id,
        channel,
        phone: order.customerPhone,
        message,
        provider,
        providerMessageId,
        status,
        sentAt: status === 'sent' ? new Date() : null,
      },
    });
  }
}

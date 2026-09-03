import { Inject, Injectable } from '@nestjs/common';
import { PrismaClient } from '@omsp/database';
import { PRISMA } from '../prisma/prisma.module';
import { SmsService } from '../sms/sms.service';

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
    const channel = provider === 'whatsapp' ? 'whatsapp' : 'sms';

    let status: 'sent' | 'failed' = 'sent';
    let providerMessageId: string | undefined;

    try {
      const result = await this.sms.sendOrderReady(
        order.customerPhone,
        order.displayNumber,
        order.store.name,
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

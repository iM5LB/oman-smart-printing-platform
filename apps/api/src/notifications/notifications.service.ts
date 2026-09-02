import { Inject, Injectable } from '@nestjs/common';
import { PrismaClient } from '@omsp/database';
import { PRISMA } from '../prisma/prisma.module';

@Injectable()
export class NotificationsService {
  constructor(@Inject(PRISMA) private readonly db: PrismaClient) {}

  async sendOrderReadySms(orderId: string): Promise<void> {
    const order = await this.db.order.findUnique({
      where: { id: orderId },
      include: { store: true },
    });
    if (!order?.customerPhone) return;

    const message = `طلبك ${order.displayNumber} جاهز للاستلام — ${order.store.name}`;

    await this.db.notification.create({
      data: {
        storeId: order.storeId,
        orderId: order.id,
        channel: 'sms',
        phone: order.customerPhone,
        message,
        provider: process.env.SMS_PROVIDER ?? 'mock',
        status: 'sent',
        sentAt: new Date(),
      },
    });

    if (process.env.NODE_ENV === 'development') {
      console.log(`[SMS mock] To ${order.customerPhone}: ${message}`);
    }
  }
}

import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@omsp/database';
import { PRISMA } from '../prisma/prisma.module';
import { PrintingService } from '../printing/printing.service';
import { ShopGateway } from '../websocket/shop.gateway';
@Injectable()
export class PaymentsService {
  constructor(
    @Inject(PRISMA) private readonly db: PrismaClient,
    private readonly printing: PrintingService,
    private readonly shopGateway: ShopGateway,
  ) {}

  async initializeForOrder(orderId: string) {
    const payment = await this.db.payment.findFirst({
      where: { orderId, status: 'pending' },
      include: { order: { include: { store: true } } },
    });
    if (!payment) throw new NotFoundException('الدفع غير موجود');

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const apiUrl = process.env.API_URL ?? 'http://localhost:4000';

    return {
      payment_id: payment.id,
      checkout_url: `${appUrl}/pay/${payment.id}?token=${payment.order.trackingToken}`,
      mock_confirm_url: `${apiUrl}/api/v1/payments/${payment.id}/confirm-mock`,
    };
  }

  async confirmMockPayment(paymentId: string) {
    const payment = await this.db.payment.findUnique({
      where: { id: paymentId },
      include: { order: { include: { store: true } } },
    });
    if (!payment) throw new NotFoundException('الدفع غير موجود');
    if (payment.status === 'completed') {
      return { already_paid: true, order_id: payment.orderId };
    }

    await this.db.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: paymentId },
        data: { status: 'completed', paidAt: new Date(), providerPaymentId: `mock_${Date.now()}` },
      });

      let newStatus = 'paid';
      if (payment.order.store.autoPrintPaidOrders) {
        newStatus = 'queued';
      } else {
        newStatus = 'review_pending';
      }

      await tx.order.update({
        where: { id: payment.orderId },
        data: { paymentStatus: 'completed', status: newStatus as 'paid' | 'queued' | 'review_pending' },
      });

      await tx.auditLog.create({
        data: {
          storeId: payment.order.storeId,
          action: 'payment_completed',
          entityType: 'payment',
          entityId: paymentId,
          metadata: { provider: 'mock' },
        },
      });
    });

    await this.shopGateway.notifyOrderCreated(payment.orderId);

    const updated = await this.db.order.findUnique({ where: { id: payment.orderId } });
    if (updated?.status === 'queued') {
      await this.printing.dispatchOrder(payment.orderId);
    }

    return { success: true, order_id: payment.orderId, status: updated?.status };
  }

  async handleWebhook(provider: string, body: Record<string, unknown>) {
    if (provider === 'mock' && body.payment_id) {
      return this.confirmMockPayment(body.payment_id as string);
    }
    return { received: true };
  }
}

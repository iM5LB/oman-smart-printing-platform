import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { PrismaClient } from '@omsp/database';
import { PRISMA } from '../prisma/prisma.module';
import { StorageService } from '../storage/storage.service';
import { ShopGateway } from '../websocket/shop.gateway';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class PrintingService {
  private readonly logger = new Logger(PrintingService.name);

  constructor(
    @Inject(PRISMA) private readonly db: PrismaClient,
    private readonly storage: StorageService,
    @Inject(forwardRef(() => ShopGateway))
    private readonly shopGateway: ShopGateway,
    private readonly notifications: NotificationsService,
  ) {}

  async dispatchOrder(orderId: string): Promise<void> {
    const order = await this.db.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        store: true,
      },
    });
    if (!order) return;

    const printers = await this.db.printer.findMany({
      where: { storeId: order.storeId, status: 'online' },
    });

    for (const item of order.items) {
      if (!item.originalFileKey) continue;

      const printer = this.selectPrinter(printers, item);
      const idempotencyKey = `${order.id}:${item.id}:1`;

      const existing = await this.db.printJob.findUnique({ where: { idempotencyKey } });
      if (existing) continue;

      const printJob = await this.db.printJob.create({
        data: {
          orderId: order.id,
          orderItemId: item.id,
          printerId: printer?.id ?? null,
          deviceId: printer?.deviceId ?? null,
          status: 'queued',
          priority: order.store.paidOrdersPriority,
          idempotencyKey,
          settings: {
            copies: item.copies,
            color_mode: item.colorMode,
            paper_size: item.paperSize,
            sides: item.sides,
            orientation: item.orientation,
            page_range: item.pageRange,
          },
        },
      });

      const apiUrl = process.env.API_URL ?? 'http://localhost:4000';
      const documentUrl = this.storage.getSignedUrl(item.originalFileKey, apiUrl);

      await this.db.order.update({
        where: { id: orderId },
        data: { status: 'printing' },
      });

      const dispatched = await this.shopGateway.dispatchPrint({
        print_job_id: printJob.id,
        order_id: order.id,
        order_item_id: item.id,
        idempotency_key: idempotencyKey,
        document_url: documentUrl,
        document_expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        settings: {
          copies: item.copies,
          color_mode: item.colorMode,
          paper_size: item.paperSize,
          sides: item.sides,
          orientation: item.orientation,
          page_range: item.pageRange,
        },
        suggested_printer_id: printer?.id ?? null,
        priority: order.store.paidOrdersPriority,
        printer_os_name: printer?.osName ?? null,
      });

      if (!dispatched) {
        this.logger.warn(`No connected device for store ${order.storeId}, print job ${printJob.id} queued`);
        await this.db.order.update({
          where: { id: orderId },
          data: { status: 'needs_review' },
        });
      }
    }
  }

  async handlePrintCompleted(payload: {
    print_job_id: string;
    order_id: string;
    pages_printed?: number;
    printer_os_name?: string;
  }): Promise<void> {
    await this.db.printJob.update({
      where: { id: payload.print_job_id },
      data: {
        status: 'completed',
        pagesPrinted: payload.pages_printed ?? null,
        completedAt: new Date(),
      },
    });

    const order = await this.db.order.findUnique({
      where: { id: payload.order_id },
      include: { items: { include: { finishingServices: true } } },
    });
    if (!order) return;

    const hasFinishing = order.items.some((i) => i.finishingServices.length > 0);
    const newStatus = hasFinishing ? 'awaiting_finishing' : 'ready';

    await this.db.order.update({
      where: { id: payload.order_id },
      data: { status: newStatus },
    });

    if (newStatus === 'ready') {
      await this.notifications.sendOrderReadySms(payload.order_id);
    }
  }

  async handlePrintFailed(payload: {
    print_job_id: string;
    order_id: string;
    reason_code?: string;
    reason_message?: string;
  }): Promise<void> {
    await this.db.printJob.update({
      where: { id: payload.print_job_id },
      data: {
        status: 'failed',
        failureCode: payload.reason_code ?? 'unknown',
        failureReason: payload.reason_message ?? 'فشلت الطباعة',
        completedAt: new Date(),
      },
    });

    await this.db.order.update({
      where: { id: payload.order_id },
      data: { status: 'needs_review' },
    });
  }

  /** Re-dispatch order print jobs (new attempt numbers). */
  async retryOrder(orderId: string): Promise<{ jobs: number }> {
    const order = await this.db.order.findUnique({
      where: { id: orderId },
      include: { items: true, store: true, printJobs: true },
    });
    if (!order) return { jobs: 0 };

    const printers = await this.db.printer.findMany({
      where: { storeId: order.storeId, status: 'online' },
    });

    let jobs = 0;
    for (const item of order.items) {
      if (!item.originalFileKey) continue;

      const attempt =
        order.printJobs.filter((j) => j.orderItemId === item.id).length + 1;
      const idempotencyKey = `${order.id}:${item.id}:${attempt}`;

      const existing = await this.db.printJob.findUnique({ where: { idempotencyKey } });
      if (existing) continue;

      const printer = this.selectPrinter(printers, item);
      const printJob = await this.db.printJob.create({
        data: {
          orderId: order.id,
          orderItemId: item.id,
          printerId: printer?.id ?? null,
          deviceId: printer?.deviceId ?? null,
          status: 'queued',
          priority: order.store.paidOrdersPriority,
          attemptNumber: attempt,
          idempotencyKey,
          settings: {
            copies: item.copies,
            color_mode: item.colorMode,
            paper_size: item.paperSize,
            sides: item.sides,
            orientation: item.orientation,
            page_range: item.pageRange,
          },
        },
      });

      const apiUrl = process.env.API_URL ?? 'http://localhost:4000';
      const documentUrl = this.storage.getSignedUrl(item.originalFileKey, apiUrl);

      await this.db.order.update({
        where: { id: orderId },
        data: { status: 'printing' },
      });

      await this.shopGateway.dispatchPrint({
        print_job_id: printJob.id,
        order_id: order.id,
        order_item_id: item.id,
        idempotency_key: idempotencyKey,
        document_url: documentUrl,
        document_expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        settings: {
          copies: item.copies,
          color_mode: item.colorMode,
          paper_size: item.paperSize,
          sides: item.sides,
          orientation: item.orientation,
          page_range: item.pageRange,
        },
        suggested_printer_id: printer?.id ?? null,
        priority: order.store.paidOrdersPriority,
        printer_os_name: printer?.osName ?? null,
      });
      jobs++;
    }

    return { jobs };
  }

  private selectPrinter(
    printers: Array<{
      id: string;
      deviceId: string | null;
      osName: string;
      supportsColor: boolean;
      supportsDuplex: boolean;
      supportedSizes: string[];
      roles: string[];
      queueLength: number;
      isDefault: boolean;
    }>,
    item: { colorMode: string; paperSize: string; sides: string },
  ) {
    let candidates = printers.filter((p) => p.supportedSizes.includes(item.paperSize));

    if (item.colorMode === 'color') {
      candidates = candidates.filter((p) => p.supportsColor);
    }

    if (item.sides !== 'single') {
      candidates = candidates.filter((p) => p.supportsDuplex);
    }

    if (!candidates.length) return null;

    const role = item.colorMode === 'color' ? `color_${item.paperSize.toLowerCase()}` : `bw_${item.paperSize.toLowerCase()}`;
    const roleMatch = candidates.filter((p) => p.roles.includes(role));
    const pool = roleMatch.length ? roleMatch : candidates;

    return pool.sort((a, b) => a.queueLength - b.queueLength || (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0))[0];
  }
}

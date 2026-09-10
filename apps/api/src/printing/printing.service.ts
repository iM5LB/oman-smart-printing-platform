import { BadRequestException, Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
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

  private apiPublicBase(): string {
    return (
      process.env.PUBLIC_API_URL ??
      process.env.API_PUBLIC_URL ??
      process.env.API_URL ??
      process.env.RENDER_EXTERNAL_URL ??
      `http://localhost:${process.env.API_PORT ?? 4000}`
    ).replace(/\/+$/, '');
  }

  async dispatchOrder(orderId: string): Promise<void> {
    const order = await this.db.order.findUnique({
      where: { id: orderId },
      include: { items: true, store: true },
    });
    if (!order) return;

    if (['ready', 'collected', 'completed', 'cancelled'].includes(order.status)) {
      throw new BadRequestException('لا يمكن طباعة طلب منتهٍ أو ملغى');
    }

    const printers = await this.db.printer.findMany({
      where: { storeId: order.storeId, status: 'online' },
    });

    let anyJob = false;
    let anyDispatched = false;

    for (const item of order.items) {
      if (!item.originalFileKey) continue;

      const printer = this.selectPrinter(printers, item);
      const idempotencyKey = `${order.id}:${item.id}:1`;
      let printJob = await this.db.printJob.findUnique({ where: { idempotencyKey } });

      if (printJob?.status === 'completed') {
        continue;
      }

      if (!printJob) {
        printJob = await this.db.printJob.create({
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
      } else if (printer) {
        await this.db.printJob.update({
          where: { id: printJob.id },
          data: {
            printerId: printer.id,
            deviceId: printer.deviceId,
            status: 'queued',
            failureCode: null,
            failureReason: null,
          },
        });
      }

      anyJob = true;
      const documentUrl = this.storage.getSignedUrl(
        item.originalFileKey,
        this.apiPublicBase(),
        3600,
        item.originalFilename,
      );

      const dispatched = await this.shopGateway.dispatchPrint({
        print_job_id: printJob.id,
        order_id: order.id,
        order_item_id: item.id,
        idempotency_key: idempotencyKey,
        document_url: documentUrl,
        document_expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
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

      if (dispatched) {
        anyDispatched = true;
        await this.db.printJob.update({
          where: { id: printJob.id },
          data: { status: 'printing', startedAt: new Date() },
        });
      } else {
        this.logger.warn(
          `No connected device for store ${order.storeId}; job ${printJob.id} stays queued`,
        );
      }
    }

    if (!anyJob) return;

    await this.db.order.update({
      where: { id: orderId },
      data: { status: anyDispatched ? 'printing' : 'queued' },
    });
  }

  /** Re-send queued/sent jobs when a desktop device comes online. */
  async flushQueuedJobsForStore(storeId: string): Promise<number> {
    const jobs = await this.db.printJob.findMany({
      where: {
        status: { in: ['queued', 'preparing', 'downloading', 'printing', 'failed'] },
        order: { storeId, status: { in: ['queued', 'printing', 'needs_review', 'paid', 'review_pending'] } },
      },
      include: {
        orderItem: true,
        order: { include: { store: true } },
        printer: true,
      },
      orderBy: { createdAt: 'asc' },
      take: 30,
    });

    let sent = 0;
    for (const job of jobs) {
      const fileKey = job.orderItem?.originalFileKey;
      if (!fileKey) continue;

      const settings = (job.settings ?? {}) as Record<string, unknown>;
      const documentUrl = this.storage.getSignedUrl(
        fileKey,
        this.apiPublicBase(),
        3600,
        job.orderItem?.originalFilename,
      );
      const ok = await this.shopGateway.dispatchPrint({
        print_job_id: job.id,
        order_id: job.orderId,
        order_item_id: job.orderItemId,
        idempotency_key: job.idempotencyKey,
        document_url: documentUrl,
        document_expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        settings: {
          copies: settings.copies ?? job.orderItem.copies,
          color_mode: settings.color_mode ?? job.orderItem.colorMode,
          paper_size: settings.paper_size ?? job.orderItem.paperSize,
          sides: settings.sides ?? job.orderItem.sides,
          orientation: settings.orientation ?? job.orderItem.orientation,
          page_range: settings.page_range ?? job.orderItem.pageRange,
        },
        suggested_printer_id: job.printerId,
        priority: job.priority,
        printer_os_name: job.printer?.osName ?? null,
      });

      if (ok) {
        sent++;
        await this.db.printJob.update({
          where: { id: job.id },
          data: {
            status: 'printing',
            startedAt: new Date(),
            failureCode: null,
            failureReason: null,
          },
        });
        await this.db.order.update({
          where: { id: job.orderId },
          data: { status: 'printing' },
        });
      }
    }
    return sent;
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

    const remaining = await this.db.printJob.count({
      where: {
        orderId: payload.order_id,
        status: { notIn: ['completed', 'cancelled'] },
      },
    });
    if (remaining > 0) {
      await this.db.order.update({
        where: { id: payload.order_id },
        data: { status: 'printing' },
      });
      return;
    }

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
    let anyDispatched = false;

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

      const documentUrl = this.storage.getSignedUrl(
        item.originalFileKey,
        this.apiPublicBase(),
        3600,
        item.originalFilename,
      );

      const dispatched = await this.shopGateway.dispatchPrint({
        print_job_id: printJob.id,
        order_id: order.id,
        order_item_id: item.id,
        idempotency_key: idempotencyKey,
        document_url: documentUrl,
        document_expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
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

      if (dispatched) {
        anyDispatched = true;
        await this.db.printJob.update({
          where: { id: printJob.id },
          data: { status: 'printing', startedAt: new Date() },
        });
      }
      jobs++;
    }

    if (jobs > 0) {
      await this.db.order.update({
        where: { id: orderId },
        data: { status: anyDispatched ? 'printing' : 'queued' },
      });
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
    let candidates = printers.filter((p) =>
      p.supportedSizes.length === 0
        ? true
        : p.supportedSizes.includes(item.paperSize),
    );

    if (item.colorMode === 'color') {
      candidates = candidates.filter((p) => p.supportsColor);
    }

    if (item.sides !== 'single') {
      candidates = candidates.filter((p) => p.supportsDuplex);
    }

    if (!candidates.length) {
      candidates = [...printers];
    }
    if (!candidates.length) return null;

    const role =
      item.colorMode === 'color'
        ? `color_${item.paperSize.toLowerCase()}`
        : `bw_${item.paperSize.toLowerCase()}`;
    const roleMatch = candidates.filter((p) => p.roles.includes(role));
    const pool = roleMatch.length ? roleMatch : candidates;

    return pool.sort(
      (a, b) =>
        a.queueLength - b.queueLength || (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0),
    )[0];
  }
}

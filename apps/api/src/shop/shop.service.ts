import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import {
  ColorMode,
  FileRetentionPolicy,
  InStorePaymentMethod,
  OrderStatus,
  PaperSize,
  PayAtPickupPrintPolicy,
  PaymentMethod,
  PrismaClient,
  QueuePriority,
} from '@omsp/database';
import {
  formatOMR,
  getPhoneErrorMessageAr,
  isValidPhone,
  normalizePhone,
} from '@omsp/shared';
import { hashPassword } from '../common/password';
import { PRISMA } from '../prisma/prisma.module';
import { NotificationsService } from '../notifications/notifications.service';
import { PrintingService } from '../printing/printing.service';
import { StorageService } from '../storage/storage.service';

const ACTIVE_STATUSES: OrderStatus[] = [
  'submitted',
  'payment_pending',
  'paid',
  'review_pending',
  'queued',
  'preparing',
  'printing',
  'awaiting_finishing',
  'ready',
  'needs_review',
];

@Injectable()
export class ShopService {
  constructor(
    @Inject(PRISMA) private readonly db: PrismaClient,
    private readonly notifications: NotificationsService,
    @Inject(forwardRef(() => PrintingService))
    private readonly printing: PrintingService,
    private readonly storage: StorageService,
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

  async getMe(storeId: string, deviceId: string) {
    const store = await this.db.store.findUnique({
      where: { id: storeId },
      include: { openingHours: { orderBy: { dayOfWeek: 'asc' } } },
    });
    const device = await this.db.device.findUnique({ where: { id: deviceId } });
    if (!store || !device) throw new NotFoundException();

    const apiBase = (
      process.env.PUBLIC_API_URL ??
      process.env.API_PUBLIC_URL ??
      process.env.API_URL ??
      process.env.RENDER_EXTERNAL_URL ??
      `http://localhost:${process.env.API_PORT ?? 4000}`
    ).replace(/\/+$/, '');

    const logoUrl = store.logoUrl
      ? store.logoUrl.startsWith('http://') ||
        store.logoUrl.startsWith('https://') ||
        store.logoUrl.startsWith('data:')
        ? store.logoUrl
        : `${apiBase}/api/v1/stores/${store.slug}/logo`
      : null;

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/+$/, '');

    return {
      store: {
        id: store.id,
        slug: store.slug,
        name: store.name,
        phone: store.phone,
        logo_url: logoUrl,
        governorate: store.governorate,
        wilayat: store.wilayat,
        area: store.area,
        address: store.address,
        latitude: store.latitude,
        longitude: store.longitude,
        is_active: store.isActive,
        order_number_prefix: store.orderNumberPrefix,
        auto_print_paid_orders: store.autoPrintPaidOrders,
        pay_at_pickup_print_policy: store.payAtPickupPrintPolicy,
        file_retention_policy: store.fileRetentionPolicy,
        paid_orders_priority: store.paidOrdersPriority,
        device_confirm_phone: store.deviceConfirmPhone,
        has_device_password: !!store.devicePasswordHash,
        onboarding_completed_at: store.onboardingCompletedAt?.toISOString() ?? null,
        customer_shop_path: `/${store.slug}`,
        customer_shop_url: appUrl ? `${appUrl}/${store.slug}` : null,
        created_at: store.createdAt.toISOString(),
        updated_at: store.updatedAt.toISOString(),
        opening_hours: store.openingHours.map((h) => ({
          day_of_week: h.dayOfWeek,
          open_time: h.openTime,
          close_time: h.closeTime,
          is_closed: h.isClosed,
        })),
      },
      device: {
        id: device.id,
        name: device.name,
        status: device.status,
        last_connected_at: device.lastConnectedAt?.toISOString() ?? null,
        app_version: device.appVersion,
        os_version: device.osVersion,
        created_at: device.createdAt.toISOString(),
      },
    };
  }

  async listOrders(storeId: string, status?: string) {
    const where: { storeId: string; status?: { in: OrderStatus[] } | OrderStatus } = { storeId };

    if (status === 'active') {
      where.status = { in: ACTIVE_STATUSES };
    } else if (status) {
      where.status = status as OrderStatus;
    }

    const orders = await this.db.order.findMany({
      where,
      include: {
        items: {
          include: {
            finishingServices: { include: { finishingService: true } },
          },
        },
        printJobs: { orderBy: { createdAt: 'desc' }, take: 3 },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return orders.map((o) => this.mapOrder(o));
  }

  async getStats(storeId: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfYesterday = new Date(startOfDay);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - 6);

    const [todayOrders, yesterdayOrders, weekOrders, active] = await Promise.all([
      this.db.order.findMany({ where: { storeId, createdAt: { gte: startOfDay } } }),
      this.db.order.findMany({
        where: { storeId, createdAt: { gte: startOfYesterday, lt: startOfDay } },
      }),
      this.db.order.findMany({ where: { storeId, createdAt: { gte: startOfWeek } } }),
      this.db.order.findMany({ where: { storeId, status: { in: ACTIVE_STATUSES } } }),
    ]);

    const revenue = todayOrders.reduce((s, o) => s + o.totalBaisa, 0);
    const yesterdayRevenue = yesterdayOrders.reduce((s, o) => s + o.totalBaisa, 0);
    const weekRevenue = weekOrders.reduce((s, o) => s + o.totalBaisa, 0);
    const ordersDelta =
      yesterdayOrders.length === 0
        ? todayOrders.length > 0
          ? 100
          : 0
        : Math.round(
            ((todayOrders.length - yesterdayOrders.length) / yesterdayOrders.length) * 100,
          );

    return {
      today_orders: todayOrders.length,
      today_revenue_baisa: revenue,
      today_revenue_display: formatOMR(revenue),
      yesterday_orders: yesterdayOrders.length,
      yesterday_revenue_display: formatOMR(yesterdayRevenue),
      orders_delta_percent: ordersDelta,
      week_orders: weekOrders.length,
      week_revenue_display: formatOMR(weekRevenue),
      printing_count: active.filter((o) =>
        ['printing', 'queued', 'preparing'].includes(o.status),
      ).length,
      ready_count: active.filter((o) => o.status === 'ready').length,
    };
  }

  async listPayments(storeId: string) {
    const payments = await this.db.payment.findMany({
      where: { order: { storeId } },
      include: { order: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return payments.map((p) => ({
      id: p.id,
      order_id: p.orderId,
      order_number: p.order.displayNumber,
      customer_name: p.order.customerName,
      amount_display: formatOMR(p.amountBaisa),
      status: p.status,
      method: p.method,
      in_store_method: p.inStoreMethod,
      paid_at: p.paidAt?.toISOString() ?? null,
      created_at: p.createdAt.toISOString(),
    }));
  }

  async listCustomers(storeId: string) {
    const orders = await this.db.order.findMany({
      where: { storeId, customerPhone: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const map = new Map<
      string,
      {
        phone: string;
        name: string;
        order_count: number;
        total_baisa: number;
        last_order_at: string;
      }
    >();

    for (const o of orders) {
      const phone = o.customerPhone!;
      const existing = map.get(phone);
      if (!existing) {
        map.set(phone, {
          phone,
          name: o.customerName ?? '—',
          order_count: 1,
          total_baisa: o.totalBaisa,
          last_order_at: o.createdAt.toISOString(),
        });
      } else {
        existing.order_count++;
        existing.total_baisa += o.totalBaisa;
        if (!existing.name || existing.name === '—') existing.name = o.customerName ?? '—';
      }
    }

    return [...map.values()]
      .sort((a, b) => b.order_count - a.order_count)
      .map((c) => ({
        ...c,
        total_display: formatOMR(c.total_baisa),
      }));
  }

  async getPricing(storeId: string) {
    const defaultRules: Array<{
      paperSize: 'A4' | 'A3' | 'A5';
      colorMode: 'bw' | 'color' | 'grayscale';
      pricePerPage: number;
    }> = [
      { paperSize: 'A4', colorMode: 'bw', pricePerPage: 20 },
      { paperSize: 'A4', colorMode: 'color', pricePerPage: 100 },
      { paperSize: 'A4', colorMode: 'grayscale', pricePerPage: 15 },
      { paperSize: 'A3', colorMode: 'bw', pricePerPage: 50 },
      { paperSize: 'A3', colorMode: 'color', pricePerPage: 200 },
      { paperSize: 'A3', colorMode: 'grayscale', pricePerPage: 40 },
      { paperSize: 'A5', colorMode: 'bw', pricePerPage: 15 },
      { paperSize: 'A5', colorMode: 'color', pricePerPage: 80 },
      { paperSize: 'A5', colorMode: 'grayscale', pricePerPage: 12 },
    ];

    const existingRules = await this.db.pricingRule.findMany({ where: { storeId } });
    const have = new Set(existingRules.map((r) => `${r.paperSize}:${r.colorMode}`));
    const missingRules = defaultRules.filter(
      (d) => !have.has(`${d.paperSize}:${d.colorMode}`),
    );
    if (missingRules.length) {
      await this.db.pricingRule.createMany({
        data: missingRules.map((d) => ({
          storeId,
          paperSize: d.paperSize,
          colorMode: d.colorMode,
          pricePerPage: d.pricePerPage,
          isActive: true,
        })),
        skipDuplicates: true,
      });
    }

    const defaultFinishing: Array<{ nameAr: string; priceBaisa: number; sortOrder: number }> = [
      { nameAr: 'تدبيس', priceBaisa: 100, sortOrder: 1 },
      { nameAr: 'تجليد', priceBaisa: 500, sortOrder: 2 },
      { nameAr: 'تغليف حراري', priceBaisa: 300, sortOrder: 3 },
      { nameAr: 'ثقب', priceBaisa: 50, sortOrder: 4 },
    ];

    let finishing = await this.db.finishingService.findMany({
      where: { storeId },
      orderBy: { sortOrder: 'asc' },
    });
    const haveFinish = new Set(finishing.map((f) => f.nameAr.trim()));
    const missingFinish = defaultFinishing.filter((d) => !haveFinish.has(d.nameAr));
    if (missingFinish.length) {
      await this.db.finishingService.createMany({
        data: missingFinish.map((d) => ({
          storeId,
          nameAr: d.nameAr,
          priceBaisa: d.priceBaisa,
          sortOrder: d.sortOrder,
          isActive: true,
        })),
      });
      finishing = await this.db.finishingService.findMany({
        where: { storeId },
        orderBy: { sortOrder: 'asc' },
      });
    }

    const rules = await this.db.pricingRule.findMany({
      where: { storeId },
      orderBy: [{ paperSize: 'asc' }, { colorMode: 'asc' }],
    });

    return {
      rules: rules.map((r) => ({
        id: r.id,
        paper_size: r.paperSize,
        color_mode: r.colorMode,
        price_per_page: r.pricePerPage,
        price_display: formatOMR(r.pricePerPage),
        is_active: r.isActive,
      })),
      finishing: finishing.map((f) => ({
        id: f.id,
        name_ar: f.nameAr,
        description: f.description,
        price_baisa: f.priceBaisa,
        price_display: formatOMR(f.priceBaisa),
        is_active: f.isActive,
      })),
    };
  }

  async updatePricingRule(
    storeId: string,
    ruleId: string,
    body: { price_per_page?: number | null; is_active?: boolean | string | number },
  ) {
    const rule = await this.db.pricingRule.findFirst({ where: { id: ruleId, storeId } });
    if (!rule) throw new NotFoundException('قاعدة التسعير غير موجودة');

    const data: { pricePerPage?: number; isActive?: boolean } = {};

    if (body.price_per_page !== undefined && body.price_per_page !== null) {
      const price = Number(body.price_per_page);
      if (!Number.isFinite(price) || price < 0) {
        throw new BadRequestException('سعر غير صالح');
      }
      data.pricePerPage = Math.round(price);
    }

    if (body.is_active !== undefined && body.is_active !== null) {
      data.isActive = parseBoolFlag(body.is_active);
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('لا توجد بيانات للتحديث');
    }

    const updated = await this.db.pricingRule.update({
      where: { id: ruleId },
      data,
    });

    return {
      id: updated.id,
      paper_size: updated.paperSize,
      color_mode: updated.colorMode,
      price_per_page: updated.pricePerPage,
      price_display: formatOMR(updated.pricePerPage),
      is_active: updated.isActive,
    };
  }

  async createPricingRule(
    storeId: string,
    body: {
      paper_size: string;
      color_mode: string;
      price_per_page: number;
      is_active?: boolean;
    },
  ) {
    const paperSize = body.paper_size as PaperSize;
    const colorMode = body.color_mode as ColorMode;
    if (!Object.values(PaperSize).includes(paperSize)) {
      throw new BadRequestException('مقاس الورق غير صالح');
    }
    if (!Object.values(ColorMode).includes(colorMode)) {
      throw new BadRequestException('وضع اللون غير صالح');
    }
    if (!Number.isFinite(body.price_per_page) || body.price_per_page < 0) {
      throw new BadRequestException('سعر غير صالح');
    }

    const pricePerPage = Math.round(body.price_per_page);
    const isActive = body.is_active !== undefined ? Boolean(body.is_active) : true;

    const existing = await this.db.pricingRule.findFirst({
      where: { storeId, paperSize, colorMode },
    });

    const updated = existing
      ? await this.db.pricingRule.update({
          where: { id: existing.id },
          data: { pricePerPage, isActive: true },
        })
      : await this.db.pricingRule.create({
          data: { storeId, paperSize, colorMode, pricePerPage, isActive },
        });

    return {
      id: updated.id,
      paper_size: updated.paperSize,
      color_mode: updated.colorMode,
      price_per_page: updated.pricePerPage,
      price_display: formatOMR(updated.pricePerPage),
      is_active: updated.isActive,
    };
  }

  async updateFinishing(
    storeId: string,
    serviceId: string,
    body: {
      price_baisa?: number | null;
      is_active?: boolean | string | number | null;
      name_ar?: string;
      description?: string | null;
    },
  ) {
    const svc = await this.db.finishingService.findFirst({
      where: { id: serviceId, storeId },
    });
    if (!svc) throw new NotFoundException('خدمة التجهيز غير موجودة');

    const data: {
      priceBaisa?: number;
      isActive?: boolean;
      nameAr?: string;
      description?: string | null;
    } = {};

    if (body.price_baisa !== undefined && body.price_baisa !== null) {
      const price = Number(body.price_baisa);
      if (!Number.isFinite(price) || price < 0) {
        throw new BadRequestException('سعر غير صالح');
      }
      data.priceBaisa = Math.round(price);
    }
    if (body.is_active !== undefined && body.is_active !== null) {
      data.isActive = parseBoolFlag(body.is_active);
    }
    if (body.name_ar !== undefined) {
      const name = body.name_ar.trim();
      if (!name) throw new BadRequestException('اسم الخدمة مطلوب');
      data.nameAr = name;
    }
    if (body.description !== undefined) {
      data.description = body.description?.trim() || null;
    }
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('لا توجد بيانات للتحديث');
    }

    const updated = await this.db.finishingService.update({
      where: { id: serviceId },
      data,
    });

    return {
      id: updated.id,
      name_ar: updated.nameAr,
      description: updated.description,
      price_baisa: updated.priceBaisa,
      price_display: formatOMR(updated.priceBaisa),
      is_active: updated.isActive,
    };
  }

  async createFinishing(
    storeId: string,
    body: {
      name_ar: string;
      price_baisa: number;
      description?: string | null;
      is_active?: boolean;
    },
  ) {
    const nameAr = (body.name_ar ?? '').trim();
    if (!nameAr) throw new BadRequestException('اسم الخدمة مطلوب');
    if (!Number.isFinite(body.price_baisa) || body.price_baisa < 0) {
      throw new BadRequestException('سعر غير صالح');
    }

    const maxSort = await this.db.finishingService.aggregate({
      where: { storeId },
      _max: { sortOrder: true },
    });

    const created = await this.db.finishingService.create({
      data: {
        storeId,
        nameAr,
        description: body.description?.trim() || null,
        priceBaisa: Math.round(body.price_baisa),
        isActive: body.is_active !== undefined ? Boolean(body.is_active) : true,
        sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
      },
    });

    return {
      id: created.id,
      name_ar: created.nameAr,
      description: created.description,
      price_baisa: created.priceBaisa,
      price_display: formatOMR(created.priceBaisa),
      is_active: created.isActive,
    };
  }

  async markReady(storeId: string, orderId: string) {
    const order = await this.getOrder(storeId, orderId);

    if (order.status === 'awaiting_finishing') {
      await this.db.order.update({
        where: { id: orderId },
        data: { status: 'ready' },
      });
      await this.notifications.sendOrderReadySms(orderId);
      return { success: true, status: 'ready' };
    }

    if (order.status === 'ready') {
      return { success: true, status: 'ready' };
    }

    // Printing must finish (or have no print jobs) before marking ready.
    const jobs = await this.db.printJob.findMany({ where: { orderId } });
    if (jobs.length === 0) {
      throw new BadRequestException(
        'لم تُطبع أي ملفات بعد. اضغط طباعة أولاً ثم علّم الطلب جاهزاً',
      );
    }

    const unfinished = jobs.filter((j) => j.status !== 'completed' && j.status !== 'cancelled');
    if (unfinished.length > 0) {
      throw new BadRequestException(
        'لا يمكن تعليم الطلب جاهزاً قبل اكتمال الطباعة. انتظر انتهاء الطباعة أو أعد المحاولة',
      );
    }

    if (!['printing', 'queued', 'needs_review', 'preparing'].includes(order.status)) {
      throw new BadRequestException('لا يمكن تعليم هذا الطلب كجاهز في حالته الحالية');
    }

    await this.db.order.update({
      where: { id: orderId },
      data: { status: 'ready' },
    });
    await this.notifications.sendOrderReadySms(orderId);
    return { success: true, status: 'ready' };
  }

  async markCollected(storeId: string, orderId: string) {
    const order = await this.getOrder(storeId, orderId);
    if (order.status !== 'ready') {
      throw new BadRequestException('الطلب ليس جاهزاً للاستلام');
    }

    await this.db.order.update({
      where: { id: orderId },
      data: {
        status: order.paymentStatus === 'completed' ? 'completed' : 'collected',
        completedAt: new Date(),
      },
    });

    return { success: true, status: 'collected' };
  }

  async payInStore(
    storeId: string,
    orderId: string,
    method: 'cash' | 'card_pos' = 'cash',
  ) {
    const order = await this.getOrder(storeId, orderId);
    if (order.paymentStatus === 'completed') {
      throw new BadRequestException('الطلب مدفوع مسبقاً');
    }

    const inStore: InStorePaymentMethod = method === 'card_pos' ? 'card_pos' : 'cash';

    await this.db.payment.create({
      data: {
        orderId,
        amountBaisa: order.totalBaisa,
        status: 'completed',
        method: 'pay_at_pickup' as PaymentMethod,
        provider: 'in_store',
        inStoreMethod: inStore,
        paidAt: new Date(),
      },
    });

    await this.db.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: 'completed',
        paymentMethod: 'pay_at_pickup',
        status: order.status === 'payment_pending' || order.status === 'submitted' ? 'paid' : order.status,
      },
    });

    // Do not auto-print on in-store payment — only prepaid (online) orders auto-print.
    return { success: true, status: 'paid' };
  }

  async dispatchOrder(storeId: string, orderId: string) {
    await this.getOrder(storeId, orderId);
    await this.printing.dispatchOrder(orderId);
    return { success: true };
  }

  async retryOrder(storeId: string, orderId: string) {
    await this.getOrder(storeId, orderId);
    return this.printing.retryOrder(orderId);
  }

  async listPrinters(storeId: string) {
    const printers = await this.db.printer.findMany({
      where: { storeId },
      orderBy: { displayName: 'asc' },
    });

    return printers.map((p) => ({
      id: p.id,
      os_name: p.osName,
      display_name: p.displayName,
      status: p.status,
      supports_color: p.supportsColor,
      supports_duplex: p.supportsDuplex,
      supported_sizes: p.supportedSizes,
      roles: p.roles,
      is_default: p.isDefault,
      queue_length: p.queueLength,
    }));
  }

  async updatePrinter(
    storeId: string,
    printerId: string,
    data: { roles?: string[]; is_default?: boolean; display_name?: string },
  ) {
    const printer = await this.db.printer.findFirst({
      where: { id: printerId, storeId },
    });
    if (!printer) throw new NotFoundException('الطابعة غير موجودة');

    if (data.is_default) {
      await this.db.printer.updateMany({
        where: { storeId },
        data: { isDefault: false },
      });
    }

    return this.db.printer.update({
      where: { id: printerId },
      data: {
        roles: data.roles ?? undefined,
        isDefault: data.is_default ?? undefined,
        displayName: data.display_name ?? undefined,
      },
    });
  }

  private mapOrder(o: {
    id: string;
    displayNumber: string;
    status: string;
    paymentStatus: string;
    paymentMethod: string | null;
    customerName: string | null;
    customerPhone: string | null;
    customerNotes: string | null;
    totalBaisa: number;
    createdAt: Date;
    items: Array<{
      originalFilename: string;
      pageCount: number;
      copies: number;
      colorMode: ColorMode | string;
      paperSize: PaperSize | string;
      sides: string;
      orientation?: string | null;
      pageRange?: string | null;
      originalFileKey?: string | null;
      mimeType?: string | null;
      finishingServices?: Array<{
        finishingService?: { nameAr: string } | null;
      }>;
    }>;
    printJobs: Array<{ id: string; status: string; failureReason: string | null }>;
  }) {
    const apiBase = this.apiPublicBase();
    return {
      id: o.id,
      order_number: o.displayNumber,
      status: o.status,
      payment_status: o.paymentStatus,
      payment_method: o.paymentMethod,
      customer_name: o.customerName,
      customer_phone: o.customerPhone,
      notes: o.customerNotes,
      total_baisa: o.totalBaisa,
      total_display: formatOMR(o.totalBaisa),
      item_count: o.items.length,
      created_at: o.createdAt.toISOString(),
      items: o.items.map((i) => {
        const finishingNames = (i.finishingServices ?? [])
          .map((fs) => fs.finishingService?.nameAr)
          .filter((n): n is string => Boolean(n));
        const fileKey = i.originalFileKey ?? null;
        return {
          filename: i.originalFilename,
          page_count: i.pageCount,
          copies: i.copies,
          color_mode: i.colorMode,
          paper_size: i.paperSize,
          sides: i.sides,
          orientation: i.orientation ?? 'auto',
          page_range: i.pageRange ?? 'all',
          mime_type: i.mimeType ?? null,
          finishing: finishingNames,
          file_url: fileKey
            ? this.storage.getSignedUrl(fileKey, apiBase, 3600, i.originalFilename)
            : null,
        };
      }),
      print_jobs: o.printJobs.map((j) => ({
        id: j.id,
        status: j.status,
        failure_reason: j.failureReason,
      })),
    };
  }

  async updateStore(
    storeId: string,
    deviceId: string,
    body: {
      name?: string;
      phone?: string | null;
      governorate?: string | null;
      wilayat?: string | null;
      area?: string | null;
      address?: string | null;
      latitude?: number | null;
      longitude?: number | null;
      auto_print_paid_orders?: boolean;
      pay_at_pickup_print_policy?: string;
      file_retention_policy?: string;
      paid_orders_priority?: string;
      order_number_prefix?: string;
      is_active?: boolean;
      opening_hours?: Array<{
        day_of_week: number;
        open_time: string;
        close_time: string;
        is_closed: boolean;
      }>;
    },
  ) {
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) {
      const name = body.name.trim();
      if (!name) throw new BadRequestException('اسم المكتبة مطلوب');
      data.name = name;
    }
    if (body.phone !== undefined) {
      data.phone = body.phone ? this.requirePhone(body.phone) : null;
    }
    if (body.governorate !== undefined) data.governorate = body.governorate?.trim() || null;
    if (body.wilayat !== undefined) data.wilayat = body.wilayat?.trim() || null;
    if (body.area !== undefined) data.area = body.area?.trim() || null;
    if (body.address !== undefined) data.address = body.address?.trim() || null;
    if (body.latitude !== undefined) {
      const lat = body.latitude;
      if (lat !== null && (!Number.isFinite(lat) || lat < -90 || lat > 90)) {
        throw new BadRequestException('خط العرض غير صالح');
      }
      data.latitude = lat;
    }
    if (body.longitude !== undefined) {
      const lng = body.longitude;
      if (lng !== null && (!Number.isFinite(lng) || lng < -180 || lng > 180)) {
        throw new BadRequestException('خط الطول غير صالح');
      }
      data.longitude = lng;
    }

    if (body.auto_print_paid_orders !== undefined) {
      data.autoPrintPaidOrders = Boolean(body.auto_print_paid_orders);
    }

    if (body.pay_at_pickup_print_policy !== undefined) {
      const allowed: PayAtPickupPrintPolicy[] = [
        'auto_print',
        'require_approval',
        'print_on_arrival',
      ];
      if (!allowed.includes(body.pay_at_pickup_print_policy as PayAtPickupPrintPolicy)) {
        throw new BadRequestException('سياسة طباعة الدفع عند الاستلام غير صالحة');
      }
      data.payAtPickupPrintPolicy = body.pay_at_pickup_print_policy;
    }

    if (body.file_retention_policy !== undefined) {
      const allowed: FileRetentionPolicy[] = [
        'immediate',
        'one_hour',
        'twenty_four_hours',
        'three_days',
        'seven_days',
      ];
      if (!allowed.includes(body.file_retention_policy as FileRetentionPolicy)) {
        throw new BadRequestException('سياسة احتفاظ الملفات غير صالحة');
      }
      data.fileRetentionPolicy = body.file_retention_policy;
    }

    if (body.paid_orders_priority !== undefined) {
      const allowed: QueuePriority[] = ['urgent', 'normal', 'low'];
      if (!allowed.includes(body.paid_orders_priority as QueuePriority)) {
        throw new BadRequestException('أولوية الطلبات غير صالحة');
      }
      data.paidOrdersPriority = body.paid_orders_priority;
    }

    if (body.order_number_prefix !== undefined) {
      const prefix = body.order_number_prefix.trim().slice(0, 8);
      if (!prefix) throw new BadRequestException('بادئة رقم الطلب مطلوبة');
      data.orderNumberPrefix = prefix;
    }

    if (body.is_active !== undefined) {
      data.isActive = Boolean(body.is_active);
    }

    const hasHours = Array.isArray(body.opening_hours);
    if (Object.keys(data).length === 0 && !hasHours) {
      throw new BadRequestException('لا توجد بيانات للتحديث');
    }

    try {
      if (Object.keys(data).length > 0) {
        await this.db.store.update({ where: { id: storeId }, data });
      }
      if (hasHours) {
        await this.replaceOpeningHours(storeId, body.opening_hours!);
      }
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      console.error('[shop.updateStore] database error:', err);
      throw new BadRequestException('تعذر تحديث بيانات المكتبة');
    }

    return this.getMe(storeId, deviceId);
  }

  private async replaceOpeningHours(
    storeId: string,
    hours: Array<{
      day_of_week: number;
      open_time: string;
      close_time: string;
      is_closed: boolean;
    }>,
  ) {
    if (hours.length !== 7) {
      throw new BadRequestException('يجب تحديد ساعات العمل لجميع أيام الأسبوع');
    }
    const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/;
    const seen = new Set<number>();
    for (const h of hours) {
      const day = Number(h.day_of_week);
      if (!Number.isInteger(day) || day < 0 || day > 6 || seen.has(day)) {
        throw new BadRequestException('أيام ساعات العمل غير صالحة');
      }
      seen.add(day);
      if (!timeRe.test(h.open_time) || !timeRe.test(h.close_time)) {
        throw new BadRequestException('وقت الفتح أو الإغلاق غير صالح');
      }
    }
    if (seen.size !== 7) {
      throw new BadRequestException('يجب تحديد ساعات العمل لجميع أيام الأسبوع');
    }

    await this.db.$transaction(
      hours.map((h) =>
        this.db.storeOpeningHours.upsert({
          where: {
            storeId_dayOfWeek: {
              storeId,
              dayOfWeek: h.day_of_week,
            },
          },
          create: {
            storeId,
            dayOfWeek: h.day_of_week,
            openTime: h.open_time,
            closeTime: h.close_time,
            isClosed: Boolean(h.is_closed),
          },
          update: {
            openTime: h.open_time,
            closeTime: h.close_time,
            isClosed: Boolean(h.is_closed),
          },
        }),
      ),
    );
  }

  async setDeviceSecurity(
    storeId: string,
    deviceId: string,
    body: { device_password: string; device_confirm_phone: string },
  ) {
    if ((body.device_password ?? '').length < 6) {
      throw new BadRequestException('كلمة مرور الجهاز يجب أن تكون 6 أحرف على الأقل');
    }
    const phone = this.requirePhone(body.device_confirm_phone);

    try {
      await this.db.store.update({
        where: { id: storeId },
        data: {
          devicePasswordHash: hashPassword(body.device_password),
          deviceConfirmPhone: phone,
        },
      });
    } catch (err) {
      console.error('[shop.setDeviceSecurity] database error:', err);
      throw new BadRequestException('تعذر حفظ إعدادات أمان الجهاز');
    }

    return this.getMe(storeId, deviceId);
  }

  private requirePhone(phoneRaw: string): string {
    const message = getPhoneErrorMessageAr(phoneRaw, { required: true });
    if (message || !isValidPhone(phoneRaw)) {
      throw new BadRequestException(
        message ?? 'رقم الهاتف غير صالح. اختر الدولة وأدخل الرقم بشكل صحيح',
      );
    }
    return normalizePhone(phoneRaw)!;
  }

  private async getOrder(storeId: string, orderId: string) {
    const order = await this.db.order.findFirst({
      where: { id: orderId, storeId },
    });
    if (!order) throw new NotFoundException('الطلب غير موجود');
    return order;
  }
}

function parseBoolFlag(value: unknown): boolean {
  if (value === true || value === 1 || value === '1' || value === 'true') return true;
  if (value === false || value === 0 || value === '0' || value === 'false') return false;
  return Boolean(value);
}

import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import {
  ColorMode,
  InStorePaymentMethod,
  OrderStatus,
  PaperSize,
  PaymentMethod,
  PrismaClient,
} from '@omsp/database';
import { formatOMR } from '@omsp/shared';
import { PRISMA } from '../prisma/prisma.module';
import { NotificationsService } from '../notifications/notifications.service';
import { PrintingService } from '../printing/printing.service';

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
  ) {}

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
        tax_rate_bps: store.taxRateBps,
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
        items: true,
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
    const [rules, finishing] = await Promise.all([
      this.db.pricingRule.findMany({ where: { storeId }, orderBy: { paperSize: 'asc' } }),
      this.db.finishingService.findMany({ where: { storeId }, orderBy: { sortOrder: 'asc' } }),
    ]);

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

  async updatePricingRule(storeId: string, ruleId: string, pricePerPage: number) {
    if (!Number.isFinite(pricePerPage) || pricePerPage < 0) {
      throw new BadRequestException('سعر غير صالح');
    }
    const rule = await this.db.pricingRule.findFirst({ where: { id: ruleId, storeId } });
    if (!rule) throw new NotFoundException('قاعدة التسعير غير موجودة');

    const updated = await this.db.pricingRule.update({
      where: { id: ruleId },
      data: { pricePerPage: Math.round(pricePerPage) },
    });

    return {
      id: updated.id,
      paper_size: updated.paperSize,
      color_mode: updated.colorMode,
      price_per_page: updated.pricePerPage,
      price_display: formatOMR(updated.pricePerPage),
    };
  }

  async updateFinishing(storeId: string, serviceId: string, priceBaisa: number) {
    if (!Number.isFinite(priceBaisa) || priceBaisa < 0) {
      throw new BadRequestException('سعر غير صالح');
    }
    const svc = await this.db.finishingService.findFirst({ where: { id: serviceId, storeId } });
    if (!svc) throw new NotFoundException('خدمة التجهيز غير موجودة');

    const updated = await this.db.finishingService.update({
      where: { id: serviceId },
      data: { priceBaisa: Math.round(priceBaisa) },
    });

    return {
      id: updated.id,
      name_ar: updated.nameAr,
      price_baisa: updated.priceBaisa,
      price_display: formatOMR(updated.priceBaisa),
    };
  }

  async markReady(storeId: string, orderId: string) {
    const order = await this.getOrder(storeId, orderId);
    if (!['awaiting_finishing', 'printing', 'queued', 'preparing', 'needs_review'].includes(order.status)) {
      throw new BadRequestException('لا يمكن تعليم هذا الطلب كجاهز');
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

    await this.printing.dispatchOrder(orderId);
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
    totalBaisa: number;
    createdAt: Date;
    items: Array<{
      originalFilename: string;
      pageCount: number;
      copies: number;
      colorMode: ColorMode | string;
      paperSize: PaperSize | string;
      sides: string;
    }>;
    printJobs: Array<{ id: string; status: string; failureReason: string | null }>;
  }) {
    return {
      id: o.id,
      order_number: o.displayNumber,
      status: o.status,
      payment_status: o.paymentStatus,
      payment_method: o.paymentMethod,
      customer_name: o.customerName,
      customer_phone: o.customerPhone,
      total_baisa: o.totalBaisa,
      total_display: formatOMR(o.totalBaisa),
      item_count: o.items.length,
      created_at: o.createdAt.toISOString(),
      items: o.items.map((i) => ({
        filename: i.originalFilename,
        page_count: i.pageCount,
        copies: i.copies,
        color_mode: i.colorMode,
        paper_size: i.paperSize,
        sides: i.sides,
      })),
      print_jobs: o.printJobs.map((j) => ({
        id: j.id,
        status: j.status,
        failure_reason: j.failureReason,
      })),
    };
  }

  private async getOrder(storeId: string, orderId: string) {
    const order = await this.db.order.findFirst({
      where: { id: orderId, storeId },
    });
    if (!order) throw new NotFoundException('الطلب غير موجود');
    return order;
  }
}

import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  ColorMode,
  OrderStatus,
  PaperSize,
  PaymentMethod,
  PaymentStatus,
  PrismaClient,
  PrintSides,
} from '@omsp/database';
import {
  calculateItemPrice,
  calculateTax,
  countPagesInRange,
  formatOMR,
  generateTrackingToken,
  isValidPhone,
  normalizePhone,
} from '@omsp/shared';
import { PRISMA } from '../prisma/prisma.module';

@Injectable()
export class OrdersService {
  constructor(@Inject(PRISMA) private readonly db: PrismaClient) {}

  async quote(storeSlug: string, items: Array<{
    page_count: number;
    color_mode: string;
    paper_size: string;
    sides: string;
    page_range?: string;
    copies?: number;
    finishing_service_ids?: string[];
  }>) {
    const store = await this.getStore(storeSlug);
    return this.calculateOrderTotals(store, items);
  }

  async create(storeSlug: string, dto: {
    customer_name?: string;
    customer_phone: string;
    customer_notes?: string;
    payment_method: 'pay_at_pickup' | 'online';
    items: Array<{
      file_key: string;
      original_filename: string;
      page_count: number;
      mime_type?: string;
      file_size_bytes?: number;
      color_mode: string;
      paper_size: string;
      sides: string;
      orientation?: string;
      page_range?: string;
      copies?: number;
      finishing_service_ids?: string[];
    }>;
  }) {
    const store = await this.getStore(storeSlug);

    if (!dto.items.length) {
      throw new BadRequestException('يجب إضافة ملف واحد على الأقل');
    }

    const phone = normalizePhone(dto.customer_phone);
    if (!phone || !isValidPhone(dto.customer_phone)) {
      throw new BadRequestException(
        'رقم الهاتف غير صالح. أدخل رقماً مثل 91234567 أو +96891234567 أو +9715XXXXXXX',
      );
    }

    const customerName = dto.customer_name?.trim() || null;

    const totals = await this.calculateOrderTotals(store, dto.items);
    const trackingToken = generateTrackingToken();

    const orderNumber = store.orderNumberCounter + 1;
    const displayNumber = `${store.orderNumberPrefix}${orderNumber}`;

    const paymentMethod = dto.payment_method as PaymentMethod;
    const isOnline = paymentMethod === 'online';

    let initialStatus: OrderStatus = isOnline ? 'payment_pending' : 'submitted';
    let paymentStatus: PaymentStatus = 'unpaid';

    if (!isOnline) {
      initialStatus = this.resolvePayAtPickupStatus(store.payAtPickupPrintPolicy);
    }

    const order = await this.db.$transaction(async (tx) => {
      await tx.store.update({
        where: { id: store.id },
        data: { orderNumberCounter: orderNumber },
      });

      const created = await tx.order.create({
        data: {
          storeId: store.id,
          orderNumber,
          displayNumber,
          status: initialStatus,
          paymentStatus,
          paymentMethod,
          customerName,
          customerPhone: phone,
          customerNotes: dto.customer_notes?.trim() || null,
          trackingToken,
          subtotalBaisa: totals.subtotal_baisa,
          taxBaisa: totals.tax_baisa,
          totalBaisa: totals.total_baisa,
          items: {
            create: dto.items.map((item, index) => {
              const priced = totals.items[index];
              return {
                sortOrder: index,
                originalFilename: item.original_filename,
                pageCount: item.page_count,
                copies: item.copies ?? 1,
                colorMode: item.color_mode as ColorMode,
                paperSize: item.paper_size as PaperSize,
                sides: item.sides as PrintSides,
                orientation: (item.orientation ?? 'auto') as 'auto' | 'portrait' | 'landscape',
                pageRange: item.page_range ?? 'all',
                subtotalBaisa: priced.amount_baisa,
                originalFileKey: item.file_key,
                fileSizeBytes: item.file_size_bytes ?? null,
                mimeType: item.mime_type ?? null,
                finishingServices: item.finishing_service_ids?.length
                  ? {
                      create: item.finishing_service_ids.map((fsId) => {
                        const fs = store.finishingServices.find((f) => f.id === fsId);
                        return {
                          finishingServiceId: fsId,
                          priceBaisa: fs?.priceBaisa ?? 0,
                        };
                      }),
                    }
                  : undefined,
              };
            }),
          },
        },
        include: {
          items: { include: { finishingServices: true } },
        },
      });

      if (isOnline) {
        await tx.payment.create({
          data: {
            orderId: created.id,
            amountBaisa: totals.total_baisa,
            status: 'pending',
            method: 'online',
            provider: process.env.PAYMENT_PROVIDER ?? 'mock',
          },
        });
      }

      await tx.auditLog.create({
        data: {
          storeId: store.id,
          action: 'order_created',
          entityType: 'order',
          entityId: created.id,
          metadata: { payment_method: paymentMethod, display_number: displayNumber },
        },
      });

      return created;
    });

    return {
      order_id: order.id,
      order_number: order.displayNumber,
      tracking_token: order.trackingToken,
      status: order.status,
      payment_status: order.paymentStatus,
      payment_method: order.paymentMethod,
      total_baisa: order.totalBaisa,
      total_display: formatOMR(order.totalBaisa),
      requires_payment: isOnline,
    };
  }

  async findByTrackingToken(token: string) {
    const order = await this.db.order.findUnique({
      where: { trackingToken: token },
      include: {
        items: { include: { finishingServices: { include: { finishingService: true } } } },
        store: { select: { name: true, slug: true, phone: true } },
      },
    });

    if (!order) throw new NotFoundException('الطلب غير موجود');

    return {
      order_number: order.displayNumber,
      status: order.status,
      payment_status: order.paymentStatus,
      total_display: formatOMR(order.totalBaisa),
      customer_name: order.customerName,
      store_name: order.store.name,
      store_slug: order.store.slug,
      store_phone: order.store.phone,
      items: order.items.map((item) => ({
        filename: item.originalFilename,
        copies: item.copies,
        color_mode: item.colorMode,
        paper_size: item.paperSize,
        sides: item.sides,
      })),
      created_at: order.createdAt.toISOString(),
    };
  }

  private async getStore(slug: string) {
    const store = await this.db.store.findUnique({
      where: { slug, isActive: true },
      include: {
        pricingRules: { where: { isActive: true } },
        finishingServices: { where: { isActive: true } },
      },
    });
    if (!store) throw new NotFoundException('المكتبة غير موجودة');
    return store;
  }

  private resolvePayAtPickupStatus(policy: string): OrderStatus {
    switch (policy) {
      case 'auto_print':
        return 'queued';
      case 'print_on_arrival':
        return 'submitted';
      default:
        return 'review_pending';
    }
  }

  private async calculateOrderTotals(
    store: {
      id: string;
      taxRateBps: number;
      pricingRules: Array<{ paperSize: string; colorMode: string; pricePerPage: number }>;
      finishingServices: Array<{ id: string; priceBaisa: number; nameAr: string }>;
    },
    items: Array<{
      page_count: number;
      color_mode: string;
      paper_size: string;
      sides: string;
      page_range?: string;
      copies?: number;
      finishing_service_ids?: string[];
    }>,
  ) {
    const pricedItems = items.map((item) => {
      const rule = store.pricingRules.find(
        (r) => r.paperSize === item.paper_size && r.colorMode === item.color_mode,
      );
      if (!rule) {
        throw new BadRequestException(
          `لا يوجد سعر لـ ${item.paper_size} ${item.color_mode}`,
        );
      }

      const pagesToPrint = countPagesInRange(item.page_range ?? 'all', item.page_count);
      const finishingBaisa = (item.finishing_service_ids ?? []).reduce((sum, id) => {
        const fs = store.finishingServices.find((f) => f.id === id);
        return sum + (fs?.priceBaisa ?? 0);
      }, 0);

      const amount = calculateItemPrice({
        pageCount: item.page_count,
        pagesToPrint,
        copies: item.copies ?? 1,
        pricePerPageBaisa: rule.pricePerPage,
        sides: item.sides as 'single' | 'duplex_long' | 'duplex_short',
        finishingBaisa,
        paperTypeSurchargeBaisa: 0,
        discountPercent: 0,
      });

      return {
        label: `${pagesToPrint} صفحة`,
        amount_baisa: amount,
      };
    });

    const subtotalBaisa = pricedItems.reduce((s, i) => s + i.amount_baisa, 0);
    const taxBaisa = calculateTax(subtotalBaisa, store.taxRateBps);
    const totalBaisa = subtotalBaisa + taxBaisa;

    return {
      items: pricedItems,
      subtotal_baisa: subtotalBaisa,
      tax_baisa: taxBaisa,
      total_baisa: totalBaisa,
      total_display: formatOMR(totalBaisa),
    };
  }
}

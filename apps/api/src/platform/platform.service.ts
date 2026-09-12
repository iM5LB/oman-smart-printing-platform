import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClient } from '@omsp/database';
import { getPhoneErrorMessageAr, isValidPhone, normalizePhone } from '@omsp/shared';
import { PRISMA } from '../prisma/prisma.module';
import { isPlatformAdminPhone } from '../auth/platform-admin';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

@Injectable()
export class PlatformService {
  constructor(@Inject(PRISMA) private readonly db: PrismaClient) {}

  requireAdmin(phone: string) {
    if (!isPlatformAdminPhone(phone)) {
      throw new ForbiddenException('هذه العملية للمشرف فقط');
    }
  }

  async listStores(_phone: string) {
    const stores = await this.db.store.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        openingHours: { orderBy: { dayOfWeek: 'asc' } },
        _count: { select: { orders: true, devices: true } },
      },
    });

    return {
      stores: stores.map((s) => this.mapStore(s)),
    };
  }

  async updateStore(
    _phone: string,
    slug: string,
    body: {
      name?: string;
      phone?: string | null;
      governorate?: string | null;
      wilayat?: string | null;
      area?: string | null;
      address?: string | null;
      is_active?: boolean;
    },
  ) {
    const store = await this.findBySlug(slug);
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) {
      const name = body.name.trim();
      if (name.length < 2) throw new BadRequestException('اسم المكتبة قصير جداً');
      data.name = name;
    }
    if (body.phone !== undefined) {
      data.phone = body.phone ? this.requirePhone(body.phone) : null;
    }
    if (body.governorate !== undefined) data.governorate = body.governorate?.trim() || null;
    if (body.wilayat !== undefined) data.wilayat = body.wilayat?.trim() || null;
    if (body.area !== undefined) data.area = body.area?.trim() || null;
    if (body.address !== undefined) data.address = body.address?.trim() || null;
    if (body.is_active !== undefined) data.isActive = body.is_active;

    const updated = await this.db.store.update({
      where: { id: store.id },
      data,
      include: {
        openingHours: { orderBy: { dayOfWeek: 'asc' } },
        _count: { select: { orders: true, devices: true } },
      },
    });
    return { store: this.mapStore(updated) };
  }

  async setHours(
    _phone: string,
    slug: string,
    hours: Array<{
      day_of_week: number;
      open_time: string;
      close_time: string;
      is_closed: boolean;
    }>,
  ) {
    const store = await this.findBySlug(slug);
    await this.replaceHours(store.id, hours);
    const updated = await this.db.store.findUniqueOrThrow({
      where: { id: store.id },
      include: {
        openingHours: { orderBy: { dayOfWeek: 'asc' } },
        _count: { select: { orders: true, devices: true } },
      },
    });
    return { store: this.mapStore(updated) };
  }

  async deleteStore(_phone: string, slug: string) {
    const store = await this.findBySlug(slug);
    // Soft-delete keeps order history; hidden from public directory.
    await this.db.store.update({
      where: { id: store.id },
      data: { isActive: false },
    });
    return { ok: true, slug: store.slug };
  }

  async replaceHours(
    storeId: string,
    hours: Array<{
      day_of_week: number;
      open_time: string;
      close_time: string;
      is_closed: boolean;
    }>,
  ) {
    if (!Array.isArray(hours) || hours.length !== 7) {
      throw new BadRequestException('يجب تحديد ساعات الأيام السبعة');
    }
    const seen = new Set<number>();
    for (const h of hours) {
      if (h.day_of_week < 0 || h.day_of_week > 6 || seen.has(h.day_of_week)) {
        throw new BadRequestException('أيام الأسبوع غير صالحة');
      }
      seen.add(h.day_of_week);
      if (!h.is_closed) {
        if (!TIME_RE.test(h.open_time) || !TIME_RE.test(h.close_time)) {
          throw new BadRequestException('صيغة الوقت يجب أن تكون HH:MM');
        }
      }
    }

    await this.db.$transaction(
      hours.map((h) =>
        this.db.storeOpeningHours.upsert({
          where: {
            storeId_dayOfWeek: { storeId, dayOfWeek: h.day_of_week },
          },
          create: {
            storeId,
            dayOfWeek: h.day_of_week,
            openTime: h.is_closed ? '00:00' : h.open_time,
            closeTime: h.is_closed ? '00:00' : h.close_time,
            isClosed: h.is_closed,
          },
          update: {
            openTime: h.is_closed ? '00:00' : h.open_time,
            closeTime: h.is_closed ? '00:00' : h.close_time,
            isClosed: h.is_closed,
          },
        }),
      ),
    );
  }

  private async findBySlug(slug: string) {
    const store = await this.db.store.findUnique({ where: { slug } });
    if (!store) throw new NotFoundException('المكتبة غير موجودة');
    return store;
  }

  private requirePhone(raw: string) {
    const phone = normalizePhone(raw);
    if (!phone || !isValidPhone(phone)) {
      throw new BadRequestException(getPhoneErrorMessageAr(raw) || 'رقم الهاتف غير صالح');
    }
    return phone;
  }

  private mapStore(store: {
    id: string;
    slug: string;
    name: string;
    phone: string | null;
    logoUrl: string | null;
    governorate: string | null;
    wilayat: string | null;
    area: string | null;
    address: string | null;
    isActive: boolean;
    createdAt: Date;
    openingHours: Array<{
      dayOfWeek: number;
      openTime: string;
      closeTime: string;
      isClosed: boolean;
    }>;
    _count?: { orders: number; devices: number };
  }) {
    const apiBase = (
      process.env.PUBLIC_API_URL ??
      process.env.API_URL ??
      'http://localhost:4000'
    ).replace(/\/$/, '');
    const logo =
      store.logoUrl && !store.logoUrl.startsWith('http')
        ? `${apiBase}/api/v1/stores/${store.slug}/logo`
        : store.logoUrl;

    return {
      id: store.id,
      slug: store.slug,
      name: store.name,
      phone: store.phone,
      logo_url: logo,
      governorate: store.governorate,
      wilayat: store.wilayat,
      area: store.area,
      address: store.address,
      is_active: store.isActive,
      created_at: store.createdAt.toISOString(),
      orders_count: store._count?.orders ?? 0,
      devices_count: store._count?.devices ?? 0,
      opening_hours: store.openingHours.map((h) => ({
        day_of_week: h.dayOfWeek,
        open_time: h.openTime,
        close_time: h.closeTime,
        is_closed: h.isClosed,
      })),
    };
  }
}

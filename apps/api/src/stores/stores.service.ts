import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@omsp/database';
import { PRISMA } from '../prisma/prisma.module';

@Injectable()
export class StoresService {
  constructor(@Inject(PRISMA) private readonly db: PrismaClient) {}

  async listPublic(query?: string) {
    const q = query?.trim();
    const stores = await this.db.store.findMany({
      where: {
        isActive: true,
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { slug: { contains: q, mode: 'insensitive' } },
                { governorate: { contains: q, mode: 'insensitive' } },
                { wilayat: { contains: q, mode: 'insensitive' } },
                { area: { contains: q, mode: 'insensitive' } },
                { address: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: {
        slug: true,
        name: true,
        logoUrl: true,
        governorate: true,
        wilayat: true,
        area: true,
        address: true,
        openingHours: { orderBy: { dayOfWeek: 'asc' } },
      },
      orderBy: { name: 'asc' },
      take: 100,
    });

    return {
      stores: stores.map((store) => ({
        slug: store.slug,
        name: store.name,
        logo_url: this.publicLogoUrl(store.slug, store.logoUrl),
        governorate: store.governorate,
        wilayat: store.wilayat,
        area: store.area,
        address: store.address,
        location_label: [store.area, store.wilayat, store.governorate]
          .filter(Boolean)
          .join('، ') || store.address || null,
        is_open: this.checkIfOpen(store.openingHours),
      })),
    };
  }

  async findBySlug(slug: string) {
    let store;
    try {
      // Explicit select avoids failing when newer optional store columns are not migrated yet.
      store = await this.db.store.findFirst({
        where: { slug, isActive: true },
        select: {
          id: true,
          slug: true,
          name: true,
          logoUrl: true,
          phone: true,
          governorate: true,
          wilayat: true,
          address: true,
          latitude: true,
          longitude: true,
          openingHours: { orderBy: { dayOfWeek: 'asc' } },
        },
      });
    } catch (err) {
      console.error('[stores.findBySlug] database error:', err);
      throw err;
    }

    if (!store) throw new NotFoundException('المكتبة غير موجودة');

    const isOpen = this.checkIfOpen(store.openingHours);

    return {
      id: store.id,
      slug: store.slug,
      name: store.name,
      logo_url: this.publicLogoUrl(store.slug, store.logoUrl),
      phone: store.phone,
      governorate: store.governorate,
      wilayat: store.wilayat,
      address: store.address,
      latitude: store.latitude,
      longitude: store.longitude,
      is_open: isOpen,
      opening_hours: store.openingHours.map((h) => ({
        day_of_week: h.dayOfWeek,
        open_time: h.openTime,
        close_time: h.closeTime,
        is_closed: h.isClosed,
      })),
    };
  }

  async getLogoKey(slug: string): Promise<string | null> {
    const store = await this.db.store.findFirst({
      where: { slug, isActive: true },
      select: { logoUrl: true },
    });
    if (!store?.logoUrl) return null;
    if (store.logoUrl.startsWith('http') || store.logoUrl.startsWith('data:')) return null;
    return store.logoUrl;
  }

  private publicLogoUrl(slug: string, logoUrl: string | null): string | null {
    if (!logoUrl) return null;
    if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://') || logoUrl.startsWith('data:')) {
      return logoUrl;
    }
    const base =
      process.env.PUBLIC_API_URL ??
      process.env.API_PUBLIC_URL ??
      process.env.API_URL ??
      process.env.RENDER_EXTERNAL_URL ??
      `http://localhost:${process.env.API_PORT ?? 4000}`;
    return `${base.replace(/\/+$/, '')}/api/v1/stores/${slug}/logo`;
  }

  async getOrderConfig(slug: string) {
    const store = await this.db.store.findFirst({
      where: { slug, isActive: true },
      include: {
        pricingRules: { where: { isActive: true } },
        finishingServices: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!store) throw new NotFoundException('المكتبة غير موجودة');

    let finishing = store.finishingServices;
    if (finishing.length === 0) {
      finishing = await this.ensureDefaultFinishingServices(store.id);
    }

    return {
      pricing: store.pricingRules.map((r) => ({
        paper_size: r.paperSize,
        color_mode: r.colorMode,
        price_per_page_baisa: r.pricePerPage,
      })),
      finishing_services: finishing.map((f) => ({
        id: f.id,
        name_ar: f.nameAr,
        price_baisa: f.priceBaisa,
      })),
    };
  }

  /** Seed common post-print services if the library has none (تدبيس / تجليد / تغليف حراري). */
  private async ensureDefaultFinishingServices(storeId: string) {
    const defaults = [
      { nameAr: 'تدبيس', priceBaisa: 100, sortOrder: 1 },
      { nameAr: 'تجليد', priceBaisa: 500, sortOrder: 2 },
      { nameAr: 'تغليف حراري', priceBaisa: 300, sortOrder: 3 },
    ];

    const existing = await this.db.finishingService.findMany({ where: { storeId } });
    if (existing.length === 0) {
      await this.db.finishingService.createMany({
        data: defaults.map((d) => ({ storeId, ...d, isActive: true })),
      });
    } else {
      // Reactivate inactive defaults so the web options reappear.
      const inactiveDefaults = existing.filter(
        (f) =>
          !f.isActive &&
          defaults.some((d) => d.nameAr === f.nameAr),
      );
      if (inactiveDefaults.length) {
        await this.db.finishingService.updateMany({
          where: { id: { in: inactiveDefaults.map((f) => f.id) } },
          data: { isActive: true },
        });
      }
    }

    return this.db.finishingService.findMany({
      where: { storeId, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  private checkIfOpen(
    hours: Array<{ dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean }>,
  ): boolean {
    // Always evaluate against Oman wall-clock time (API may run in UTC on Render).
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Muscat',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date());

    const weekday = parts.find((p) => p.type === 'weekday')?.value ?? '';
    const hour = parts.find((p) => p.type === 'hour')?.value ?? '00';
    const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';
    const currentTime = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;

    // Store hours use Oman week index: 0=Saturday … 6=Friday
    const weekdayToOmanDay: Record<string, number> = {
      Sat: 0,
      Sun: 1,
      Mon: 2,
      Tue: 3,
      Wed: 4,
      Thu: 5,
      Fri: 6,
    };
    const omanDay = weekdayToOmanDay[weekday];
    if (omanDay == null) return false;

    const today = hours.find((h) => h.dayOfWeek === omanDay);
    if (!today || today.isClosed) return false;

    return currentTime >= today.openTime && currentTime <= today.closeTime;
  }
}

import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@omsp/database';
import { PRISMA } from '../prisma/prisma.module';

@Injectable()
export class StoresService {
  constructor(@Inject(PRISMA) private readonly db: PrismaClient) {}

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

    return {
      pricing: store.pricingRules.map((r) => ({
        paper_size: r.paperSize,
        color_mode: r.colorMode,
        price_per_page_baisa: r.pricePerPage,
      })),
      finishing_services: store.finishingServices.map((f) => ({
        id: f.id,
        name_ar: f.nameAr,
        price_baisa: f.priceBaisa,
      })),
    };
  }

  private checkIfOpen(
    hours: Array<{ dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean }>,
  ): boolean {
    const now = new Date();
    // Oman week: 0=Saturday
    const jsDay = now.getDay();
    const omanDay = jsDay === 6 ? 0 : jsDay + 1;

    const today = hours.find((h) => h.dayOfWeek === omanDay);
    if (!today || today.isClosed) return false;

    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    return currentTime >= today.openTime && currentTime <= today.closeTime;
  }
}

import { createHash } from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEV_DEVICE_TOKEN = 'dev-al-noor-device-token-change-in-production';

async function main() {
  const store = await prisma.store.upsert({
    where: { slug: 'al-noor' },
    update: {
      name: 'مكتبة النور',
      phone: '+96891234567',
      governorate: 'مسقط',
      wilayat: 'بوشر',
      address: 'شارع السلطان قابوس',
      latitude: 23.5888,
      longitude: 58.4078,
    },
    create: {
      slug: 'al-noor',
      name: 'مكتبة النور',
      phone: '+96891234567',
      governorate: 'مسقط',
      wilayat: 'بوشر',
      address: 'شارع السلطان قابوس',
      latitude: 23.5888,
      longitude: 58.4078,
      orderNumberPrefix: '#',
      openingHours: {
        create: [
          { dayOfWeek: 0, openTime: '08:00', closeTime: '22:00' },
          { dayOfWeek: 1, openTime: '08:00', closeTime: '22:00' },
          { dayOfWeek: 2, openTime: '08:00', closeTime: '22:00' },
          { dayOfWeek: 3, openTime: '08:00', closeTime: '22:00' },
          { dayOfWeek: 4, openTime: '08:00', closeTime: '22:00' },
          { dayOfWeek: 5, openTime: '08:00', closeTime: '22:00' },
          { dayOfWeek: 6, openTime: '09:00', closeTime: '18:00' },
        ],
      },
      pricingRules: {
        create: [
          { paperSize: 'A4', colorMode: 'bw', pricePerPage: 20 },
          { paperSize: 'A4', colorMode: 'color', pricePerPage: 100 },
          { paperSize: 'A3', colorMode: 'bw', pricePerPage: 50 },
          { paperSize: 'A3', colorMode: 'color', pricePerPage: 200 },
        ],
      },
      finishingServices: {
        create: [
          { nameAr: 'تدبيس', priceBaisa: 100, sortOrder: 1 },
          { nameAr: 'تجليد', priceBaisa: 500, sortOrder: 2 },
          { nameAr: 'تغليف حراري', priceBaisa: 300, sortOrder: 3 },
        ],
      },
    },
  });

  const tokenHash = createHash('sha256').update(DEV_DEVICE_TOKEN).digest('hex');

  await prisma.device.upsert({
    where: { tokenHash },
    update: { name: 'جهاز الكاونتر (تطوير)' },
    create: {
      storeId: store.id,
      name: 'جهاز الكاونتر (تطوير)',
      tokenHash,
      status: 'disconnected',
    },
  });

  console.log(`Seeded store: ${store.name} (${store.slug})`);
  console.log(`Dev device token: ${DEV_DEVICE_TOKEN}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

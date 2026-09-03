import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'crypto';
import { PrismaClient } from '@omsp/database';
import { isValidPhone, normalizePhone } from '@omsp/shared';
import { PRISMA } from '../prisma/prisma.module';
import { hashPassword, hashSha256, verifyPassword } from '../common/password';
import { generateDeviceToken, hashDeviceToken } from '../websocket/shop.gateway';
import { StorageService } from '../storage/storage.service';

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const SETUP_TOKEN_TTL_MS = 2 * 60 * 60 * 1000;

/** Safe store projection for owner session / onboarding checks. */
const STORE_OWNER_SELECT = {
  id: true,
  slug: true,
  name: true,
  phone: true,
  logoUrl: true,
  governorate: true,
  wilayat: true,
  area: true,
  address: true,
  latitude: true,
  longitude: true,
  deviceConfirmPhone: true,
  devicePasswordHash: true,
  onboardingCompletedAt: true,
} as const;

function slugify(input: string): string {
  const base = input
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return base || `store-${randomBytes(3).toString('hex')}`;
}

@Injectable()
export class LibraryService {
  constructor(
    @Inject(PRISMA) private readonly db: PrismaClient,
    private readonly storage: StorageService,
  ) {}

  async unlockSetup(password: string) {
    const expected = process.env.LIBRARY_SETUP_PASSWORD ?? '';
    if (!expected || password !== expected) {
      throw new UnauthorizedException('كلمة مرور الإعداد غير صحيحة');
    }
    const token = this.issueSetupToken();
    return {
      setup_token: token,
      expires_in_seconds: Math.floor(SETUP_TOKEN_TTL_MS / 1000),
      message: 'تم التحقق. يمكنك الآن إعداد المكتبة',
    };
  }

  async register(input: {
    setup_token: string;
    email: string;
    password: string;
    owner_name: string;
    store_name: string;
    store_slug?: string;
    phone?: string;
  }) {
    this.assertSetupToken(input.setup_token);

    const email = input.email.trim().toLowerCase();
    if (!email.includes('@')) throw new BadRequestException('البريد الإلكتروني غير صالح');
    if ((input.password ?? '').length < 8) {
      throw new BadRequestException('كلمة مرور حساب الإدارة يجب أن تكون 8 أحرف على الأقل');
    }
    if (!(input.store_name ?? '').trim()) throw new BadRequestException('اسم المكتبة مطلوب');

    try {
      const existing = await this.db.user.findUnique({ where: { email } });
      if (existing) throw new BadRequestException('هذا البريد مسجّل مسبقاً');

      let slug = slugify(input.store_slug || input.store_name);
      const slugTaken = await this.db.store.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (slugTaken) slug = `${slug}-${randomBytes(2).toString('hex')}`;

      const phone = input.phone ? this.requirePhone(input.phone) : null;

      const user = await this.db.user.create({
        data: {
          email,
          passwordHash: hashPassword(input.password),
          name: input.owner_name.trim() || 'مالك المكتبة',
          phone,
          storeUsers: {
            create: {
              role: 'owner',
              store: {
                create: {
                  slug,
                  name: input.store_name.trim(),
                  phone,
                  openingHours: {
                    create: [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
                      dayOfWeek,
                      openTime: dayOfWeek === 6 ? '09:00' : '08:00',
                      closeTime: dayOfWeek === 6 ? '18:00' : '22:00',
                      isClosed: false,
                    })),
                  },
                  pricingRules: {
                    create: [
                      { paperSize: 'A4', colorMode: 'bw', pricePerPage: 20 },
                      { paperSize: 'A4', colorMode: 'color', pricePerPage: 100 },
                      { paperSize: 'A3', colorMode: 'bw', pricePerPage: 50 },
                      { paperSize: 'A3', colorMode: 'color', pricePerPage: 200 },
                    ],
                  },
                },
              },
            },
          },
        },
        select: {
          id: true,
          email: true,
          name: true,
          storeUsers: {
            take: 1,
            select: {
              store: {
                select: STORE_OWNER_SELECT,
              },
            },
          },
        },
      });

      const storeUser = user.storeUsers[0];
      if (!storeUser) throw new BadRequestException('فشل إنشاء المكتبة');

      const session = await this.createSession(user.id);
      const store = this.withStoreDefaults(storeUser.store);

      return {
        token: session.token,
        expires_at: session.expiresAt.toISOString(),
        user: { id: user.id, email: user.email, name: user.name },
        store: this.mapStore(store),
        onboarding_complete: false,
      };
    } catch (err) {
      if (err instanceof BadRequestException || err instanceof UnauthorizedException) throw err;
      console.error('[library.register] database error:', err);
      const msg = err instanceof Error ? err.message : '';
      if (/owner_sessions|device_password|onboarding_completed|does not exist|P2021|P2022/i.test(msg)) {
        throw new BadRequestException(
          'قاعدة البيانات تحتاج تحديثاً. من Render Shell على omsp-api شغّل: npm run db:push:prod',
        );
      }
      throw new BadRequestException('تعذر إنشاء الحساب. تحقق من قاعدة البيانات وحاول مجدداً');
    }
  }

  async login(emailRaw: string, password: string) {
    const email = emailRaw.trim().toLowerCase();
    const user = await this.db.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        isActive: true,
        storeUsers: {
          where: { role: { in: ['owner', 'manager'] } },
          take: 1,
          select: {
            store: {
              select: STORE_OWNER_SELECT,
            },
          },
        },
      },
    });

    if (!user || !user.isActive || !verifyPassword(password, user.passwordHash)) {
      throw new UnauthorizedException('البريد أو كلمة المرور غير صحيحة');
    }

    const storeUser = user.storeUsers[0];
    if (!storeUser) throw new ForbiddenException('لا توجد مكتبة مرتبطة بهذا الحساب');

    const session = await this.createSession(user.id);
    const store = this.withStoreDefaults(storeUser.store);
    return {
      token: session.token,
      expires_at: session.expiresAt.toISOString(),
      user: { id: user.id, email: user.email, name: user.name },
      store: this.mapStore(store),
      onboarding_complete: !!store.onboardingCompletedAt,
    };
  }

  async logout(token: string | undefined) {
    if (!token) return { ok: true };
    if (token.startsWith('own1.')) return { ok: true };
    try {
      await this.db.ownerSession.deleteMany({ where: { tokenHash: hashSha256(token) } });
    } catch (err) {
      console.error('[library.logout] session cleanup failed:', err);
    }
    return { ok: true };
  }

  async resolveSession(token: string | undefined) {
    if (!token) throw new UnauthorizedException('يجب تسجيل الدخول');

    if (token.startsWith('own1.')) {
      return this.resolveSignedSession(token);
    }

    let session;
    try {
      session = await this.db.ownerSession.findUnique({
        where: { tokenHash: hashSha256(token) },
        select: {
          id: true,
          expiresAt: true,
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              phone: true,
              isActive: true,
              storeUsers: {
                where: { role: { in: ['owner', 'manager'] } },
                take: 1,
                select: {
                  role: true,
                  store: {
                    select: STORE_OWNER_SELECT,
                  },
                },
              },
            },
          },
        },
      });
    } catch (err) {
      console.error('[library.resolveSession] database error:', err);
      throw new BadRequestException(
        'قاعدة البيانات تحتاج تحديثاً. من Render Shell على omsp-api شغّل: npm run db:push:prod',
      );
    }

    if (!session || session.expiresAt.getTime() < Date.now()) {
      if (session) {
        await this.db.ownerSession.delete({ where: { id: session.id } }).catch(() => {});
      }
      throw new UnauthorizedException('انتهت الجلسة. سجّل الدخول مجدداً');
    }

    const storeUser = session.user.storeUsers[0];
    if (!storeUser) throw new ForbiddenException('لا توجد مكتبة مرتبطة بهذا الحساب');

    return {
      user: session.user,
      store: this.withStoreDefaults(storeUser.store),
      role: storeUser.role,
    };
  }

  async me(token: string | undefined) {
    const { user, store, role } = await this.resolveSession(token);
    return {
      user: { id: user.id, email: user.email, name: user.name, phone: user.phone },
      role,
      store: this.mapStore(store),
      onboarding_complete: !!store.onboardingCompletedAt,
      onboarding: this.onboardingStatus(store),
    };
  }

  async updateStore(
    token: string | undefined,
    body: {
      name?: string;
      phone?: string;
      governorate?: string;
      wilayat?: string;
      area?: string;
      address?: string;
      latitude?: number | null;
      longitude?: number | null;
    },
  ) {
    const { store } = await this.resolveSession(token);

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name.trim();
    if (body.phone !== undefined) data.phone = body.phone ? this.requirePhone(body.phone) : null;
    if (body.governorate !== undefined) data.governorate = body.governorate.trim() || null;
    if (body.wilayat !== undefined) data.wilayat = body.wilayat.trim() || null;
    if (body.area !== undefined) data.area = body.area.trim() || null;
    if (body.address !== undefined) data.address = body.address.trim() || null;
    if (body.latitude !== undefined) data.latitude = body.latitude;
    if (body.longitude !== undefined) data.longitude = body.longitude;

    let updated;
    try {
      updated = await this.db.store.update({
        where: { id: store.id },
        data,
        select: STORE_OWNER_SELECT,
      });
    } catch (err) {
      console.error('[library.updateStore] database error:', err);
      const msg = err instanceof Error ? err.message : '';
      if (data.area !== undefined && /area|P2022|does not exist/i.test(msg)) {
        delete data.area;
        updated = await this.db.store.update({
          where: { id: store.id },
          data,
          select: STORE_OWNER_SELECT,
        });
      } else {
        throw new BadRequestException(
          'قاعدة البيانات تحتاج تحديثاً. من Render Shell على omsp-api شغّل: npm run db:push:prod',
        );
      }
    }
    const mapped = this.withStoreDefaults(updated);
    return { store: this.mapStore(mapped), onboarding: this.onboardingStatus(mapped) };
  }

  async setDeviceSecurity(
    token: string | undefined,
    body: { device_password: string; device_confirm_phone: string },
  ) {
    const { store } = await this.resolveSession(token);
    if ((body.device_password ?? '').length < 6) {
      throw new BadRequestException('كلمة مرور الجهاز يجب أن تكون 6 أحرف على الأقل');
    }
    const phone = this.requirePhone(body.device_confirm_phone);

    let updated;
    try {
      updated = await this.db.store.update({
        where: { id: store.id },
        data: {
          devicePasswordHash: hashPassword(body.device_password),
          deviceConfirmPhone: phone,
        },
        select: STORE_OWNER_SELECT,
      });
    } catch (err) {
      console.error('[library.setDeviceSecurity] database error:', err);
      throw new BadRequestException(
        'قاعدة البيانات تحتاج تحديثاً. من Render Shell على omsp-api شغّل: npm run db:push:prod',
      );
    }

    const mapped = this.withStoreDefaults(updated);
    return {
      ok: true,
      store: this.mapStore(mapped),
      onboarding: this.onboardingStatus(mapped),
      message: 'تم حفظ كلمة مرور الجهاز ورقم التأكيد',
    };
  }

  async uploadLogo(token: string | undefined, file: Express.Multer.File | undefined) {
    const { store } = await this.resolveSession(token);
    if (!file?.buffer?.length) throw new BadRequestException('لم يتم رفع الشعار');

    const mime = file.mimetype || '';
    if (!/^image\/(png|jpe?g|webp|gif)$/i.test(mime)) {
      throw new BadRequestException('الشعار يجب أن يكون صورة (PNG / JPG / WebP)');
    }
    if (file.size > 2 * 1024 * 1024) {
      throw new BadRequestException('حجم الشعار كبير. الحد 2 ميغابايت');
    }

    const ext =
      mime.includes('png') ? '.png' : mime.includes('webp') ? '.webp' : mime.includes('gif') ? '.gif' : '.jpg';
    const key = `logos/${store.id}${ext}`;
    await this.storage.saveFile(key, file.buffer);

    const updated = await this.db.store.update({
      where: { id: store.id },
      data: { logoUrl: key },
      select: STORE_OWNER_SELECT,
    });

    const mapped = this.withStoreDefaults(updated);
    return {
      store: this.mapStore(mapped),
      onboarding: this.onboardingStatus(mapped),
      logo_url: this.publicLogoUrl({ slug: updated.slug, logoUrl: updated.logoUrl }),
    };
  }

  async completeOnboarding(token: string | undefined) {
    const { store } = await this.resolveSession(token);
    const status = this.onboardingStatus(store);
    if (!status.profile_ready || !status.location_ready || !status.device_security_ready) {
      throw new BadRequestException('أكمل بيانات المكتبة والموقع وأمان الجهاز أولاً');
    }

    const updated = await this.db.store.update({
      where: { id: store.id },
      data: { onboardingCompletedAt: new Date() },
      select: STORE_OWNER_SELECT,
    });

    return { ok: true, store: this.mapStore(this.withStoreDefaults(updated)), onboarding_complete: true };
  }

  async listDevices(token: string | undefined) {
    const { store } = await this.resolveSession(token);
    const devices = await this.db.device.findMany({
      where: { storeId: store.id },
      orderBy: { createdAt: 'desc' },
    });

    return {
      devices: devices.map((d) => ({
        id: d.id,
        name: d.name,
        status: d.status,
        last_connected_at: d.lastConnectedAt?.toISOString() ?? null,
        created_at: d.createdAt.toISOString(),
        app_version: d.appVersion,
        os_version: d.osVersion,
      })),
    };
  }

  async createDevice(token: string | undefined, name: string) {
    const { store } = await this.resolveSession(token);
    if (!store.devicePasswordHash || !store.deviceConfirmPhone) {
      throw new BadRequestException('اضبط كلمة مرور الجهاز ورقم التأكيد أولاً');
    }
    const deviceName = (name ?? '').trim() || 'جهاز الكاونتر';
    const deviceToken = generateDeviceToken();
    const device = await this.db.device.create({
      data: {
        storeId: store.id,
        name: deviceName,
        tokenHash: hashDeviceToken(deviceToken),
        status: 'disconnected',
      },
    });

    return {
      device: {
        id: device.id,
        name: device.name,
        status: device.status,
        created_at: device.createdAt.toISOString(),
      },
      device_token: deviceToken,
      message: 'احفظ الرمز الآن — لن يظهر مرة أخرى. أو اربط الجهاز بكلمة المرور ورمز SMS.',
    };
  }

  async revokeDevice(token: string | undefined, deviceId: string) {
    const { store } = await this.resolveSession(token);
    const device = await this.db.device.findFirst({ where: { id: deviceId, storeId: store.id } });
    if (!device) throw new NotFoundException('الجهاز غير موجود');

    await this.db.device.update({
      where: { id: device.id },
      data: { status: 'revoked' },
    });

    return { ok: true };
  }

  async rotateDevice(token: string | undefined, deviceId: string) {
    const { store } = await this.resolveSession(token);
    const device = await this.db.device.findFirst({ where: { id: deviceId, storeId: store.id } });
    if (!device) throw new NotFoundException('الجهاز غير موجود');

    const deviceToken = generateDeviceToken();
    await this.db.device.update({
      where: { id: device.id },
      data: {
        tokenHash: hashDeviceToken(deviceToken),
        status: 'disconnected',
      },
    });

    return {
      device_id: device.id,
      device_token: deviceToken,
      message: 'رمز جديد — حدّثه في تطبيق سطح المكتب',
    };
  }

  /** Public: start pairing from desktop with store device password. */
  async startPairing(storeSlug: string, devicePassword: string, deviceName: string) {
    const store = await this.db.store.findFirst({
      where: { slug: storeSlug.trim(), isActive: true },
    });
    if (!store) throw new NotFoundException('المكتبة غير موجودة');
    if (!store.devicePasswordHash || !store.deviceConfirmPhone) {
      throw new BadRequestException('المكتبة لم تُكمل إعداد أمان الجهاز من لوحة الويب');
    }
    if (!verifyPassword(devicePassword, store.devicePasswordHash)) {
      throw new UnauthorizedException('كلمة مرور الجهاز غير صحيحة');
    }

    const name = (deviceName ?? '').trim() || 'جهاز الكاونتر';
    await this.db.devicePairingChallenge.updateMany({
      where: { storeId: store.id, consumed: false },
      data: { consumed: true },
    });

    const code = String(randomInt(100000, 999999));
    const challenge = await this.db.devicePairingChallenge.create({
      data: {
        storeId: store.id,
        deviceName: name,
        codeHash: hashSha256(code),
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
      },
    });

    const message = `رمز ربط جهاز المكتبة: ${code} (صالح 5 دقائق)`;
    console.log(`[SMS mock] Device pairing to ${store.deviceConfirmPhone}: ${message}`);

    const smsProvider = (process.env.SMS_PROVIDER ?? 'mock').toLowerCase();
    const exposeCode =
      smsProvider === 'mock' ||
      process.env.NODE_ENV !== 'production' ||
      process.env.OTP_DEV_EXPOSE === 'true';

    const response: {
      challenge_id: string;
      phone_hint: string;
      expires_in_seconds: number;
      message: string;
      dev_code?: string;
    } = {
      challenge_id: challenge.id,
      phone_hint: this.maskPhone(store.deviceConfirmPhone),
      expires_in_seconds: Math.floor(OTP_TTL_MS / 1000),
      message: 'تم إرسال رمز التأكيد إلى رقم هاتف المكتبة المسجّل في الموقع',
    };

    if (exposeCode) {
      response.dev_code = code;
    }

    return response;
  }

  async confirmPairing(challengeId: string, codeRaw: string) {
    const code = (codeRaw ?? '').trim();
    if (!/^\d{4,6}$/.test(code)) throw new BadRequestException('رمز التحقق غير صالح');

    const challenge = await this.db.devicePairingChallenge.findUnique({
      where: { id: challengeId },
      include: { store: true },
    });

    if (!challenge || challenge.consumed) {
      throw new BadRequestException('انتهت صلاحية الطلب. أعد المحاولة');
    }
    if (challenge.expiresAt.getTime() < Date.now()) {
      await this.db.devicePairingChallenge.update({
        where: { id: challenge.id },
        data: { consumed: true },
      });
      throw new BadRequestException('انتهت صلاحية الرمز. أعد المحاولة');
    }
    if (challenge.attempts >= MAX_OTP_ATTEMPTS) {
      await this.db.devicePairingChallenge.update({
        where: { id: challenge.id },
        data: { consumed: true },
      });
      throw new BadRequestException('محاولات كثيرة. أعد طلب الرمز');
    }

    if (challenge.codeHash !== hashSha256(code)) {
      await this.db.devicePairingChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('رمز التحقق غير صحيح');
    }

    await this.db.devicePairingChallenge.update({
      where: { id: challenge.id },
      data: { consumed: true },
    });

    const deviceToken = generateDeviceToken();
    const device = await this.db.device.create({
      data: {
        storeId: challenge.storeId,
        name: challenge.deviceName,
        tokenHash: hashDeviceToken(deviceToken),
        status: 'disconnected',
      },
    });

    const apiBase = (process.env.API_URL ?? process.env.RENDER_EXTERNAL_URL ?? 'http://localhost:4000')
      .replace(/\/$/, '');
    const wsUrl = apiBase.replace(/^http/, 'ws') + '/ws/shop';

    return {
      device_id: device.id,
      device_token: deviceToken,
      store_slug: challenge.store.slug,
      store_name: challenge.store.name,
      ws_url: wsUrl,
    };
  }

  private async createSession(userId: string) {
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    const token = randomBytes(32).toString('hex');
    try {
      await this.db.ownerSession.create({
        data: { userId, tokenHash: hashSha256(token), expiresAt },
      });
      return { token, expiresAt };
    } catch (err) {
      console.error('[library.createSession] falling back to signed token:', err);
      return {
        token: this.issueSignedSessionToken(userId, expiresAt),
        expiresAt,
      };
    }
  }

  private issueSignedSessionToken(userId: string, expiresAt: Date): string {
    const exp = expiresAt.getTime();
    const payload = `${userId}.${exp}`;
    const sig = createHmac('sha256', this.setupHmacSecret()).update(`own:${payload}`).digest('hex');
    return `own1.${payload}.${sig}`;
  }

  private async resolveSignedSession(token: string) {
    const parts = token.split('.');
    if (parts.length !== 4 || parts[0] !== 'own1') {
      throw new UnauthorizedException('انتهت الجلسة. سجّل الدخول مجدداً');
    }
    const [, userId, expStr, sig] = parts;
    const payload = `${userId}.${expStr}`;
    const expected = createHmac('sha256', this.setupHmacSecret()).update(`own:${payload}`).digest('hex');
    try {
      const a = Buffer.from(sig, 'hex');
      const b = Buffer.from(expected, 'hex');
      if (a.length !== b.length || !timingSafeEqual(a, b)) {
        throw new UnauthorizedException('انتهت الجلسة. سجّل الدخول مجدداً');
      }
    } catch {
      throw new UnauthorizedException('انتهت الجلسة. سجّل الدخول مجدداً');
    }
    const exp = Number(expStr);
    if (!Number.isFinite(exp) || exp < Date.now()) {
      throw new UnauthorizedException('انتهت الجلسة. سجّل الدخول مجدداً');
    }

    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        isActive: true,
        storeUsers: {
          where: { role: { in: ['owner', 'manager'] } },
          take: 1,
          select: {
            role: true,
            store: {
              select: STORE_OWNER_SELECT,
            },
          },
        },
      },
    });

    if (!user || !user.isActive) throw new UnauthorizedException('انتهت الجلسة. سجّل الدخول مجدداً');
    const storeUser = user.storeUsers[0];
    if (!storeUser) throw new ForbiddenException('لا توجد مكتبة مرتبطة بهذا الحساب');

    return {
      user,
      store: this.withStoreDefaults(storeUser.store),
      role: storeUser.role,
    };
  }

  private withStoreDefaults<T extends Record<string, unknown>>(store: T) {
    return {
      area: null as string | null,
      deviceConfirmPhone: null as string | null,
      devicePasswordHash: null as string | null,
      onboardingCompletedAt: null as Date | null,
      ...store,
    };
  }

  private setupHmacSecret(): string {
    return process.env.JWT_SECRET ?? process.env.LIBRARY_SETUP_PASSWORD ?? 'dev-setup-secret';
  }

  private issueSetupToken(): string {
    const exp = Date.now() + SETUP_TOKEN_TTL_MS;
    const nonce = randomBytes(12).toString('hex');
    const payload = `${exp}.${nonce}`;
    const sig = createHmac('sha256', this.setupHmacSecret()).update(`setup:${payload}`).digest('hex');
    return `${payload}.${sig}`;
  }

  private assertSetupToken(token: string | undefined) {
    if (!token) throw new UnauthorizedException('يلزم كلمة مرور إعداد المنصة أولاً');
    const parts = token.split('.');
    if (parts.length !== 3) throw new UnauthorizedException('جلسة الإعداد غير صالحة');
    const [expStr, nonce, sig] = parts;
    const payload = `${expStr}.${nonce}`;
    const expected = createHmac('sha256', this.setupHmacSecret()).update(`setup:${payload}`).digest('hex');
    try {
      const a = Buffer.from(sig, 'hex');
      const b = Buffer.from(expected, 'hex');
      if (a.length !== b.length || !timingSafeEqual(a, b)) {
        throw new UnauthorizedException('جلسة الإعداد غير صالحة');
      }
    } catch {
      throw new UnauthorizedException('جلسة الإعداد غير صالحة');
    }
    const exp = Number(expStr);
    if (!Number.isFinite(exp) || exp < Date.now()) {
      throw new UnauthorizedException('انتهت جلسة الإعداد. أدخل كلمة مرور الإعداد مجدداً');
    }
  }

  private onboardingStatus(store: {
    name: string;
    governorate: string | null;
    wilayat: string | null;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    devicePasswordHash: string | null;
    deviceConfirmPhone: string | null;
    onboardingCompletedAt: Date | null;
  }) {
    const profile_ready = !!store.name?.trim();
    const location_ready = !!(
      store.governorate &&
      store.wilayat &&
      (store.address || (store.latitude != null && store.longitude != null))
    );
    const device_security_ready = !!(store.devicePasswordHash && store.deviceConfirmPhone);
    return {
      profile_ready,
      location_ready,
      device_security_ready,
      completed: !!store.onboardingCompletedAt,
      next_step: !profile_ready
        ? 'profile'
        : !location_ready
          ? 'location'
          : !device_security_ready
            ? 'device'
            : store.onboardingCompletedAt
              ? 'done'
              : 'review',
    };
  }

  private mapStore(store: {
    id: string;
    slug: string;
    name: string;
    phone: string | null;
    logoUrl?: string | null;
    governorate: string | null;
    wilayat: string | null;
    area: string | null;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    deviceConfirmPhone: string | null;
    devicePasswordHash: string | null;
    onboardingCompletedAt: Date | null;
  }) {
    return {
      id: store.id,
      slug: store.slug,
      name: store.name,
      phone: store.phone,
      governorate: store.governorate,
      wilayat: store.wilayat,
      area: store.area,
      address: store.address,
      latitude: store.latitude,
      longitude: store.longitude,
      device_confirm_phone: store.deviceConfirmPhone,
      has_device_password: !!store.devicePasswordHash,
      onboarding_completed_at: store.onboardingCompletedAt?.toISOString() ?? null,
      customer_shop_path: `/${store.slug}`,
      logo_url: this.publicLogoUrl({ slug: store.slug, logoUrl: store.logoUrl ?? null }),
    };
  }

  private publicApiBase(): string {
    const base =
      process.env.PUBLIC_API_URL ??
      process.env.API_PUBLIC_URL ??
      process.env.API_URL ??
      process.env.RENDER_EXTERNAL_URL ??
      `http://localhost:${process.env.API_PORT ?? 4000}`;
    return base.replace(/\/+$/, '');
  }

  private publicLogoUrl(store: { slug: string; logoUrl: string | null }): string | null {
    if (!store.logoUrl) return null;
    if (store.logoUrl.startsWith('http://') || store.logoUrl.startsWith('https://') || store.logoUrl.startsWith('data:')) {
      return store.logoUrl;
    }
    return `${this.publicApiBase()}/api/v1/stores/${store.slug}/logo`;
  }

  private requirePhone(phoneRaw: string): string {
    if (!isValidPhone(phoneRaw)) {
      throw new BadRequestException('رقم الهاتف غير صالح');
    }
    return normalizePhone(phoneRaw)!;
  }

  private maskPhone(phone: string): string {
    if (phone.length < 6) return '****';
    return `${phone.slice(0, 4)}****${phone.slice(-2)}`;
  }
}

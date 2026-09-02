import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes, randomInt } from 'crypto';
import { PrismaClient } from '@omsp/database';
import { formatOMR, isValidOmaniPhone, normalizeOmaniPhone } from '@omsp/shared';
import { PRISMA } from '../prisma/prisma.module';

const OTP_TTL_MS = 5 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  constructor(@Inject(PRISMA) private readonly db: PrismaClient) {}

  async requestOtp(phoneRaw: string) {
    const phone = this.requirePhone(phoneRaw);

    await this.db.customerOtp.updateMany({
      where: { phone, consumed: false },
      data: { consumed: true },
    });

    const code = String(randomInt(100000, 999999));
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    await this.db.customerOtp.create({
      data: {
        phone,
        codeHash: this.hash(code),
        expiresAt,
      },
    });

    const message = `رمز الدخول لمنصة الطباعة: ${code} (صالح 5 دقائق)`;
    console.log(`[SMS mock] To ${phone}: ${message}`);

    const response: {
      ok: true;
      phone: string;
      expires_in_seconds: number;
      message: string;
      dev_code?: string;
    } = {
      ok: true,
      phone,
      expires_in_seconds: Math.floor(OTP_TTL_MS / 1000),
      message: 'تم إرسال رمز التحقق إلى رقم هاتفك',
    };

    if (process.env.NODE_ENV !== 'production' || process.env.OTP_DEV_EXPOSE === 'true') {
      response.dev_code = code;
    }

    return response;
  }

  async verifyOtp(phoneRaw: string, codeRaw: string) {
    const phone = this.requirePhone(phoneRaw);
    const code = (codeRaw ?? '').trim();
    if (!/^\d{4,6}$/.test(code)) {
      throw new BadRequestException('رمز التحقق غير صالح');
    }

    const otp = await this.db.customerOtp.findFirst({
      where: { phone, consumed: false },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp || otp.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('انتهت صلاحية الرمز. اطلب رمزاً جديداً');
    }

    if (otp.attempts >= MAX_ATTEMPTS) {
      await this.db.customerOtp.update({ where: { id: otp.id }, data: { consumed: true } });
      throw new BadRequestException('محاولات كثيرة. اطلب رمزاً جديداً');
    }

    if (otp.codeHash !== this.hash(code)) {
      await this.db.customerOtp.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('رمز التحقق غير صحيح');
    }

    await this.db.customerOtp.update({ where: { id: otp.id }, data: { consumed: true } });

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    await this.db.customerSession.create({
      data: {
        phone,
        tokenHash: this.hash(token),
        expiresAt,
      },
    });

    return {
      token,
      phone,
      expires_at: expiresAt.toISOString(),
    };
  }

  async logout(token: string | undefined) {
    if (!token) return { ok: true };
    await this.db.customerSession.deleteMany({ where: { tokenHash: this.hash(token) } });
    return { ok: true };
  }

  async resolveSession(token: string | undefined): Promise<{ phone: string }> {
    if (!token) throw new UnauthorizedException('يجب تسجيل الدخول');

    const session = await this.db.customerSession.findUnique({
      where: { tokenHash: this.hash(token) },
    });

    if (!session || session.expiresAt.getTime() < Date.now()) {
      if (session) {
        await this.db.customerSession.delete({ where: { id: session.id } }).catch(() => {});
      }
      throw new UnauthorizedException('انتهت الجلسة. سجّل الدخول مجدداً');
    }

    return { phone: session.phone };
  }

  async listOrdersForPhone(phone: string, storeSlug: string) {
    const store = await this.db.store.findUnique({ where: { slug: storeSlug, isActive: true } });
    if (!store) throw new NotFoundException('المكتبة غير موجودة');

    const orders = await this.db.order.findMany({
      where: {
        storeId: store.id,
        customerPhone: phone,
        status: { not: 'draft' },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        items: { select: { originalFilename: true, copies: true } },
      },
    });

    return {
      phone,
      store_slug: store.slug,
      store_name: store.name,
      orders: orders.map((o) => ({
        order_number: o.displayNumber,
        status: o.status,
        payment_status: o.paymentStatus,
        total_display: formatOMR(o.totalBaisa),
        tracking_token: o.trackingToken,
        created_at: o.createdAt.toISOString(),
        items_count: o.items.length,
        files: o.items.map((i) => i.originalFilename),
      })),
    };
  }

  private requirePhone(phoneRaw: string): string {
    if (!isValidOmaniPhone(phoneRaw)) {
      throw new BadRequestException('رقم الهاتف غير صالح. استخدم رقم عماني صحيح');
    }
    return normalizeOmaniPhone(phoneRaw)!;
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
}

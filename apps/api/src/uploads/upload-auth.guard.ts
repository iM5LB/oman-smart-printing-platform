import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { UploadsService } from './uploads.service';

/**
 * Accepts either a customer session Bearer token, or a short-lived upload ticket
 * issued by POST /stores/:slug/upload-sessions.
 */
@Injectable()
export class UploadAuthGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly uploads: UploadsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      params: { slug?: string };
      customer?: { phone: string };
      uploadStoreId?: string;
    }>();

    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!token) {
      throw new UnauthorizedException('يجب تسجيل الدخول أو الحصول على إذن رفع');
    }

    const slug = req.params.slug ?? '';
    if (!slug) throw new UnauthorizedException('المكتبة غير محددة');

    // Prefer customer session when present
    try {
      req.customer = await this.auth.resolveSession(token);
      return true;
    } catch {
      /* fall through to upload ticket */
    }

    const storeId = this.uploads.verifyUploadTicket(token, slug);
    if (!storeId) {
      throw new UnauthorizedException('إذن الرفع منتهٍ أو غير صالح');
    }
    req.uploadStoreId = storeId;
    return true;
  }
}

import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaClient } from '@omsp/database';
import { PRISMA } from '../prisma/prisma.module';

export const DEVICE_STORE_KEY = 'deviceStore';

@Injectable()
export class DeviceAuthGuard implements CanActivate {
  constructor(@Inject(PRISMA) private readonly db: PrismaClient) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers['x-device-token'] as string;
    if (!token) throw new UnauthorizedException('رمز الجهاز مطلوب');

    const tokenHash = createHash('sha256').update(token).digest('hex');
    const device = await this.db.device.findUnique({
      where: { tokenHash },
      include: { store: true },
    });

    if (!device || device.status === 'revoked') {
      throw new UnauthorizedException('رمز الجهاز غير صالح');
    }

    request[DEVICE_STORE_KEY] = { device, store: device.store };
    return true;
  }
}

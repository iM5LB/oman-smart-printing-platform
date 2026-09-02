import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { LibraryService } from './library.service';

export const LIBRARY_OWNER_KEY = 'libraryOwner';

@Injectable()
export class LibraryAuthGuard implements CanActivate {
  constructor(private readonly library: LibraryService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authorization = request.headers['authorization'] as string | undefined;
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice(7).trim()
      : undefined;

    try {
      const session = await this.library.resolveSession(token);
      request[LIBRARY_OWNER_KEY] = session;
      return true;
    } catch {
      throw new UnauthorizedException('يجب تسجيل الدخول');
    }
  }
}

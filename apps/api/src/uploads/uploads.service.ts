import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { PrismaClient } from '@omsp/database';
import { decodeMultipartFilename } from '@omsp/shared';
import { ALLOWED_EXTENSIONS, DEFAULT_MAX_FILE_SIZE_BYTES } from '@omsp/types';
import { PRISMA } from '../prisma/prisma.module';
import { StorageService } from '../storage/storage.service';

const UPLOAD_TICKET_TTL_MS = 15 * 60 * 1000;

@Injectable()
export class UploadsService {
  private readonly secret: string;

  constructor(
    @Inject(PRISMA) private readonly db: PrismaClient,
    private readonly storage: StorageService,
  ) {
    this.secret = process.env.JWT_SECRET ?? 'dev-secret';
  }

  /** Short-lived ticket so guests can upload without a full customer session. */
  async createUploadSession(storeSlug: string): Promise<{
    upload_token: string;
    expires_in_seconds: number;
  }> {
    const store = await this.db.store.findFirst({ where: { slug: storeSlug, isActive: true } });
    if (!store) throw new NotFoundException('المكتبة غير موجودة');

    const expiresAt = Date.now() + UPLOAD_TICKET_TTL_MS;
    const payload = `upload:${store.id}:${store.slug}:${expiresAt}`;
    const sig = createHmac('sha256', this.secret).update(payload).digest('hex');
    const upload_token = Buffer.from(`${payload}:${sig}`).toString('base64url');

    return {
      upload_token,
      expires_in_seconds: Math.floor(UPLOAD_TICKET_TTL_MS / 1000),
    };
  }

  /** Returns storeId when valid for this slug; otherwise null. */
  verifyUploadTicket(token: string, expectedSlug: string): string | null {
    try {
      const decoded = Buffer.from(token, 'base64url').toString('utf8');
      const lastColon = decoded.lastIndexOf(':');
      if (lastColon === -1) return null;
      const sig = decoded.slice(lastColon + 1);
      const payload = decoded.slice(0, lastColon);
      const expected = createHmac('sha256', this.secret).update(payload).digest('hex');
      const a = Buffer.from(sig, 'utf8');
      const b = Buffer.from(expected, 'utf8');
      if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

      const parts = payload.split(':');
      if (parts.length !== 4 || parts[0] !== 'upload') return null;
      const [, storeId, slug, expiresAtStr] = parts;
      if (!storeId || slug !== expectedSlug || !expiresAtStr) return null;
      if (Date.now() > parseInt(expiresAtStr, 10)) return null;
      return storeId;
    } catch {
      return null;
    }
  }

  async uploadFile(
    storeSlug: string,
    file: Express.Multer.File,
  ): Promise<{
    file_key: string;
    original_filename: string;
    mime_type: string;
    file_size_bytes: number;
    page_count: number;
  }> {
    const store = await this.db.store.findFirst({ where: { slug: storeSlug, isActive: true } });
    if (!store) throw new NotFoundException('المكتبة غير موجودة');

    this.validateFile(file);

    const originalFilename = decodeMultipartFilename(file.originalname);
    const fileKey = this.storage.generateKey(store.id, originalFilename);
    await this.storage.saveFile(fileKey, file.buffer);

    const pageCount = await this.estimatePageCount(file, originalFilename);

    return {
      file_key: fileKey,
      original_filename: originalFilename,
      mime_type: file.mimetype,
      file_size_bytes: file.size,
      page_count: pageCount,
    };
  }

  private validateFile(file: Express.Multer.File): void {
    if (!file || !file.buffer?.length) {
      throw new BadRequestException('لم يتم رفع أي ملف');
    }

    const maxSize = parseInt(
      process.env.MAX_FILE_SIZE_BYTES ?? String(DEFAULT_MAX_FILE_SIZE_BYTES),
      10,
    );
    if (file.size > maxSize) {
      throw new BadRequestException('حجم الملف كبير جداً. الحد الأقصى 50 ميغابايت.');
    }

    const name = decodeMultipartFilename(file.originalname);
    const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')).toLowerCase() : '';
    if (!ALLOWED_EXTENSIONS.includes(ext as (typeof ALLOWED_EXTENSIONS)[number])) {
      throw new BadRequestException('نوع الملف غير مدعوم');
    }
  }

  private async estimatePageCount(file: Express.Multer.File, filename: string): Promise<number> {
    const ext = filename.toLowerCase();
    if (ext.endsWith('.pdf')) {
      try {
        const pdfParse = await import('pdf-parse');
        const result = await pdfParse.default(file.buffer);
        return Math.max(1, result.numpages);
      } catch {
        return 1;
      }
    }
    if (/\.(jpe?g|png|webp)$/i.test(ext)) return 1;
    return 1;
  }
}

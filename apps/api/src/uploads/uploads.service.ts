import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@omsp/database';
import { decodeMultipartFilename } from '@omsp/shared';
import { ALLOWED_EXTENSIONS, DEFAULT_MAX_FILE_SIZE_BYTES } from '@omsp/types';
import { PRISMA } from '../prisma/prisma.module';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class UploadsService {
  constructor(
    @Inject(PRISMA) private readonly db: PrismaClient,
    private readonly storage: StorageService,
  ) {}

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

    const maxSize = parseInt(process.env.MAX_FILE_SIZE_BYTES ?? String(DEFAULT_MAX_FILE_SIZE_BYTES), 10);
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

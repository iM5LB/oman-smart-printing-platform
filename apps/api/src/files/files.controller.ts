import { Controller, Get, NotFoundException, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { StorageService } from '../storage/storage.service';

function guessMime(filename: string): string {
  const ext = filename.includes('.')
    ? filename.slice(filename.lastIndexOf('.')).toLowerCase()
    : '';
  switch (ext) {
    case '.pdf':
      return 'application/pdf';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.doc':
      return 'application/msword';
    case '.docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case '.ppt':
      return 'application/vnd.ms-powerpoint';
    case '.pptx':
      return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    case '.xls':
      return 'application/vnd.ms-excel';
    case '.xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    default:
      return 'application/octet-stream';
  }
}

/** Safe ASCII fallback + RFC 5987 UTF-8 filename for Save As. */
function contentDispositionInline(filename: string): string {
  const cleaned = filename.replace(/[\r\n\0]/g, '').trim() || 'document';
  const ascii = cleaned.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_') || 'document';
  const encoded = encodeURIComponent(cleaned).replace(/['()]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return `inline; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

@Controller('files')
export class FilesController {
  constructor(private readonly storage: StorageService) {}

  @Get('download')
  async download(@Query('token') token: string, @Res() res: Response) {
    if (!token) throw new NotFoundException('الملف غير موجود');

    const verified = this.storage.verifySignedToken(token);
    if (!verified) throw new NotFoundException('رابط التحميل منتهي أو غير صالح');

    const { fileKey, filename } = verified;
    const fallbackExt = fileKey.includes('.') ? fileKey.slice(fileKey.lastIndexOf('.')) : '';
    const downloadName = filename?.trim() || `document${fallbackExt}`;

    try {
      const buffer = await this.storage.readFile(fileKey);
      res.setHeader('Content-Type', guessMime(downloadName));
      res.setHeader('Content-Disposition', contentDispositionInline(downloadName));
      res.send(buffer);
    } catch {
      throw new NotFoundException('الملف غير موجود');
    }
  }
}

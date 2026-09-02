import { Controller, Get, NotFoundException, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { StorageService } from '../storage/storage.service';

@Controller('files')
export class FilesController {
  constructor(private readonly storage: StorageService) {}

  @Get('download')
  async download(@Query('token') token: string, @Res() res: Response) {
    if (!token) throw new NotFoundException('الملف غير موجود');

    const fileKey = this.storage.verifySignedToken(token);
    if (!fileKey) throw new NotFoundException('رابط التحميل منتهي أو غير صالح');

    try {
      const buffer = await this.storage.readFile(fileKey);
      const ext = fileKey.includes('.') ? fileKey.slice(fileKey.lastIndexOf('.')) : '';
      const mime = ext === '.pdf' ? 'application/pdf' : 'application/octet-stream';
      res.setHeader('Content-Type', mime);
      res.setHeader('Content-Disposition', `inline; filename="document${ext}"`);
      res.send(buffer);
    } catch {
      throw new NotFoundException('الملف غير موجود');
    }
  }
}

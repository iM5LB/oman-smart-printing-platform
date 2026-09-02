import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { StoresService } from './stores.service';
import { StorageService } from '../storage/storage.service';

@Controller('stores')
export class StoresController {
  constructor(
    private readonly storesService: StoresService,
    private readonly storage: StorageService,
  ) {}

  @Get(':slug/config')
  getConfig(@Param('slug') slug: string) {
    return this.storesService.getOrderConfig(slug);
  }

  @Get(':slug/logo')
  async getLogo(@Param('slug') slug: string, @Res() res: Response) {
    const logoKey = await this.storesService.getLogoKey(slug);
    if (!logoKey) throw new NotFoundException('لا يوجد شعار');
    try {
      const buffer = await this.storage.readFile(logoKey);
      const ext = logoKey.includes('.') ? logoKey.slice(logoKey.lastIndexOf('.')).toLowerCase() : '';
      const mime =
        ext === '.png'
          ? 'image/png'
          : ext === '.webp'
            ? 'image/webp'
            : ext === '.gif'
              ? 'image/gif'
              : 'image/jpeg';
      res.setHeader('Content-Type', mime);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(buffer);
    } catch {
      throw new NotFoundException('لا يوجد شعار');
    }
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.storesService.findBySlug(slug);
  }
}

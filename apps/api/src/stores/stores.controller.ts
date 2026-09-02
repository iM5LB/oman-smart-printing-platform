import { Controller, Get, Param } from '@nestjs/common';
import { StoresService } from './stores.service';

@Controller('stores')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Get(':slug/config')
  getConfig(@Param('slug') slug: string) {
    return this.storesService.getOrderConfig(slug);
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.storesService.findBySlug(slug);
  }
}

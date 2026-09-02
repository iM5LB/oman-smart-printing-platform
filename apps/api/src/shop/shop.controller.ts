import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { DEVICE_STORE_KEY, DeviceAuthGuard } from './device-auth.guard';
import { ShopService } from './shop.service';

interface DeviceRequest extends Request {
  [DEVICE_STORE_KEY]: {
    device: { id: string };
    store: { id: string };
  };
}

@Controller('shop')
@UseGuards(DeviceAuthGuard)
export class ShopController {
  constructor(private readonly shop: ShopService) {}

  @Get('me')
  me(@Req() req: DeviceRequest) {
    const { device, store } = req[DEVICE_STORE_KEY];
    return this.shop.getMe(store.id, device.id);
  }

  @Get('orders')
  orders(@Req() req: DeviceRequest, @Query('status') status?: string) {
    return this.shop.listOrders(req[DEVICE_STORE_KEY].store.id, status);
  }

  @Get('stats')
  stats(@Req() req: DeviceRequest) {
    return this.shop.getStats(req[DEVICE_STORE_KEY].store.id);
  }

  @Get('payments')
  payments(@Req() req: DeviceRequest) {
    return this.shop.listPayments(req[DEVICE_STORE_KEY].store.id);
  }

  @Get('customers')
  customers(@Req() req: DeviceRequest) {
    return this.shop.listCustomers(req[DEVICE_STORE_KEY].store.id);
  }

  @Get('pricing')
  pricing(@Req() req: DeviceRequest) {
    return this.shop.getPricing(req[DEVICE_STORE_KEY].store.id);
  }

  @Patch('pricing/rules/:ruleId')
  updateRule(
    @Req() req: DeviceRequest,
    @Param('ruleId') ruleId: string,
    @Body() body: { price_per_page: number },
  ) {
    return this.shop.updatePricingRule(
      req[DEVICE_STORE_KEY].store.id,
      ruleId,
      body.price_per_page,
    );
  }

  @Patch('pricing/finishing/:serviceId')
  updateFinishing(
    @Req() req: DeviceRequest,
    @Param('serviceId') serviceId: string,
    @Body() body: { price_baisa: number },
  ) {
    return this.shop.updateFinishing(
      req[DEVICE_STORE_KEY].store.id,
      serviceId,
      body.price_baisa,
    );
  }

  @Post('orders/:orderId/ready')
  markReady(@Req() req: DeviceRequest, @Param('orderId') orderId: string) {
    return this.shop.markReady(req[DEVICE_STORE_KEY].store.id, orderId);
  }

  @Post('orders/:orderId/collected')
  markCollected(@Req() req: DeviceRequest, @Param('orderId') orderId: string) {
    return this.shop.markCollected(req[DEVICE_STORE_KEY].store.id, orderId);
  }

  @Post('orders/:orderId/pay')
  payInStore(
    @Req() req: DeviceRequest,
    @Param('orderId') orderId: string,
    @Body() body: { method?: 'cash' | 'card_pos' },
  ) {
    return this.shop.payInStore(
      req[DEVICE_STORE_KEY].store.id,
      orderId,
      body?.method ?? 'cash',
    );
  }

  @Post('orders/:orderId/dispatch')
  dispatch(@Req() req: DeviceRequest, @Param('orderId') orderId: string) {
    return this.shop.dispatchOrder(req[DEVICE_STORE_KEY].store.id, orderId);
  }

  @Post('orders/:orderId/retry')
  retry(@Req() req: DeviceRequest, @Param('orderId') orderId: string) {
    return this.shop.retryOrder(req[DEVICE_STORE_KEY].store.id, orderId);
  }

  @Get('printers')
  printers(@Req() req: DeviceRequest) {
    return this.shop.listPrinters(req[DEVICE_STORE_KEY].store.id);
  }

  @Patch('printers/:printerId')
  updatePrinter(
    @Req() req: DeviceRequest,
    @Param('printerId') printerId: string,
    @Body() body: { roles?: string[]; is_default?: boolean; display_name?: string },
  ) {
    return this.shop.updatePrinter(req[DEVICE_STORE_KEY].store.id, printerId, body);
  }
}

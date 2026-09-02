import { Body, Controller, Get, Inject, Param, Post, forwardRef } from '@nestjs/common';
import { CreateOrderDto, QuoteOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';
import { PaymentsService } from '../payments/payments.service';
import { PrintingService } from '../printing/printing.service';
import { ShopGateway } from '../websocket/shop.gateway';

@Controller()
export class OrdersController {
  constructor(
    private readonly orders: OrdersService,
    @Inject(forwardRef(() => PaymentsService))
    private readonly payments: PaymentsService,
    @Inject(forwardRef(() => PrintingService))
    private readonly printing: PrintingService,
    @Inject(forwardRef(() => ShopGateway))
    private readonly shopGateway: ShopGateway,
  ) {}

  @Post('stores/:slug/orders/quote')
  quote(@Param('slug') slug: string, @Body() dto: QuoteOrderDto) {
    return this.orders.quote(slug, dto.items);
  }

  @Post('stores/:slug/orders')
  async create(@Param('slug') slug: string, @Body() dto: CreateOrderDto) {
    try {
      const result = await this.orders.create(slug, dto);

      if (result.requires_payment) {
        const payment = await this.payments.initializeForOrder(result.order_id);
        return { ...result, payment_url: payment.checkout_url };
      }

      try {
        await this.shopGateway.notifyOrderCreated(result.order_id);
        if (result.status === 'queued') {
          await this.printing.dispatchOrder(result.order_id);
        }
      } catch (notifyErr) {
        console.error('Post-order notify/dispatch failed:', notifyErr);
      }

      return result;
    } catch (err) {
      console.error('Order create failed:', err);
      throw err;
    }
  }

  @Get('orders/track/:token')
  track(@Param('token') token: string) {
    return this.orders.findByTrackingToken(token);
  }
}

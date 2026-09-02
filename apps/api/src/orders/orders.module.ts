import { Module, forwardRef } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PaymentsModule } from '../payments/payments.module';
import { PrintingModule } from '../printing/printing.module';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    forwardRef(() => PaymentsModule),
    forwardRef(() => PrintingModule),
    forwardRef(() => WebSocketModule),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}

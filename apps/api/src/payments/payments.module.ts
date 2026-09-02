import { Module, forwardRef } from '@nestjs/common';
import { PaymentsController, PaymentWebhooksController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PrintingModule } from '../printing/printing.module';
import { WebSocketModule } from '../websocket/websocket.module';
@Module({
  imports: [forwardRef(() => PrintingModule), forwardRef(() => WebSocketModule)],
  controllers: [PaymentsController, PaymentWebhooksController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}

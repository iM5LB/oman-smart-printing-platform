import { Body, Controller, Param, Post } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post(':paymentId/confirm-mock')
  confirmMock(@Param('paymentId') paymentId: string) {
    return this.payments.confirmMockPayment(paymentId);
  }
}

@Controller('webhooks/payments')
export class PaymentWebhooksController {
  constructor(private readonly payments: PaymentsService) {}

  @Post(':provider')
  webhook(@Param('provider') provider: string, @Body() body: Record<string, unknown>) {
    return this.payments.handleWebhook(provider, body);
  }
}

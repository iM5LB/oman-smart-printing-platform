import { Module, forwardRef } from '@nestjs/common';
import { ShopGateway } from './shop.gateway';
import { PrintingModule } from '../printing/printing.module';

@Module({
  imports: [forwardRef(() => PrintingModule)],
  providers: [ShopGateway],
  exports: [ShopGateway],
})
export class WebSocketModule {}

import { Module, forwardRef } from '@nestjs/common';
import { LibraryController } from './library.controller';
import { LibraryService } from './library.service';
import { LibraryAuthGuard } from './library-auth.guard';
import { StorageModule } from '../storage/storage.module';
import { SmsModule } from '../sms/sms.module';
import { ShopModule } from '../shop/shop.module';

@Module({
  imports: [StorageModule, SmsModule, forwardRef(() => ShopModule)],
  controllers: [LibraryController],
  providers: [LibraryService, LibraryAuthGuard],
  exports: [LibraryService],
})
export class LibraryModule {}

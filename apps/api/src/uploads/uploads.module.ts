import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UploadAuthGuard } from './upload-auth.guard';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [UploadsController],
  providers: [UploadsService, UploadAuthGuard],
  exports: [UploadsService],
})
export class UploadsModule {}

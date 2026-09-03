import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CustomerAuthGuard } from './customer-auth.guard';
import { SmsModule } from '../sms/sms.module';

@Module({
  imports: [SmsModule],
  controllers: [AuthController],
  providers: [AuthService, CustomerAuthGuard],
  exports: [AuthService, CustomerAuthGuard],
})
export class AuthModule {}

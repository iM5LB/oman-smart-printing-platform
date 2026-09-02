import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CustomerAuthGuard } from './customer-auth.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthService, CustomerAuthGuard],
  exports: [AuthService, CustomerAuthGuard],
})
export class AuthModule {}

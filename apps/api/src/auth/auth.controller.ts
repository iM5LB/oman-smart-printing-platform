import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { AuthService } from './auth.service';
import { CustomerAuthGuard } from './customer-auth.guard';

class RequestOtpDto {
  @IsString()
  @MinLength(8)
  phone!: string;
}

class VerifyOtpDto {
  @IsString()
  @MinLength(8)
  phone!: string;

  @IsString()
  @MinLength(4)
  code!: string;
}

@Controller()
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('auth/otp/request')
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.auth.requestOtp(dto.phone);
  }

  @Post('auth/otp/verify')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.auth.verifyOtp(dto.phone, dto.code);
  }

  @Post('auth/logout')
  logout(@Headers('authorization') authorization?: string) {
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : undefined;
    return this.auth.logout(token);
  }

  @Get('stores/:slug/my-orders')
  @UseGuards(CustomerAuthGuard)
  myOrders(
    @Param('slug') slug: string,
    @Req() req: { customer: { phone: string } },
  ) {
    return this.auth.listOrdersForPhone(req.customer.phone, slug);
  }
}

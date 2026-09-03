import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import {
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { LibraryService } from './library.service';
import { LIBRARY_OWNER_KEY, LibraryAuthGuard } from './library-auth.guard';
import { ShopService } from '../shop/shop.service';

class UnlockSetupDto {
  @IsString()
  @MinLength(1)
  password!: string;
}

class RegisterDto {
  @IsString()
  @MinLength(20)
  setup_token!: string;

  /** Optional — auto-generated when omitted during setup wizard. */
  @IsOptional()
  @IsEmail()
  email?: string;

  /** Optional — auto-generated when omitted during setup wizard. */
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  owner_name?: string;

  @IsString()
  @MinLength(2)
  store_name!: string;

  @IsOptional()
  @IsString()
  store_slug?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

class UpdatePricingRuleDto {
  @IsNumber()
  price_per_page!: number;
}

class UpdateFinishingDto {
  @IsNumber()
  price_baisa!: number;
}

interface LibraryOwnerRequest extends Request {
  [LIBRARY_OWNER_KEY]: {
    store: { id: string };
    user: { id: string };
    role: string;
  };
}

class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}

class UpdateStoreDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  governorate?: string;

  @IsOptional()
  @IsString()
  wilayat?: string;

  @IsOptional()
  @IsString()
  area?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsNumber()
  latitude?: number | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsNumber()
  longitude?: number | null;
}

class DeviceSecurityDto {
  @IsString()
  @MinLength(6)
  device_password!: string;

  @IsString()
  @MinLength(8)
  device_confirm_phone!: string;
}

class CreateDeviceDto {
  @IsOptional()
  @IsString()
  name?: string;
}

@Controller('library')
export class LibraryController {
  constructor(
    private readonly library: LibraryService,
    private readonly shop: ShopService,
  ) {}

  @Post('setup/unlock')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  unlockSetup(@Body() dto: UnlockSetupDto) {
    return this.library.unlockSetup(dto.password);
  }

  @Post('auth/register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  register(@Body() dto: RegisterDto) {
    return this.library.register(dto);
  }

  @Post('auth/login')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  login(@Body() dto: LoginDto) {
    return this.library.login(dto.email, dto.password);
  }

  @Post('auth/logout')
  logout(@Headers('authorization') authorization?: string) {
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice(7).trim()
      : undefined;
    return this.library.logout(token);
  }

  @Get('me')
  me(@Headers('authorization') authorization?: string) {
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice(7).trim()
      : undefined;
    return this.library.me(token);
  }

  @Patch('store')
  updateStore(
    @Headers('authorization') authorization?: string,
    @Body() dto?: UpdateStoreDto,
  ) {
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice(7).trim()
      : undefined;
    return this.library.updateStore(token, dto ?? {});
  }

  @Put('store/device-security')
  setDeviceSecurity(
    @Headers('authorization') authorization?: string,
    @Body() dto?: DeviceSecurityDto,
  ) {
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice(7).trim()
      : undefined;
    return this.library.setDeviceSecurity(token, dto!);
  }

  @Post('store/logo')
  @UseInterceptors(FileInterceptor('logo', { limits: { fileSize: 2 * 1024 * 1024 } }))
  uploadLogo(
    @Headers('authorization') authorization: string | undefined,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice(7).trim()
      : undefined;
    return this.library.uploadLogo(token, file);
  }

  @Post('onboarding/complete')
  completeOnboarding(@Headers('authorization') authorization?: string) {
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice(7).trim()
      : undefined;
    return this.library.completeOnboarding(token);
  }

  @Get('devices')
  listDevices(@Headers('authorization') authorization?: string) {
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice(7).trim()
      : undefined;
    return this.library.listDevices(token);
  }

  @Post('devices')
  createDevice(
    @Headers('authorization') authorization?: string,
    @Body() dto?: CreateDeviceDto,
  ) {
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice(7).trim()
      : undefined;
    return this.library.createDevice(token, dto?.name ?? 'جهاز الكاونتر');
  }

  @Post('devices/:id/revoke')
  revokeDevice(
    @Headers('authorization') authorization: string | undefined,
    @Param('id') id: string,
  ) {
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice(7).trim()
      : undefined;
    return this.library.revokeDevice(token, id);
  }

  @Post('devices/:id/rotate')
  rotateDevice(
    @Headers('authorization') authorization: string | undefined,
    @Param('id') id: string,
  ) {
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice(7).trim()
      : undefined;
    return this.library.rotateDevice(token, id);
  }

  @Get('stats')
  @UseGuards(LibraryAuthGuard)
  stats(@Req() req: LibraryOwnerRequest) {
    return this.shop.getStats(req[LIBRARY_OWNER_KEY].store.id);
  }

  @Get('orders')
  @UseGuards(LibraryAuthGuard)
  orders(@Req() req: LibraryOwnerRequest, @Query('status') status?: string) {
    return this.shop.listOrders(req[LIBRARY_OWNER_KEY].store.id, status);
  }

  @Get('payments')
  @UseGuards(LibraryAuthGuard)
  payments(@Req() req: LibraryOwnerRequest) {
    return this.shop.listPayments(req[LIBRARY_OWNER_KEY].store.id);
  }

  @Get('customers')
  @UseGuards(LibraryAuthGuard)
  customers(@Req() req: LibraryOwnerRequest) {
    return this.shop.listCustomers(req[LIBRARY_OWNER_KEY].store.id);
  }

  @Get('pricing')
  @UseGuards(LibraryAuthGuard)
  pricing(@Req() req: LibraryOwnerRequest) {
    return this.shop.getPricing(req[LIBRARY_OWNER_KEY].store.id);
  }

  @Patch('pricing/rules/:ruleId')
  @UseGuards(LibraryAuthGuard)
  updatePricingRule(
    @Req() req: LibraryOwnerRequest,
    @Param('ruleId') ruleId: string,
    @Body() dto: UpdatePricingRuleDto,
  ) {
    return this.shop.updatePricingRule(
      req[LIBRARY_OWNER_KEY].store.id,
      ruleId,
      dto.price_per_page,
    );
  }

  @Patch('pricing/finishing/:serviceId')
  @UseGuards(LibraryAuthGuard)
  updateFinishing(
    @Req() req: LibraryOwnerRequest,
    @Param('serviceId') serviceId: string,
    @Body() dto: UpdateFinishingDto,
  ) {
    return this.shop.updateFinishing(
      req[LIBRARY_OWNER_KEY].store.id,
      serviceId,
      dto.price_baisa,
    );
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  ValidateIf,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CustomerAuthGuard } from '../auth/customer-auth.guard';
import { PlatformService } from './platform.service';

class UpdatePlatformStoreDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string | null;

  @IsOptional()
  @IsString()
  governorate?: string | null;

  @IsOptional()
  @IsString()
  wilayat?: string | null;

  @IsOptional()
  @IsString()
  area?: string | null;

  @IsOptional()
  @IsString()
  address?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsNumber()
  latitude?: number | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsNumber()
  longitude?: number | null;

  @IsOptional()
  @IsString()
  order_number_prefix?: string;

  @IsOptional()
  @IsBoolean()
  auto_print_paid_orders?: boolean;

  @IsOptional()
  @IsString()
  pay_at_pickup_print_policy?: string;

  @IsOptional()
  @IsString()
  file_retention_policy?: string;

  @IsOptional()
  @IsString()
  paid_orders_priority?: string;

  @IsOptional()
  @IsString()
  device_confirm_phone?: string | null;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

class HourDto {
  @IsNumber()
  @Min(0)
  @Max(6)
  day_of_week!: number;

  @IsString()
  open_time!: string;

  @IsString()
  close_time!: string;

  @IsBoolean()
  is_closed!: boolean;
}

class SetHoursDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HourDto)
  hours!: HourDto[];
}

@Controller('platform')
@UseGuards(CustomerAuthGuard)
export class PlatformController {
  constructor(private readonly platform: PlatformService) {}

  @Get('stores')
  list(@Req() req: { customer: { phone: string } }) {
    this.platform.requireAdmin(req.customer.phone);
    return this.platform.listStores(req.customer.phone);
  }

  @Patch('stores/:slug')
  update(
    @Req() req: { customer: { phone: string } },
    @Param('slug') slug: string,
    @Body() dto: UpdatePlatformStoreDto,
  ) {
    this.platform.requireAdmin(req.customer.phone);
    return this.platform.updateStore(req.customer.phone, slug, dto);
  }

  @Put('stores/:slug/hours')
  setHours(
    @Req() req: { customer: { phone: string } },
    @Param('slug') slug: string,
    @Body() dto: SetHoursDto,
  ) {
    this.platform.requireAdmin(req.customer.phone);
    return this.platform.setHours(req.customer.phone, slug, dto.hours);
  }

  @Delete('stores/:slug')
  remove(@Req() req: { customer: { phone: string } }, @Param('slug') slug: string) {
    this.platform.requireAdmin(req.customer.phone);
    return this.platform.deleteStore(req.customer.phone, slug);
  }
}

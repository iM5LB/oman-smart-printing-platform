import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QuoteItemDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page_count!: number;

  @IsEnum(['bw', 'color', 'grayscale'])
  color_mode!: 'bw' | 'color' | 'grayscale';

  @IsEnum(['A4', 'A3', 'A5'])
  paper_size!: 'A4' | 'A3' | 'A5';

  @IsEnum(['single', 'duplex_long', 'duplex_short'])
  sides!: 'single' | 'duplex_long' | 'duplex_short';

  @IsString()
  @IsOptional()
  page_range?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  @IsOptional()
  copies?: number;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  finishing_service_ids?: string[];
}

export class OrderItemDto {
  @IsString()
  file_key!: string;

  @IsString()
  original_filename!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  page_count!: number;

  @IsOptional()
  @IsString()
  mime_type?: string;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  file_size_bytes?: number;

  @IsEnum(['bw', 'color', 'grayscale'])
  color_mode!: 'bw' | 'color' | 'grayscale';

  @IsEnum(['A4', 'A3', 'A5'])
  paper_size!: 'A4' | 'A3' | 'A5';

  @IsEnum(['single', 'duplex_long', 'duplex_short'])
  sides!: 'single' | 'duplex_long' | 'duplex_short';

  @IsEnum(['auto', 'portrait', 'landscape'])
  @IsOptional()
  orientation?: 'auto' | 'portrait' | 'landscape';

  @IsString()
  @IsOptional()
  page_range?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  @IsOptional()
  copies?: number;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  finishing_service_ids?: string[];
}

export class CreateOrderDto {
  @IsString()
  @IsOptional()
  customer_name?: string;

  @IsString()
  customer_phone!: string;

  @IsString()
  @IsOptional()
  customer_notes?: string;

  @IsEnum(['pay_at_pickup', 'online'])
  payment_method!: 'pay_at_pickup' | 'online';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];
}

export class QuoteOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuoteItemDto)
  items!: QuoteItemDto[];
}

import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsString, MinLength } from 'class-validator';
import { LibraryService } from '../library/library.service';

class PairStartDto {
  @IsString()
  @MinLength(1)
  store_slug!: string;

  @IsString()
  @MinLength(6)
  device_password!: string;

  @IsString()
  @MinLength(1)
  device_name!: string;
}

class PairConfirmDto {
  @IsString()
  @MinLength(1)
  challenge_id!: string;

  @IsString()
  @MinLength(4)
  code!: string;
}

@Controller('devices')
export class DevicesController {
  constructor(private readonly library: LibraryService) {}

  /** Pair desktop app: password → OTP to library confirm phone → device token. */
  @Post('pair/start')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  pairStart(@Body() dto: PairStartDto) {
    return this.library.startPairing(dto.store_slug, dto.device_password, dto.device_name);
  }

  @Post('pair/confirm')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  pairConfirm(@Body() dto: PairConfirmDto) {
    return this.library.confirmPairing(dto.challenge_id, dto.code);
  }
}

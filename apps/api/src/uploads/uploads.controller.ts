import {
  Controller,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { UploadAuthGuard } from './upload-auth.guard';
import { UploadsService } from './uploads.service';

@Controller('stores/:slug/uploads')
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  /** Issue a short-lived upload ticket (rate-limited). */
  @Post('session')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  createSession(@Param('slug') slug: string) {
    return this.uploads.createUploadSession(slug);
  }

  @Post()
  @UseGuards(UploadAuthGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  async upload(
    @Param('slug') slug: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.uploads.uploadFile(slug, file);
  }
}

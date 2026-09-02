import { Module } from '@nestjs/common';
import { DevicesController } from './devices.controller';
import { LibraryModule } from '../library/library.module';

@Module({
  imports: [LibraryModule],
  controllers: [DevicesController],
})
export class DevicesModule {}

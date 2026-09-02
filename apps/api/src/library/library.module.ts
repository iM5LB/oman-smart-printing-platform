import { Module } from '@nestjs/common';
import { LibraryController } from './library.controller';
import { LibraryService } from './library.service';
import { LibraryAuthGuard } from './library-auth.guard';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [LibraryController],
  providers: [LibraryService, LibraryAuthGuard],
  exports: [LibraryService],
})
export class LibraryModule {}

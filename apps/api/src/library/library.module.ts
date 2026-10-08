import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../prisma.service';
import { LibraryController } from './library.controller';
import { LibraryService } from './library.service';

@Module({
  imports: [AuthModule],
  controllers: [LibraryController],
  providers: [LibraryService, PrismaService],
})
export class LibraryModule {}

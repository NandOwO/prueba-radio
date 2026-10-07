import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../prisma.service';
import { BlocklistService } from './blocklist.service';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';

@Module({
  imports: [AuthModule],
  controllers: [RequestsController],
  providers: [RequestsService, BlocklistService, PrismaService],
  exports: [RequestsService],
})
export class RequestsModule {}

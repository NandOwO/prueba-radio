import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../prisma.service';
import { BlocklistService } from './blocklist.service';
import { QueueController } from './queue.controller';
import { QueueService } from './queue.service';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';

@Module({
  imports: [AuthModule],
  controllers: [RequestsController, QueueController],
  providers: [RequestsService, BlocklistService, QueueService, PrismaService],
  exports: [RequestsService, QueueService],
})
export class RequestsModule {}

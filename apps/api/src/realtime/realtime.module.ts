import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RequestsModule } from '../requests/requests.module';
import { QueueGateway } from './queue.gateway';

@Module({
  imports: [AuthModule, RequestsModule],
  providers: [QueueGateway],
})
export class RealtimeModule {}

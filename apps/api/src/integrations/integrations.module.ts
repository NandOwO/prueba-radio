import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ErpModule } from '../erp/erp.module';
import { PrismaService } from '../prisma.service';
import { ErpAdminController, ErpIntegrationsController } from './erp-integrations.controller';
import { ErpSyncScheduler } from './erp-sync.scheduler';
import { MembersSyncService } from './members-sync.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [ErpModule, AuditModule, AuthModule],
  controllers: [ErpIntegrationsController, ErpAdminController],
  providers: [MembersSyncService, ErpSyncScheduler, PrismaService],
  exports: [MembersSyncService],
})
export class IntegrationsModule {}

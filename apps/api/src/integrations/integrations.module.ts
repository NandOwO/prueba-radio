import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ErpModule } from '../erp/erp.module';
import { PrismaService } from '../prisma.service';
import { ErpIntegrationsController } from './erp-integrations.controller';
import { MembersSyncService } from './members-sync.service';

@Module({
  imports: [ErpModule, AuditModule],
  controllers: [ErpIntegrationsController],
  providers: [MembersSyncService, PrismaService],
  exports: [MembersSyncService],
})
export class IntegrationsModule {}

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { loadConfig } from '../config';
import { MembersSyncService } from './members-sync.service';

/** Sincronización de respaldo cada 15 minutos (ver docs/erp-integration.md, sección 6). */
@Injectable()
export class ErpSyncScheduler {
  private readonly logger = new Logger(ErpSyncScheduler.name);

  constructor(private readonly sync: MembersSyncService) {}

  @Cron('0 */15 * * * *')
  async run(): Promise<void> {
    if (!loadConfig().erpSyncEnabled) return;
    try {
      const report = await this.sync.syncFromErp();
      this.logger.log(`Sincronización ERP: ${JSON.stringify(report)}`);
    } catch (err) {
      this.logger.warn(
        `Sincronización ERP fallida: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}

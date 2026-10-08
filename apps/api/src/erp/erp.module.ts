import { Module } from '@nestjs/common';
import { loadConfig } from '../config';
import { FakeErpAdapter } from './fake-erp.adapter';
import { GymErpAdapter } from './gymerp.adapter';
import { MEMBER_PROVIDER } from './member-provider.token';

@Module({
  providers: [
    {
      provide: MEMBER_PROVIDER,
      useFactory: () => {
        const config = loadConfig();
        if (config.erpMode === 'gymerp') {
          if (!config.erpBaseUrl || !config.erpApiKey) {
            throw new Error('ERP_MODE=gymerp requiere ERP_BASE_URL y ERP_API_KEY');
          }
          return new GymErpAdapter(config.erpBaseUrl, config.erpApiKey);
        }
        return new FakeErpAdapter();
      },
    },
  ],
  exports: [MEMBER_PROVIDER],
})
export class ErpModule {}

import { Module } from '@nestjs/common';
import { FakeErpAdapter } from './fake-erp.adapter';
import { MEMBER_PROVIDER } from './member-provider.token';

@Module({
  providers: [{ provide: MEMBER_PROVIDER, useFactory: () => new FakeErpAdapter() }],
  exports: [MEMBER_PROVIDER],
})
export class ErpModule {}

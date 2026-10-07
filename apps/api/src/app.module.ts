import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ErpModule } from './erp/erp.module';
import { HealthController } from './health.controller';
import { PrismaService } from './prisma.service';

@Module({
  imports: [ErpModule, AuthModule],
  controllers: [HealthController],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}

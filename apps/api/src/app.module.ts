import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ErpModule } from './erp/erp.module';
import { HealthController } from './health.controller';
import { MusicModule } from './music/music.module';
import { PrismaService } from './prisma.service';
import { StaffModule } from './staff/staff.module';

@Module({
  imports: [ErpModule, AuthModule, StaffModule, MusicModule],
  controllers: [HealthController],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}

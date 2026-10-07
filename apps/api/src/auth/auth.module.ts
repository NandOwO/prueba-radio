import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ErpModule } from '../erp/erp.module';
import { PrismaService } from '../prisma.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { loadConfig } from '../config';

@Module({
  imports: [
    ErpModule,
    JwtModule.registerAsync({
      useFactory: () => ({ secret: loadConfig().jwtSecret }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, PrismaService],
  exports: [JwtAuthGuard, JwtModule],
})
export class AuthModule {}

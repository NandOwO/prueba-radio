import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { loadConfig } from '../config';
import { ErpModule } from '../erp/erp.module';
import { PrismaService } from '../prisma.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';

@Module({
  imports: [
    ErpModule,
    JwtModule.registerAsync({
      useFactory: () => ({ secret: loadConfig().jwtSecret }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, RolesGuard, PrismaService],
  exports: [JwtAuthGuard, RolesGuard, JwtModule],
})
export class AuthModule {}

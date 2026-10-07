import { Body, Controller, Get, HttpCode, Inject, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { loadConfig } from '../config';
import { AuthService, AuthResult } from './auth.service';
import { loginSchema, LoginDto } from './auth.dto';
import { CurrentUser } from './current-user';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PrismaService } from '../prisma.service';
import { ApiError } from '../common/api-error';
import { HttpStatus } from '@nestjs/common';

export const REFRESH_COOKIE = 'pulsofm_rt';

@Controller('auth')
export class AuthController {
  private readonly config = loadConfig();

  constructor(
    private readonly auth: AuthService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  @Post('login')
  @HttpCode(200)
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const result = await this.auth.login(body.username, body.password);
    this.setRefreshCookie(reply, result.refreshToken);
    return this.toBody(result);
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    const result = await this.auth.refresh(req.cookies?.[REFRESH_COOKIE]);
    this.setRefreshCookie(reply, result.refreshToken);
    return this.toBody(result);
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    await this.auth.logout(req.cookies?.[REFRESH_COOKIE]);
    reply.clearCookie(REFRESH_COOKIE, { path: '/auth' });
  }

  @Get('/me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: FastifyRequest & { user: CurrentUser }) {
    const user = await this.prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user || user.status !== 'active') {
      throw new ApiError(
        HttpStatus.FORBIDDEN,
        'MEMBER_NOT_ACTIVE',
        'Tu cuenta no está activa, contacta a recepción',
      );
    }
    return {
      id: user.id,
      externalId: user.externalId,
      name: user.name,
      username: user.username,
      role: user.role,
    };
  }

  private setRefreshCookie(reply: FastifyReply, token: string): void {
    reply.setCookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      secure: this.config.cookieSecure,
      sameSite: 'strict',
      path: '/auth',
      maxAge: this.config.sessionTtlHours * 3600,
    });
  }

  private toBody(result: AuthResult) {
    return { accessToken: result.accessToken, user: result.user };
  }
}

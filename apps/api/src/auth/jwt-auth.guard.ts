import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiError } from '../common/api-error';
import type { CurrentUser } from './current-user';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string>; user?: CurrentUser }>();
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) {
      throw new ApiError(
        HttpStatus.UNAUTHORIZED,
        'UNAUTHENTICATED',
        'Inicia sesión para continuar',
      );
    }
    try {
      const payload = await this.jwt.verifyAsync<CurrentUser & { sub: string; sid: string }>(token);
      req.user = {
        id: payload.sub,
        externalId: payload.externalId,
        name: payload.name,
        username: payload.username,
        role: payload.role,
        sessionId: payload.sid,
      };
      return true;
    } catch {
      throw new ApiError(HttpStatus.UNAUTHORIZED, 'TOKEN_INVALID', 'La sesión ya no es válida');
    }
  }
}

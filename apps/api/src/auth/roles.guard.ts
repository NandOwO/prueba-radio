import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@pulsofm/shared';
import { ApiError } from '../common/api-error';
import { ROLES_KEY } from '../common/roles.decorator';
import type { CurrentUser } from './current-user';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest<{ user?: CurrentUser }>();
    if (!req.user || !required.includes(req.user.role as Role)) {
      throw new ApiError(HttpStatus.FORBIDDEN, 'FORBIDDEN', 'No tienes permiso para esta acción');
    }
    return true;
  }
}

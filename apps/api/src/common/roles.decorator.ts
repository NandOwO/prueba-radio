import { SetMetadata } from '@nestjs/common';
import type { Role } from '@pulsofm/shared';

export const ROLES_KEY = 'roles';

/** Restringe una ruta a los roles indicados. Debe usarse junto con JwtAuthGuard. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

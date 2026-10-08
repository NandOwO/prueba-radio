import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import type { Member, MemberProvider } from '@pulsofm/shared';
import { ApiError } from '../common/api-error';
import { loadConfig } from '../config';
import { MEMBER_PROVIDER } from '../erp/member-provider.token';
import { PrismaService } from '../prisma.service';
import type { CurrentUser } from './current-user';

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: Omit<CurrentUser, 'sessionId'>;
}

const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');

@Injectable()
export class AuthService {
  private readonly config = loadConfig();

  constructor(
    @Inject(MEMBER_PROVIDER) private readonly erp: MemberProvider,
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /** Login con las credenciales del ERP. PulsoFM nunca guarda la contraseña. */
  async login(username: string, password: string): Promise<AuthResult> {
    const member = await this.erp.validateCredentials(username, password);
    if (!member) {
      throw new ApiError(
        HttpStatus.UNAUTHORIZED,
        'INVALID_CREDENTIALS',
        'Usuario o contraseña incorrectos',
      );
    }
    this.assertActive(member);

    const user = await this.syncUser(member);
    const refreshToken = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + this.config.sessionTtlHours * 3600_000);
    const session = await this.prisma.session.create({
      data: { userId: user.id, refreshTokenHash: hashToken(refreshToken), expiresAt },
    });

    return this.issue(user, session.id, refreshToken);
  }

  /**
   * Renueva la sesión. Vuelve a consultar el ERP: si el socio ya no está activo,
   * la sesión se revoca y no se emite token nuevo.
   */
  async refresh(refreshToken: string | undefined): Promise<AuthResult> {
    const session = refreshToken
      ? await this.prisma.session.findUnique({
          where: { refreshTokenHash: hashToken(refreshToken) },
          include: { user: true },
        })
      : null;

    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw new ApiError(
        HttpStatus.UNAUTHORIZED,
        'SESSION_EXPIRED',
        'La sesión expiró, vuelve a iniciar sesión',
      );
    }

    const member = await this.erp.getMember(session.user.externalId);
    if (!member || member.status !== 'active') {
      await this.prisma.session.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });
      throw new ApiError(
        HttpStatus.FORBIDDEN,
        'MEMBER_NOT_ACTIVE',
        'Tu cuenta no está activa, contacta a recepción',
      );
    }

    const user = await this.syncUser(member);
    const nextRefresh = randomBytes(32).toString('base64url');
    // Rotación: el refresh token anterior deja de servir. La fecha de expiración absoluta se mantiene.
    await this.prisma.session.update({
      where: { id: session.id },
      data: { refreshTokenHash: hashToken(nextRefresh) },
    });

    return this.issue(user, session.id, nextRefresh);
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    await this.prisma.session.updateMany({
      where: { refreshTokenHash: hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private assertActive(member: Member): void {
    if (member.status !== 'active') {
      throw new ApiError(
        HttpStatus.FORBIDDEN,
        'MEMBER_NOT_ACTIVE',
        'Tu cuenta no está activa, contacta a recepción',
      );
    }
  }

  private async syncUser(member: Member) {
    const roleOverride = this.config.roleOverrides[member.externalId];
    return this.prisma.user.upsert({
      where: { externalId: member.externalId },
      create: {
        externalId: member.externalId,
        username: member.username,
        name: member.fullName,
        status: member.status,
        lastSyncedAt: new Date(),
        role: roleOverride ?? 'member',
      },
      update: {
        username: member.username,
        name: member.fullName,
        status: member.status,
        lastSyncedAt: new Date(),
        ...(roleOverride ? { role: roleOverride } : {}),
      },
    });
  }

  private async issue(
    user: { id: string; externalId: string; name: string; username: string; role: string },
    sessionId: string,
    refreshToken: string,
  ): Promise<AuthResult> {
    const claims = {
      externalId: user.externalId,
      name: user.name,
      username: user.username,
      role: user.role,
      sid: sessionId,
    };
    const accessToken = await this.jwt.signAsync(claims, {
      subject: user.id,
      expiresIn: this.config.accessTokenTtlSeconds,
    });
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        externalId: user.externalId,
        name: user.name,
        username: user.username,
        role: user.role,
      },
    };
  }
}

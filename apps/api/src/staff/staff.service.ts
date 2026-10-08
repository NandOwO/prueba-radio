import { HttpStatus, Injectable } from '@nestjs/common';
import { ApiError } from '../common/api-error';
import { AuditService } from '../audit/audit.service';
import { BlocklistService, matchBlocklist } from '../requests/blocklist.service';
import { QueueService } from '../requests/queue.service';
import { PrismaService } from '../prisma.service';

export type BlockType = 'track' | 'artist' | 'keyword';

@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
    private readonly blocklist: BlocklistService,
    private readonly audit: AuditService,
  ) {}

  async skipCurrent(actorId: string) {
    const current = await this.prisma.request.findFirst({
      where: { status: 'playing' },
      select: { id: true },
    });
    const snapshot = await this.queue.advance({ skipped: true, decidedBy: actorId });
    await this.audit.record({
      actorId,
      action: 'queue.skip',
      entity: 'request',
      entityId: current?.id ?? null,
    });
    return snapshot;
  }

  /** Quita una solicitud de la lista de espera. Solo aplica a canciones que aún no suenan. */
  async removeQueued(actorId: string, requestId: string, reason?: string): Promise<void> {
    const request = await this.prisma.request.findUnique({ where: { id: requestId } });
    if (!request || request.status !== 'queued') {
      throw new ApiError(
        HttpStatus.NOT_FOUND,
        'REQUEST_NOT_QUEUED',
        'Esa canción ya no está en la lista de espera',
      );
    }
    await this.prisma.request.update({
      where: { id: requestId },
      data: { status: 'removed', reason: reason ?? null, decidedBy: actorId },
    });
    this.queue.notifyChanged();
    await this.audit.record({
      actorId,
      action: 'request.remove',
      entity: 'request',
      entityId: requestId,
      payload: { reason: reason ?? null, userId: request.userId },
    });
  }

  /** Sube o baja una canción en la lista de espera intercambiando su posición con la vecina. */
  async move(actorId: string, requestId: string, direction: 'up' | 'down'): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const queued = await tx.request.findMany({
        where: { status: 'queued' },
        orderBy: { position: 'asc' },
        select: { id: true, position: true },
      });
      const index = queued.findIndex((r) => r.id === requestId);
      if (index === -1) {
        throw new ApiError(
          HttpStatus.NOT_FOUND,
          'REQUEST_NOT_QUEUED',
          'Esa canción ya no está en la lista de espera',
        );
      }
      const neighbor = queued[direction === 'up' ? index - 1 : index + 1];
      if (!neighbor) return;
      const current = queued[index]!;
      await tx.request.update({ where: { id: current.id }, data: { position: neighbor.position } });
      await tx.request.update({ where: { id: neighbor.id }, data: { position: current.position } });
    });
    this.queue.notifyChanged();
    await this.audit.record({
      actorId,
      action: 'queue.move',
      entity: 'request',
      entityId: requestId,
      payload: { direction },
    });
  }

  listBlocklist() {
    return this.prisma.blocklist.findMany({ orderBy: { createdAt: 'desc' } });
  }

  /** Añade una regla. Las solicitudes en espera que coincidan se quitan de la cola en el mismo paso. */
  async addBlockRule(actorId: string, input: { type: BlockType; value: string; reason?: string }) {
    // Artistas y palabras clave no distinguen mayúsculas; los IDs de canción sí son exactos.
    const value = input.type === 'track' ? input.value.trim() : input.value.trim().toLowerCase();
    const existing = await this.prisma.blocklist.findUnique({
      where: { type_value: { type: input.type, value } },
    });
    if (existing) {
      throw new ApiError(HttpStatus.CONFLICT, 'BLOCK_EXISTS', 'Esa regla ya existe');
    }
    const rule = await this.prisma.blocklist.create({
      data: { type: input.type, value, reason: input.reason ?? null, createdBy: actorId },
    });

    const queued = await this.prisma.request.findMany({
      where: { status: 'queued' },
      include: { track: { select: { providerTrackId: true, title: true, artist: true } } },
    });
    const removedIds: string[] = [];
    for (const request of queued) {
      const reason = matchBlocklist(request.track, [rule]);
      if (!reason) continue;
      await this.prisma.request.update({
        where: { id: request.id },
        data: { status: 'removed', reason, decidedBy: actorId },
      });
      removedIds.push(request.id);
    }
    if (removedIds.length > 0) this.queue.notifyChanged();

    await this.audit.record({
      actorId,
      action: 'blocklist.add',
      entity: 'blocklist',
      entityId: rule.id,
      payload: { type: rule.type, value: rule.value, removedRequests: removedIds.length },
    });
    return rule;
  }

  async removeBlockRule(actorId: string, id: string): Promise<void> {
    const rule = await this.prisma.blocklist.findUnique({ where: { id } });
    if (!rule) throw new ApiError(HttpStatus.NOT_FOUND, 'BLOCK_NOT_FOUND', 'La regla no existe');
    await this.prisma.blocklist.delete({ where: { id } });
    await this.audit.record({
      actorId,
      action: 'blocklist.remove',
      entity: 'blocklist',
      entityId: id,
      payload: { value: rule.value },
    });
  }

  async listUsers(query: string) {
    const users = await this.prisma.user.findMany({
      where: query
        ? {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { username: { contains: query, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: { name: 'asc' },
      take: 50,
      include: {
        userBlocks: {
          where: { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
          take: 1,
        },
      },
    });
    return users.map((u) => ({
      id: u.id,
      name: u.name,
      username: u.username,
      role: u.role,
      status: u.status,
      block: u.userBlocks[0]
        ? { reason: u.userBlocks[0].reason, expiresAt: u.userBlocks[0].expiresAt }
        : null,
    }));
  }

  /** Bloquea a un socio para pedir canciones. Sin minutos, el bloqueo es permanente. */
  async blockUser(
    actorId: string,
    userId: string,
    input: { reason: string; minutes?: number },
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) throw new ApiError(HttpStatus.NOT_FOUND, 'USER_NOT_FOUND', 'El socio no existe');
    await this.prisma.userBlock.create({
      data: {
        userId,
        reason: input.reason,
        createdBy: actorId,
        expiresAt: input.minutes ? new Date(Date.now() + input.minutes * 60_000) : null,
      },
    });
    await this.audit.record({
      actorId,
      action: 'user.block',
      entity: 'user',
      entityId: userId,
      payload: { reason: input.reason, minutes: input.minutes ?? null },
    });
  }

  async unblockUser(actorId: string, userId: string): Promise<void> {
    await this.prisma.userBlock.updateMany({
      where: { userId, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      data: { expiresAt: new Date() },
    });
    await this.audit.record({ actorId, action: 'user.unblock', entity: 'user', entityId: userId });
  }
}

import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { QueueService } from '../requests/queue.service';

export const QUEUE_ROOM = 'queue';

/**
 * Canal de tiempo real. Cada socio autenticado recibe la cola completa al conectarse y
 * después un evento queue:updated cada vez que cambia.
 */
@WebSocketGateway({ cors: { origin: true, credentials: true } })
@Injectable()
export class QueueGateway implements OnGatewayConnection, OnModuleInit {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    @Inject(QueueService) private readonly queue: QueueService,
  ) {}

  onModuleInit(): void {
    this.queue.changes.on('changed', () => {
      void this.broadcast();
    });
  }

  async handleConnection(client: Socket): Promise<void> {
    const token = client.handshake.auth?.token as string | undefined;
    try {
      if (!token) throw new Error('missing token');
      await this.jwt.verifyAsync(token);
    } catch {
      client.emit('error', { code: 'UNAUTHENTICATED' });
      client.disconnect(true);
      return;
    }
    await client.join(QUEUE_ROOM);
    client.emit('queue:updated', await this.queue.snapshot());
  }

  private async broadcast(): Promise<void> {
    if (!this.server) return;
    this.server.to(QUEUE_ROOM).emit('queue:updated', await this.queue.snapshot());
  }
}

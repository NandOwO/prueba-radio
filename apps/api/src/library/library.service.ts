import { HttpStatus, Injectable } from '@nestjs/common';
import { ApiError } from '../common/api-error';
import { PrismaService } from '../prisma.service';

export const MAX_PLAYLISTS_PER_USER = 20;

const trackSelect = {
  id: true,
  title: true,
  artist: true,
  durationMs: true,
  coverUrl: true,
} as const;

@Injectable()
export class LibraryService {
  constructor(private readonly prisma: PrismaService) {}

  async listPlaylists(userId: string) {
    const playlists = await this.prisma.playlist.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { items: true } } },
    });
    return playlists.map((p) => ({ id: p.id, name: p.name, trackCount: p._count.items }));
  }

  async createPlaylist(userId: string, name: string) {
    const count = await this.prisma.playlist.count({ where: { userId } });
    if (count >= MAX_PLAYLISTS_PER_USER) {
      throw new ApiError(
        HttpStatus.CONFLICT,
        'PLAYLIST_LIMIT',
        `Puedes tener hasta ${MAX_PLAYLISTS_PER_USER} playlists`,
      );
    }
    const playlist = await this.prisma.playlist.create({ data: { userId, name } });
    return { id: playlist.id, name: playlist.name, trackCount: 0 };
  }

  async getPlaylist(userId: string, playlistId: string) {
    const playlist = await this.ownPlaylist(userId, playlistId);
    const items = await this.prisma.playlistItem.findMany({
      where: { playlistId },
      orderBy: { position: 'asc' },
      include: { track: { select: trackSelect } },
    });
    return {
      id: playlist.id,
      name: playlist.name,
      items: items.map((i) => ({ ...i.track, addedAt: i.addedAt })),
    };
  }

  async renamePlaylist(userId: string, playlistId: string, name: string) {
    await this.ownPlaylist(userId, playlistId);
    const playlist = await this.prisma.playlist.update({
      where: { id: playlistId },
      data: { name },
    });
    return { id: playlist.id, name: playlist.name };
  }

  async deletePlaylist(userId: string, playlistId: string): Promise<void> {
    await this.ownPlaylist(userId, playlistId);
    await this.prisma.playlist.delete({ where: { id: playlistId } });
  }

  /** Añadir una canción que ya está en la playlist no hace nada (es idempotente). */
  async addToPlaylist(userId: string, playlistId: string, trackId: string): Promise<void> {
    await this.ownPlaylist(userId, playlistId);
    await this.requireTrack(trackId);
    const last = await this.prisma.playlistItem.aggregate({
      where: { playlistId },
      _max: { position: true },
    });
    await this.prisma.playlistItem.upsert({
      where: { playlistId_trackId: { playlistId, trackId } },
      create: { playlistId, trackId, position: (last._max.position ?? 0) + 1 },
      update: {},
    });
  }

  async removeFromPlaylist(userId: string, playlistId: string, trackId: string): Promise<void> {
    await this.ownPlaylist(userId, playlistId);
    await this.prisma.playlistItem.deleteMany({ where: { playlistId, trackId } });
  }

  async listFavorites(userId: string) {
    const rows = await this.prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { track: { select: trackSelect } },
    });
    return rows.map((r) => r.track);
  }

  async addFavorite(userId: string, trackId: string): Promise<void> {
    await this.requireTrack(trackId);
    await this.prisma.favorite.upsert({
      where: { userId_trackId: { userId, trackId } },
      create: { userId, trackId },
      update: {},
    });
  }

  async removeFavorite(userId: string, trackId: string): Promise<void> {
    await this.prisma.favorite.deleteMany({ where: { userId, trackId } });
  }

  /** Estado de guardado de una canción para el socio: si es favorita y en qué playlists está. */
  async saveState(userId: string, trackId: string) {
    const [favorite, memberships] = await Promise.all([
      this.prisma.favorite.findUnique({ where: { userId_trackId: { userId, trackId } } }),
      this.prisma.playlistItem.findMany({
        where: { trackId, playlist: { userId } },
        select: { playlistId: true },
      }),
    ]);
    return { favorite: favorite !== null, playlistIds: memberships.map((m) => m.playlistId) };
  }

  private async ownPlaylist(userId: string, playlistId: string) {
    const playlist = await this.prisma.playlist.findFirst({ where: { id: playlistId, userId } });
    if (!playlist) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'PLAYLIST_NOT_FOUND', 'La playlist no existe');
    }
    return playlist;
  }

  private async requireTrack(trackId: string): Promise<void> {
    const track = await this.prisma.track.findUnique({
      where: { id: trackId },
      select: { id: true },
    });
    if (!track) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'TRACK_NOT_FOUND', 'La canción no existe');
    }
  }
}

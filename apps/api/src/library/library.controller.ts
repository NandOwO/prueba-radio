import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user';
import { RolesGuard } from '../auth/roles.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { LibraryService } from './library.service';

const nameSchema = z.object({ name: z.string().trim().min(1).max(60) });
const trackSchema = z.object({ trackId: z.string().min(1).max(64) });

type AuthedRequest = FastifyRequest & { user: CurrentUser };

@Controller('library')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LibraryController {
  constructor(private readonly library: LibraryService) {}

  @Get('playlists')
  listPlaylists(@Req() req: AuthedRequest) {
    return this.library.listPlaylists(req.user.id);
  }

  @Post('playlists')
  createPlaylist(
    @Body(new ZodValidationPipe(nameSchema)) body: z.infer<typeof nameSchema>,
    @Req() req: AuthedRequest,
  ) {
    return this.library.createPlaylist(req.user.id, body.name);
  }

  @Get('playlists/:id')
  getPlaylist(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.library.getPlaylist(req.user.id, id);
  }

  @Patch('playlists/:id')
  renamePlaylist(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(nameSchema)) body: z.infer<typeof nameSchema>,
    @Req() req: AuthedRequest,
  ) {
    return this.library.renamePlaylist(req.user.id, id, body.name);
  }

  @Delete('playlists/:id')
  @HttpCode(204)
  deletePlaylist(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.library.deletePlaylist(req.user.id, id);
  }

  @Post('playlists/:id/items')
  @HttpCode(204)
  addToPlaylist(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(trackSchema)) body: z.infer<typeof trackSchema>,
    @Req() req: AuthedRequest,
  ) {
    return this.library.addToPlaylist(req.user.id, id, body.trackId);
  }

  @Delete('playlists/:id/items/:trackId')
  @HttpCode(204)
  removeFromPlaylist(
    @Param('id') id: string,
    @Param('trackId') trackId: string,
    @Req() req: AuthedRequest,
  ) {
    return this.library.removeFromPlaylist(req.user.id, id, trackId);
  }

  @Get('favorites')
  listFavorites(@Req() req: AuthedRequest) {
    return this.library.listFavorites(req.user.id);
  }

  @Put('favorites/:trackId')
  @HttpCode(204)
  addFavorite(@Param('trackId') trackId: string, @Req() req: AuthedRequest) {
    return this.library.addFavorite(req.user.id, trackId);
  }

  @Delete('favorites/:trackId')
  @HttpCode(204)
  removeFavorite(@Param('trackId') trackId: string, @Req() req: AuthedRequest) {
    return this.library.removeFavorite(req.user.id, trackId);
  }

  @Get('tracks/:trackId/save-state')
  saveState(@Param('trackId') trackId: string, @Req() req: AuthedRequest) {
    return this.library.saveState(req.user.id, trackId);
  }
}

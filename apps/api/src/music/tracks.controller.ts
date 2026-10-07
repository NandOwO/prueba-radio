import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { MusicSearchService } from './music-search.service';

const searchSchema = z.object({
  q: z.string().trim().min(2).max(100),
});

@Controller('tracks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TracksController {
  constructor(private readonly search: MusicSearchService) {}

  @Get('search')
  async searchTracks(
    @Query(new ZodValidationPipe(searchSchema)) query: z.infer<typeof searchSchema>,
  ) {
    const items = await this.search.search(query.q);
    return { items };
  }
}

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { loadConfig } from '../config';
import { PrismaService } from '../prisma.service';
import { MUSIC_PROVIDER } from './music-provider.token';
import { MusicSearchService } from './music-search.service';
import { TracksController } from './tracks.controller';
import { YouTubeMusicAdapter } from './youtube.adapter';
import { YouTubeQuotaService } from './youtube-quota.service';

@Module({
  imports: [AuthModule],
  controllers: [TracksController],
  providers: [
    PrismaService,
    YouTubeQuotaService,
    {
      provide: MUSIC_PROVIDER,
      inject: [YouTubeQuotaService],
      useFactory: (quota: YouTubeQuotaService) =>
        new YouTubeMusicAdapter(loadConfig().youtubeApiKey ?? '', fetch, (units) =>
          quota.reserve(units),
        ),
    },
    MusicSearchService,
  ],
  exports: [MUSIC_PROVIDER, MusicSearchService],
})
export class MusicModule {}

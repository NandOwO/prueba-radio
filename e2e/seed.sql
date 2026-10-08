TRUNCATE requests, search_cache, tracks, blocklist, user_blocks, playlist_items, playlists, favorites, playback_state, audit_log, sessions, users, settings RESTART IDENTITY CASCADE;
INSERT INTO tracks (id, provider, "providerTrackId", title, artist, "durationMs", "coverUrl") VALUES
 ('e2e-trk-1','youtube','e2e1','Don''t Stop Me Now','Queen',209000,NULL),
 ('e2e-trk-2','youtube','e2e2','Bohemian Rhapsody','Queen',354000,NULL),
 ('e2e-trk-3','youtube','e2e3','Levitating','Dua Lipa',203000,NULL);
INSERT INTO search_cache (query, "trackIds", "cachedAt") VALUES ('queen', '["e2e-trk-1","e2e-trk-2"]', now());

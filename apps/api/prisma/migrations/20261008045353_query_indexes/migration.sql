-- CreateIndex
CREATE INDEX "favorites_trackId_idx" ON "favorites"("trackId");

-- CreateIndex
CREATE INDEX "playlist_items_trackId_idx" ON "playlist_items"("trackId");

-- CreateIndex
CREATE INDEX "requests_status_playedAt_idx" ON "requests"("status", "playedAt");

-- CreateIndex
CREATE INDEX "requests_trackId_idx" ON "requests"("trackId");

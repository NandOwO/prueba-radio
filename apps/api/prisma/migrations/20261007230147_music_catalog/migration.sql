-- CreateTable
CREATE TABLE "tracks" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerTrackId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "coverUrl" TEXT,
    "cachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tracks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_cache" (
    "query" TEXT NOT NULL,
    "trackIds" JSONB NOT NULL,
    "cachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_cache_pkey" PRIMARY KEY ("query")
);

-- CreateTable
CREATE TABLE "quota_usage" (
    "day" TEXT NOT NULL,
    "units" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "quota_usage_pkey" PRIMARY KEY ("day")
);

-- CreateIndex
CREATE UNIQUE INDEX "tracks_provider_providerTrackId_key" ON "tracks"("provider", "providerTrackId");

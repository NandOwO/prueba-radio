-- CreateTable
CREATE TABLE "playback_state" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "paused" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "playback_state_pkey" PRIMARY KEY ("id")
);

export interface PlaybackPlan {
  /** Video que hay que cargar antes de ejecutar el comando. */
  load?: string;
  command: 'play' | 'pause';
}

/**
 * Decide qué hacer con el reproductor a partir de la cola.
 * Sin canción actual, el reproductor se pausa y no carga nada.
 */
export function planPlayback(input: {
  currentVideoId: string | null;
  paused: boolean;
  loadedVideoId: string | null;
}): PlaybackPlan {
  if (!input.currentVideoId) return { command: 'pause' };
  const plan: PlaybackPlan = { command: input.paused ? 'pause' : 'play' };
  if (input.currentVideoId !== input.loadedVideoId) plan.load = input.currentVideoId;
  return plan;
}

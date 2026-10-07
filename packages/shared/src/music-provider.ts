/** Canción tal como la normaliza PulsoFM, sea cual sea el proveedor de música. */
export interface Track {
  provider: string;
  providerTrackId: string;
  title: string;
  artist: string;
  durationMs: number;
  coverUrl: string | null;
}

/** Contrato de proveedor de música (buscar y reproducir). Ver docs/plan-implementacion.md, sección 3. */
export interface MusicProvider {
  readonly name: string;
  search(query: string, limit?: number): Promise<Track[]>;
}

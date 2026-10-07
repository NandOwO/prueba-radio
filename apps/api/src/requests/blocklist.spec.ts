import { describe, expect, it } from 'vitest';
import { matchBlocklist } from './blocklist.service';

const song = { providerTrackId: 'vid1', title: 'Bad Romance', artist: 'Lady Gaga' };

describe('matchBlocklist', () => {
  it('bloquea por ID de canción', () => {
    expect(matchBlocklist(song, [{ type: 'track', value: 'vid1', reason: 'Letra' }])).toBe('Letra');
  });

  it('bloquea por artista sin importar mayúsculas', () => {
    expect(
      matchBlocklist(song, [{ type: 'artist', value: 'lady gaga', reason: null }]),
    ).toBeTruthy();
  });

  it('bloquea por palabra clave en título o artista', () => {
    expect(
      matchBlocklist(song, [{ type: 'keyword', value: 'ROMANCE', reason: null }]),
    ).toBeTruthy();
    expect(matchBlocklist(song, [{ type: 'keyword', value: 'gaga', reason: null }])).toBeTruthy();
  });

  it('no bloquea si nada coincide, ni con palabras clave vacías', () => {
    expect(matchBlocklist(song, [{ type: 'artist', value: 'Queen', reason: null }])).toBeNull();
    expect(matchBlocklist(song, [{ type: 'keyword', value: '  ', reason: null }])).toBeNull();
  });
});

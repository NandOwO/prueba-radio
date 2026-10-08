import { describe, expect, it } from 'vitest';
import { planPlayback } from '../display/playbackRules';

describe('planPlayback', () => {
  it('carga y reproduce la canción nueva', () => {
    expect(planPlayback({ currentVideoId: 'v1', paused: false, loadedVideoId: null })).toEqual({
      load: 'v1',
      command: 'play',
    });
  });

  it('no vuelve a cargar la misma canción', () => {
    expect(planPlayback({ currentVideoId: 'v1', paused: false, loadedVideoId: 'v1' })).toEqual({
      command: 'play',
    });
  });

  it('pausa cuando la radio está en pausa, sin cambiar de canción', () => {
    expect(planPlayback({ currentVideoId: 'v1', paused: true, loadedVideoId: 'v1' })).toEqual({
      command: 'pause',
    });
  });

  it('carga la nueva canción y la deja en pausa si la radio está pausada', () => {
    expect(planPlayback({ currentVideoId: 'v2', paused: true, loadedVideoId: 'v1' })).toEqual({
      load: 'v2',
      command: 'pause',
    });
  });

  it('pausa sin cargar nada cuando no hay canción actual', () => {
    expect(planPlayback({ currentVideoId: null, paused: false, loadedVideoId: 'v1' })).toEqual({
      command: 'pause',
    });
  });
});

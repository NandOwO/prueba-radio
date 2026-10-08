/** Envoltorio mínimo del YouTube IFrame Player API. Sin clave: el reproductor es gratuito. */

interface YtNamespace {
  Player: new (el: HTMLElement, options: Record<string, unknown>) => YtRaw;
  PlayerState: { ENDED: number };
}

interface YtRaw {
  loadVideoById(id: string): void;
  playVideo(): void;
  pauseVideo(): void;
  getCurrentTime(): number;
  getDuration(): number;
  destroy(): void;
}

declare global {
  interface Window {
    YT?: YtNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<void> | null = null;

export function loadYouTubeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  if (!apiPromise) {
    apiPromise = new Promise<void>((resolve, reject) => {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previous?.();
        resolve();
      };
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.onerror = () => {
        apiPromise = null;
        reject(new Error('YOUTUBE_API_LOAD_FAILED'));
      };
      document.head.appendChild(script);
    });
  }
  return apiPromise;
}

export interface YtPlayer {
  load(videoId: string): void;
  play(): void;
  pause(): void;
  progress(): { current: number; duration: number };
  destroy(): void;
}

export interface YtHandlers {
  onReady(): void;
  onEnded(): void;
  onError(): void;
}

export async function createYouTubePlayer(
  el: HTMLElement,
  handlers: YtHandlers,
): Promise<YtPlayer> {
  await loadYouTubeApi();
  const YT = window.YT!;
  const raw = await new Promise<YtRaw>((resolve) => {
    const player: YtRaw = new YT.Player(el, {
      width: '100%',
      height: '100%',
      playerVars: { autoplay: 1, controls: 0, playsinline: 1, rel: 0, modestbranding: 1 },
      events: {
        onReady: () => {
          resolve(player);
          handlers.onReady();
        },
        onStateChange: (e: { data: number }) => {
          if (e.data === YT.PlayerState.ENDED) handlers.onEnded();
        },
        onError: () => handlers.onError(),
      },
    });
  });
  return {
    load: (videoId) => raw.loadVideoById(videoId),
    play: () => raw.playVideo(),
    pause: () => raw.pauseVideo(),
    progress: () => ({ current: raw.getCurrentTime(), duration: raw.getDuration() }),
    destroy: () => raw.destroy(),
  };
}

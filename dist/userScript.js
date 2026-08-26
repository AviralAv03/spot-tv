/**
 * Spotify TV (Ad-Free) — TizenBrew Userscript
 * Injected into tv.spotify.com / open.spotify.com
 */
(function () {
  'use strict';

  console.log('[Spotify TV] TizenBrew Userscript initialized');

  // ─── 1. Automatic Ad Muter & Skipper ──────────────────────────────────────

  let isAdPlaying = false;
  let previousVolume = 1.0;

  function checkAndHandleAds() {
    try {
      const nowPlaying = document.querySelector('[data-testid="now-playing-widget"]');
      const adIndicator = document.querySelector('[data-testid="ad-indicator"]') ||
                          document.querySelector('[aria-label="Advertisement"]') ||
                          document.querySelector('.advertisement') ||
                          (nowPlaying && nowPlaying.innerText && nowPlaying.innerText.toLowerCase().includes('advertisement'));

      const mediaElements = document.querySelectorAll('audio, video');

      if (adIndicator) {
        if (!isAdPlaying) {
          console.log('[Spotify TV] Ad detected! Muting audio & attempting skip...');
          isAdPlaying = true;

          mediaElements.forEach(el => {
            if (el.volume > 0) {
              previousVolume = el.volume;
            }
            el.volume = 0;
            el.muted = true;
          });

          // Attempt to click skip button
          setTimeout(() => {
            const skipBtn = document.querySelector('[data-testid="control-button-skip-forward"]') ||
                            document.querySelector('[aria-label="Next"]') ||
                            document.querySelector('button[aria-label="Next track"]');
            if (skipBtn) {
              skipBtn.click();
            }
          }, 500);
        }
      } else {
        if (isAdPlaying) {
          console.log('[Spotify TV] Ad ended. Restoring audio...');
          isAdPlaying = false;

          mediaElements.forEach(el => {
            el.muted = false;
            el.volume = previousVolume || 1.0;
          });
        }
      }
    } catch (e) {
      console.warn('[Spotify TV] Ad blocker check error:', e);
    }
  }

  setInterval(checkAndHandleAds, 800);

  // ─── 2. Samsung TV Remote Media Keys Mapping ───────────────────────────────

  window.addEventListener('keydown', function (e) {
    const key = e.key || '';
    const code = e.keyCode;

    // MediaPlay / MediaPause / MediaPlayPause (10252, 19, 10087)
    if (key === 'MediaPlayPause' || key === 'MediaPlay' || key === 'MediaPause' || code === 10252 || code === 19) {
      e.preventDefault();
      const playPauseBtn = document.querySelector('[data-testid="control-button-playpause"]') ||
                            document.querySelector('button[data-testid="play-button"]') ||
                            document.querySelector('button[aria-label="Play"]') ||
                            document.querySelector('button[aria-label="Pause"]');
      if (playPauseBtn) playPauseBtn.click();
    }

    // MediaTrackNext / MediaFastForward (10233, 10232)
    if (key === 'MediaTrackNext' || key === 'MediaFastForward' || code === 10233 || code === 10232) {
      e.preventDefault();
      const nextBtn = document.querySelector('[data-testid="control-button-skip-forward"]') ||
                      document.querySelector('button[aria-label="Next"]') ||
                      document.querySelector('button[aria-label="Next track"]');
      if (nextBtn) nextBtn.click();
    }

    // MediaTrackPrevious / MediaRewind (10234, 10235)
    if (key === 'MediaTrackPrevious' || key === 'MediaRewind' || code === 10234 || code === 10235) {
      e.preventDefault();
      const prevBtn = document.querySelector('[data-testid="control-button-skip-back"]') ||
                      document.querySelector('button[aria-label="Previous"]') ||
                      document.querySelector('button[aria-label="Previous track"]');
      if (prevBtn) prevBtn.click();
    }
  });

})();

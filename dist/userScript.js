/**
 * Spotify TV (Ad-Free & Spatial Remote Navigation) — TizenBrew Userscript
 * Injected into open.spotify.com
 */
(function () {
  'use strict';

  console.log('[Spotify TV] Spatial Navigation & Ad-Blocker initialized');

  // ─── 1. TV Focus Style Injection ──────────────────────────────────────────

  const style = document.createElement('style');
  style.id = 'tizen-spotify-tv-styles';
  style.textContent = `
    .tv-focused {
      outline: 4px solid #1db954 !important;
      outline-offset: 4px !important;
      transform: scale(1.06) !important;
      transition: transform 0.15s cubic-bezier(0.2, 0, 0, 1), outline 0.15s ease !important;
      z-index: 99999 !important;
      box-shadow: 0 0 20px rgba(29, 185, 84, 0.6) !important;
    }
  `;
  document.head.appendChild(style);

  // ─── 2. Spatial 2D D-Pad Navigation Engine ────────────────────────────────

  let currentFocusedElement = null;

  function getFocusableElements() {
    const selectors = [
      'a[href]',
      'button:not([disabled])',
      '[role="button"]:not([disabled])',
      '[role="link"]',
      '[data-testid="play-button"]',
      '[data-testid="control-button-playpause"]',
      '[data-testid="track-row"]',
      'input:not([disabled])',
      '[tabindex="0"]'
    ];

    const elements = Array.from(document.querySelectorAll(selectors.join(',')));
    return elements.filter(el => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        style.opacity !== '0'
      );
    });
  }

  function setFocus(element) {
    if (currentFocusedElement) {
      currentFocusedElement.classList.remove('tv-focused');
    }
    currentFocusedElement = element;
    if (currentFocusedElement) {
      currentFocusedElement.classList.add('tv-focused');
      currentFocusedElement.focus();
      currentFocusedElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center'
      });
    }
  }

  function findNextElement(direction) {
    const focusables = getFocusableElements();
    if (focusables.length === 0) return null;

    if (!currentFocusedElement || !document.body.contains(currentFocusedElement)) {
      return focusables[0];
    }

    const curRect = currentFocusedElement.getBoundingClientRect();
    const curCenter = {
      x: curRect.left + curRect.width / 2,
      y: curRect.top + curRect.height / 2
    };

    let bestCandidate = null;
    let minDistance = Infinity;

    for (const el of focusables) {
      if (el === currentFocusedElement) continue;

      const rect = el.getBoundingClientRect();
      const center = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };

      const dx = center.x - curCenter.x;
      const dy = center.y - curCenter.y;

      let isValidDirection = false;
      let primaryDist = 0;
      let secondaryDist = 0;

      switch (direction) {
        case 'right':
          isValidDirection = dx > 15;
          primaryDist = dx;
          secondaryDist = Math.abs(dy);
          break;
        case 'left':
          isValidDirection = dx < -15;
          primaryDist = -dx;
          secondaryDist = Math.abs(dy);
          break;
        case 'down':
          isValidDirection = dy > 15;
          primaryDist = dy;
          secondaryDist = Math.abs(dx);
          break;
        case 'up':
          isValidDirection = dy < -15;
          primaryDist = -dy;
          secondaryDist = Math.abs(dx);
          break;
      }

      if (isValidDirection) {
        // Weighted Manhattan Distance (favor primary direction)
        const dist = primaryDist + secondaryDist * 2.5;
        if (dist < minDistance) {
          minDistance = dist;
          bestCandidate = el;
        }
      }
    }

    return bestCandidate;
  }

  // ─── 3. Remote Control Key Listener ───────────────────────────────────────

  window.addEventListener('keydown', function (e) {
    const key = e.key;
    const code = e.keyCode;

    // Arrow Keys / D-Pad
    if (key === 'ArrowRight' || code === 39) {
      e.preventDefault();
      const next = findNextElement('right');
      if (next) setFocus(next);
    } else if (key === 'ArrowLeft' || code === 37) {
      e.preventDefault();
      const next = findNextElement('left');
      if (next) setFocus(next);
    } else if (key === 'ArrowDown' || code === 40) {
      e.preventDefault();
      const next = findNextElement('down');
      if (next) setFocus(next);
    } else if (key === 'ArrowUp' || code === 38) {
      e.preventDefault();
      const next = findNextElement('up');
      if (next) setFocus(next);
    }

    // Select / OK (Enter / KeyCode 13)
    if (key === 'Enter' || code === 13) {
      if (currentFocusedElement) {
        e.preventDefault();
        currentFocusedElement.click();
      }
    }

    // Media Keys (Play / Pause / Next / Prev)
    if (key === 'MediaPlayPause' || key === 'MediaPlay' || key === 'MediaPause' || code === 10252 || code === 19) {
      e.preventDefault();
      const playPauseBtn = document.querySelector('[data-testid="control-button-playpause"]') ||
                            document.querySelector('button[data-testid="play-button"]');
      if (playPauseBtn) playPauseBtn.click();
    }

    if (key === 'MediaTrackNext' || key === 'MediaFastForward' || code === 10233 || code === 10232) {
      e.preventDefault();
      const nextBtn = document.querySelector('[data-testid="control-button-skip-forward"]');
      if (nextBtn) nextBtn.click();
    }

    if (key === 'MediaTrackPrevious' || key === 'MediaRewind' || code === 10234 || code === 10235) {
      e.preventDefault();
      const prevBtn = document.querySelector('[data-testid="control-button-skip-back"]');
      if (prevBtn) prevBtn.click();
    }
  }, true); // useCapture: true to intercept before Spotify container

  // Auto-focus first element after Spotify loads
  setTimeout(() => {
    const focusables = getFocusableElements();
    if (focusables.length > 0) {
      setFocus(focusables[0]);
    }
  }, 2500);

  // ─── 4. Automatic Ad Muter & Skipper ──────────────────────────────────────

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
            if (el.volume > 0) previousVolume = el.volume;
            el.volume = 0;
            el.muted = true;
          });

          setTimeout(() => {
            const skipBtn = document.querySelector('[data-testid="control-button-skip-forward"]') ||
                            document.querySelector('button[aria-label="Next track"]');
            if (skipBtn) skipBtn.click();
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
    } catch (e) {}
  }

  setInterval(checkAndHandleAds, 800);

})();

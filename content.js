/**
 * YouTube Keyboard Navigation & Playback Controller - Omarchy Edition
 * Full keyboard navigation for feeds, search, watch page recommendations, on-page icons, and video player.
 */

(function () {
  'use strict';

  window.__yt_nav_loaded = true;

  // State
  let currentCard = null;
  let currentNavIndex = -1;
  let currentNavItem = null;
  let watchFocus = 'player'; // 'player' | 'nav' | 'scroll'
  let gLeaderActive = false;
  let gLeaderTimer = null;
  let osdTimer = null;

  // DOM Elements
  let osdElement = null;
  let modalBackdrop = null;

  const VIDEO_CARD_SELECTORS = [
    'yt-lockup-view-model',
    'ytd-media-lockup-renderer',
    'ytd-rich-item-renderer',
    'ytd-video-renderer',
    'ytd-compact-video-renderer',
    'ytd-grid-video-renderer',
    'ytd-reel-item-renderer',
    'ytm-shorts-lockup-view-model',
    'ytm-shorts-lockup-view-model-v2',
    'ytd-playlist-renderer',
    'ytd-radio-renderer',
    'ytd-channel-renderer'
  ].join(',');

  const SKIP_AD_SELECTORS = [
    // Modern desktop skip buttons and containers
    'button.ytp-ad-skip-button-modern',
    '.ytp-ad-skip-button-modern',
    'button.ytp-skip-ad-button',
    '.ytp-skip-ad-button',
    'button.ytp-ad-skip-button',
    '.ytp-ad-skip-button',
    '.ytp-ad-skip-button-slot button',
    '.ytp-ad-skip-button-slot [role="button"]',
    '.ytp-ad-skip-button-slot div',
    '.ytp-ad-skip-button-slot',
    '.ytp-ad-skip-button-container button',
    '.ytp-ad-skip-button-container [role="button"]',
    '.ytp-ad-skip-button-container div',
    '.ytp-ad-skip-button-container',
    '.ytp-ad-player-overlay-skip-or-preview button',
    '.ytp-ad-player-overlay-skip-or-preview-modern button',
    '.ytp-ad-player-overlay-skip-or-preview',
    '.ytp-ad-player-overlay-skip-or-preview-modern',
    'button.ytp-ad-skip-button-icon',
    '.ytp-ad-skip-button-icon-modern',
    'button[class*="skip-button" i]',
    'div[class*="skip-button" i]',
    '[class*="skip-ad-button" i]',
    '[class*="ad-skip-button" i]',
    // Survey skip
    'button.ytp-ad-survey-skip-button',
    '.ytp-ad-survey-skip-button',
    '.ytp-ad-survey button',
    '.ytp-ad-survey-questions button',
    // Interstitial dismiss & close buttons (specifically dismiss and skip, NOT advertiser CTAs)
    'button.ytp-ad-action-interstitial-dismiss-button',
    '.ytp-ad-action-interstitial-dismiss-button',
    'button.ytp-ad-action-interstitial-skip-button',
    '.ytp-ad-action-interstitial-skip-button',
    'button.ytp-ad-overlay-close-button',
    '.ytp-ad-overlay-close-button',
    '.ytp-ad-overlay-close-container button',
    // Legacy selectors
    '.videoAdUiSkipButton',
    'button.videoAdUiSkipButton',
    'button[aria-label*="skip ad" i]',
    'button[aria-label*="skip" i]',
    '[aria-label*="skip ad" i]',
    '.ytp-ad-text.ytp-ad-skip-button-text',
    '.ytp-ad-skip-button-text'
  ];

  // Initialise
  function init() {
    injectExtensionStyles();
    createOSD();
    createHelpModal();
    setupEventListeners();
  }

  // Page detection helpers
  function isWatchPage() {
    return window.location.pathname.startsWith('/watch');
  }

  function isShortsPage() {
    return window.location.pathname.startsWith('/shorts');
  }

  function isBrowsePage() {
    return !isWatchPage() && !isShortsPage();
  }

  function isTyping(e) {
    const target = e.target;
    if (!target) return false;
    if (target.isContentEditable) return true;
    const tag = (target.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select';
  }

  function getPlayer() {
    return document.getElementById('movie_player') || window.movie_player;
  }

  function getVideo() {
    return document.querySelector('video.html5-main-video') || document.querySelector('video');
  }

  function isElementVisible(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
  }

  // Dynamic CSS Injection (guarantees fresh styles without Chromium caching issues)
  function injectExtensionStyles() {
    if (document.getElementById('yt-kbd-injected-styles')) return;
    const style = document.createElement('style');
    style.id = 'yt-kbd-injected-styles';
    style.textContent = `
      /* Tiled / Windowed Fullscreen Mode (fills the browser window without OS fullscreen) */
      html.yt-kbd-tiled-html,
      body.yt-kbd-tiled-fullscreen {
        overflow: hidden !important;
        width: 100vw !important;
        height: 100vh !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      body.yt-kbd-tiled-fullscreen #movie_player,
      body.yt-kbd-tiled-fullscreen .html5-video-player {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        max-width: 100vw !important;
        max-height: 100vh !important;
        z-index: 2147483640 !important;
        background: #000000 !important;
      }
      body.yt-kbd-tiled-fullscreen .html5-video-container {
        width: 100% !important;
        height: 100% !important;
        position: relative !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }
      body.yt-kbd-tiled-fullscreen video.html5-main-video {
        position: relative !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        max-width: 100% !important;
        max-height: 100% !important;
        object-fit: contain !important;
        display: block !important;
      }
      body.yt-kbd-tiled-fullscreen .ytp-chrome-bottom {
        position: absolute !important;
        bottom: 0 !important;
        left: 0 !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }
      body.yt-kbd-tiled-fullscreen #masthead-container,
      body.yt-kbd-tiled-fullscreen #below,
      body.yt-kbd-tiled-fullscreen #secondary,
      body.yt-kbd-tiled-fullscreen #related,
      body.yt-kbd-tiled-fullscreen #comments,
      body.yt-kbd-tiled-fullscreen ytd-masthead {
        display: none !important;
      }

      /* Black Screen Prevention: ensure main video is never hidden when playing */
      #movie_player:not(.ad-showing):not(.ad-interrupting) video.html5-main-video {
        opacity: 1 !important;
        visibility: visible !important;
        display: block !important;
      }
      /* Suppress dark interstitial overlays and backgrounds */
      #movie_player:not(.ad-showing):not(.ad-interrupting) .ytp-ad-action-interstitial,
      .ytp-ad-action-interstitial-background {
        display: none !important;
        pointer-events: none !important;
      }

      /* Suppress feed inline video preview overlays to prevent video overlay collisions and decoder lag */
      ytd-video-preview,
      ytd-inline-preview-renderer,
      #inline-preview-player,
      ytd-video-preview-renderer,
      #video-preview-container,
      div#video-preview,
      .ytd-video-preview {
        display: none !important;
        pointer-events: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
      }

      /* Highlight for selected elements (video cards, icons, buttons) */
      .yt-kbd-selected {
        outline: 3px solid #ff0033 !important;
        outline-offset: 3px !important;
        border-radius: 12px !important;
        box-shadow: 0 0 20px rgba(255, 0, 51, 0.55), 0 2px 10px rgba(0, 0, 0, 0.7) !important;
        position: relative !important;
        z-index: 10 !important;
      }

      /* Floating badge indicator on selected item */
      .yt-kbd-selected::before {
        content: attr(data-yt-kbd-badge);
        position: absolute;
        top: 8px;
        right: 8px;
        background: #ff0033;
        color: #ffffff;
        font-family: "Roboto", "Segoe UI", Arial, sans-serif;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.5px;
        padding: 3px 9px;
        border-radius: 6px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.7);
        z-index: 10000;
        pointer-events: none;
        animation: yt-kbd-pop 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }

      ytd-topbar-logo-renderer #logo.yt-kbd-selected::before,
      a#logo.yt-kbd-selected::before {
        top: 12px !important;
        right: 4px !important;
      }

      #owner.yt-kbd-selected::before,
      like-button-view-model.yt-kbd-selected::before,
      #subscribe-button.yt-kbd-selected::before {
        top: -12px !important;
        right: 0 !important;
      }

      @keyframes yt-kbd-pop {
        0% { transform: scale(0.6); opacity: 0; }
        100% { transform: scale(1); opacity: 1; }
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  // Trusted Types Policy for YouTube CSP compatibility
  let ttPolicy = null;
  if (window.trustedTypes && typeof window.trustedTypes.createPolicy === 'function') {
    try {
      ttPolicy = window.trustedTypes.createPolicy('yt-nav-policy', {
        createHTML: s => s
      });
    } catch (e) {
      ttPolicy = window.trustedTypes.defaultPolicy;
    }
  }

  function setSafeHTML(elem, htmlStr) {
    if (ttPolicy && typeof ttPolicy.createHTML === 'function') {
      elem.innerHTML = ttPolicy.createHTML(htmlStr);
    } else {
      try {
        elem.innerHTML = htmlStr;
      } catch (e) {
        elem.textContent = '';
      }
    }
  }

  // OSD Feedback Toast
  function createOSD() {
    if (document.getElementById('yt-kbd-osd')) {
      osdElement = document.getElementById('yt-kbd-osd');
      return;
    }
    if (!document.body) return;
    osdElement = document.createElement('div');
    osdElement.id = 'yt-kbd-osd';
    const iconSpan = document.createElement('span');
    iconSpan.className = 'osd-icon';
    iconSpan.textContent = '▶';
    const textSpan = document.createElement('span');
    textSpan.className = 'osd-text';
    osdElement.appendChild(iconSpan);
    osdElement.appendChild(textSpan);
    document.body.appendChild(osdElement);
  }

  function showOSD(text, icon = '▶') {
    if (!osdElement) createOSD();
    if (!osdElement) return;

    const fsTarget = document.fullscreenElement || document.body;
    if (fsTarget && osdElement.parentNode !== fsTarget) {
      fsTarget.appendChild(osdElement);
    }

    const iconSpan = osdElement.querySelector('.osd-icon');
    const textSpan = osdElement.querySelector('.osd-text');
    if (iconSpan) iconSpan.textContent = icon;
    if (textSpan) textSpan.textContent = text;

    osdElement.classList.add('show');
    clearTimeout(osdTimer);
    osdTimer = setTimeout(() => {
      osdElement.classList.remove('show');
    }, 1000);
  }

  // Help Modal Cheatsheet
  function createHelpModal() {
    if (document.getElementById('yt-kbd-modal-backdrop')) {
      modalBackdrop = document.getElementById('yt-kbd-modal-backdrop');
      return;
    }
    if (!document.body) return;

    modalBackdrop = document.createElement('div');
    modalBackdrop.id = 'yt-kbd-modal-backdrop';
    setSafeHTML(modalBackdrop, `
      <div id="yt-kbd-modal">
        <div class="yt-kbd-header">
          <h2><span>⌨</span> YouTube Keyboard Shortcuts — Omarchy Edition</h2>
          <button class="yt-kbd-close-btn" id="yt-kbd-close">&times;</button>
        </div>

        <div class="yt-kbd-section">
          <div class="yt-kbd-section-title">Playback & Ad Controls</div>
          <div class="yt-kbd-shortcut-list">
            <div class="yt-kbd-shortcut-row">
              <span class="yt-kbd-desc">Play / Pause (Space is page scroll)</span>
              <div class="yt-kbd-keys"><kbd class="yt-kbd-key">Shift+K</kbd> or <kbd class="yt-kbd-key">k</kbd></div>
            </div>
            <div class="yt-kbd-shortcut-row">
              <span class="yt-kbd-desc">Skip Video Ad Immediately</span>
              <div class="yt-kbd-keys"><kbd class="yt-kbd-key">Shift+A</kbd> or <kbd class="yt-kbd-key">a</kbd></div>
            </div>
            <div class="yt-kbd-shortcut-row">
              <span class="yt-kbd-desc">Tiled Fullscreen (Windowed - stays in tile)</span>
              <div class="yt-kbd-keys"><kbd class="yt-kbd-key">Shift+F</kbd> or <kbd class="yt-kbd-key">w</kbd></div>
            </div>
            <div class="yt-kbd-shortcut-row">
              <span class="yt-kbd-desc">Native OS Fullscreen</span>
              <div class="yt-kbd-keys"><kbd class="yt-kbd-key">f</kbd></div>
            </div>
            <div class="yt-kbd-shortcut-row">
              <span class="yt-kbd-desc">Seek ±5 seconds</span>
              <div class="yt-kbd-keys"><kbd class="yt-kbd-key">←</kbd> <kbd class="yt-kbd-key">→</kbd></div>
            </div>
            <div class="yt-kbd-shortcut-row">
              <span class="yt-kbd-desc">Seek ±10 seconds</span>
              <div class="yt-kbd-keys"><kbd class="yt-kbd-key">j</kbd> <kbd class="yt-kbd-key">l</kbd></div>
            </div>
            <div class="yt-kbd-shortcut-row">
              <span class="yt-kbd-desc">Volume Up / Down (5%)</span>
              <div class="yt-kbd-keys"><kbd class="yt-kbd-key">↑</kbd> <kbd class="yt-kbd-key">↓</kbd></div>
            </div>
            <div class="yt-kbd-shortcut-row">
              <span class="yt-kbd-desc">Mute / Unmute</span>
              <div class="yt-kbd-keys"><kbd class="yt-kbd-key">m</kbd></div>
            </div>
            <div class="yt-kbd-shortcut-row">
              <span class="yt-kbd-desc">Seek to 0% – 90%</span>
              <div class="yt-kbd-keys"><kbd class="yt-kbd-key">0</kbd> – <kbd class="yt-kbd-key">9</kbd></div>
            </div>
            <div class="yt-kbd-shortcut-row">
              <span class="yt-kbd-desc">Playback Speed (±0.25x)</span>
              <div class="yt-kbd-keys"><kbd class="yt-kbd-key">&gt;</kbd> <kbd class="yt-kbd-key">&lt;</kbd> or <kbd class="yt-kbd-key">]</kbd> <kbd class="yt-kbd-key">[</kbd></div>
            </div>
            <div class="yt-kbd-shortcut-row">
              <span class="yt-kbd-desc">Next / Previous Video</span>
              <div class="yt-kbd-keys"><kbd class="yt-kbd-key">Shift+N</kbd> <kbd class="yt-kbd-key">Shift+P</kbd></div>
            </div>
            <div class="yt-kbd-shortcut-row">
              <span class="yt-kbd-desc">Theatre Mode / Miniplayer</span>
              <div class="yt-kbd-keys"><kbd class="yt-kbd-key">t</kbd> / <kbd class="yt-kbd-key">i</kbd></div>
            </div>
            <div class="yt-kbd-shortcut-row">
              <span class="yt-kbd-desc">Subtitles / Captions</span>
              <div class="yt-kbd-keys"><kbd class="yt-kbd-key">c</kbd></div>
            </div>
            <div class="yt-kbd-shortcut-row">
              <span class="yt-kbd-desc">Like / Toggle Like</span>
              <div class="yt-kbd-keys"><kbd class="yt-kbd-key">+</kbd> or <kbd class="yt-kbd-key">Shift+L</kbd></div>
            </div>
            <div class="yt-kbd-shortcut-row">
              <span class="yt-kbd-desc">Comments & Scroll Mode (↑↓ to scroll)</span>
              <div class="yt-kbd-keys"><kbd class="yt-kbd-key">Shift+C</kbd> or <kbd class="yt-kbd-key">Shift+S</kbd></div>
            </div>
          </div>
        </div>

        <div class="yt-kbd-section">
          <div class="yt-kbd-section-title">On-Page Icons & Video Navigation</div>
          <div class="yt-kbd-shortcut-list">
            <div class="yt-kbd-shortcut-row">
              <span class="yt-kbd-desc">Cycle Page Icons (Home, Search, Channel, Like) & Videos</span>
              <div class="yt-kbd-keys"><kbd class="yt-kbd-key">Tab</kbd> / <kbd class="yt-kbd-key">Shift+Tab</kbd></div>
            </div>
            <div class="yt-kbd-shortcut-row">
              <span class="yt-kbd-desc">Direct Focus / Go to YouTube Home</span>
              <div class="yt-kbd-keys"><kbd class="yt-kbd-key">h</kbd></div>
            </div>
            <div class="yt-kbd-shortcut-row">
              <span class="yt-kbd-desc">Activate Selected Element / Video</span>
              <div class="yt-kbd-keys"><kbd class="yt-kbd-key">Enter</kbd></div>
            </div>
            <div class="yt-kbd-shortcut-row">
              <span class="yt-kbd-desc">Navigate Forward / Backward in List</span>
              <div class="yt-kbd-keys"><kbd class="yt-kbd-key">↑</kbd> <kbd class="yt-kbd-key">↓</kbd></div>
            </div>
            <div class="yt-kbd-shortcut-row">
              <span class="yt-kbd-desc">Navigate Video Grid (Feeds & Search)</span>
              <div class="yt-kbd-keys"><kbd class="yt-kbd-key">↑</kbd> <kbd class="yt-kbd-key">↓</kbd> <kbd class="yt-kbd-key">←</kbd> <kbd class="yt-kbd-key">→</kbd></div>
            </div>
            <div class="yt-kbd-shortcut-row">
              <span class="yt-kbd-desc">Return to Player Controls</span>
              <div class="yt-kbd-keys"><kbd class="yt-kbd-key">Esc</kbd> or <kbd class="yt-kbd-key">←</kbd></div>
            </div>
          </div>
        </div>

        <div class="yt-kbd-section">
          <div class="yt-kbd-section-title">General Navigation & Feeds</div>
          <div class="yt-kbd-shortcut-list">
            <div class="yt-kbd-shortcut-row">
              <span class="yt-kbd-desc">Focus Search Bar</span>
              <div class="yt-kbd-keys"><kbd class="yt-kbd-key">/</kbd> or <kbd class="yt-kbd-key">s</kbd></div>
            </div>
            <div class="yt-kbd-shortcut-row">
              <span class="yt-kbd-desc">Go Back in History</span>
              <div class="yt-kbd-keys"><kbd class="yt-kbd-key">Backspace</kbd> or <kbd class="yt-kbd-key">Alt+←</kbd></div>
            </div>
            <div class="yt-kbd-shortcut-row">
              <span class="yt-kbd-desc">Quick Go-To Feeds</span>
              <div class="yt-kbd-keys"><kbd class="yt-kbd-key">g</kbd> then <kbd class="yt-kbd-key">h</kbd> (Home) / <kbd class="yt-kbd-key">s</kbd> (Subs) / <kbd class="yt-kbd-key">t</kbd> (Trend)</div>
            </div>
            <div class="yt-kbd-shortcut-row">
              <span class="yt-kbd-desc">Toggle This Shortcut Guide</span>
              <div class="yt-kbd-keys"><kbd class="yt-kbd-key">?</kbd></div>
            </div>
          </div>
        </div>

        <div class="yt-kbd-footer">
          Press <kbd class="yt-kbd-key">Esc</kbd> or <kbd class="yt-kbd-key">?</kbd> to close
        </div>
      </div>
    `);

    document.body.appendChild(modalBackdrop);

    modalBackdrop.querySelector('#yt-kbd-close')?.addEventListener('click', toggleHelpModal);
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) toggleHelpModal();
    });
  }

  function toggleHelpModal() {
    if (!modalBackdrop) createHelpModal();
    if (!modalBackdrop) return;
    const isShown = modalBackdrop.classList.contains('show');
    if (isShown) {
      modalBackdrop.classList.remove('show');
    } else {
      modalBackdrop.classList.add('show');
    }
  }

  // Video Card Resolution
  function getVideoLink(card) {
    if (!card) return null;
    return (
      card.querySelector('a.yt-lockup-metadata-view-model-wiz__title[href]') ||
      card.querySelector('a#video-title-link[href]') ||
      card.querySelector('a#video-title[href]') ||
      card.querySelector('a#thumbnail[href]') ||
      card.querySelector('a[href*="/watch"]') ||
      card.querySelector('a[href*="/shorts"]') ||
      card.querySelector('a[href]')
    );
  }

  // Dismiss and stop YouTube inline hover preview players
  function dismissInlinePreviews() {
    const previews = document.querySelectorAll(
      'ytd-video-preview, #inline-preview-player, ytd-inline-preview-renderer, ytd-video-preview-renderer, #video-preview-container, div#video-preview, .ytd-video-preview'
    );
    for (const p of previews) {
      try {
        const v = p.querySelector('video');
        if (v) {
          v.pause();
          v.removeAttribute('src');
          v.load();
        }
      } catch (_) {}
      try {
        p.remove();
      } catch (_) {
        p.style.display = 'none';
      }
    }
  }

  function getVideoCards(root = document) {
    const raw = Array.from(root.querySelectorAll(VIDEO_CARD_SELECTORS));
    if (raw.length === 0) return [];

    // Filter out nested cards: keep only topmost card containers
    const rawSet = new Set(raw);
    const topLevel = raw.filter(card => {
      let parent = card.parentElement;
      while (parent && parent !== root) {
        if (rawSet.has(parent)) return false;
        parent = parent.parentElement;
      }
      return true;
    });

    return topLevel.filter(card => {
      if (card.querySelector('ytd-ad-slot-renderer, .ytd-in-feed-ad-layout-renderer, ytd-statement-banner-renderer')) {
        return false;
      }
      if (card.offsetWidth < 40 || card.offsetHeight < 40) return false;
      if (card.offsetParent === null && window.getComputedStyle(card).display === 'none') return false;
      const link = getVideoLink(card);
      return Boolean(link && link.href && !link.href.includes('javascript:'));
    });
  }

  function getWatchRecommendations() {
    const containers = Array.from(document.querySelectorAll('#related, #secondary, ytd-watch-next-secondary-results-renderer, #below #items'));
    for (const cont of containers) {
      const cards = getVideoCards(cont);
      if (cards.length > 0) return cards;
    }
    return getVideoCards().filter(c => !c.closest('#movie_player, ytd-player, #player'));
  }

  // On-Page Interactive Navigable Items (Icons, Buttons & Videos)
  function getNavigableItems() {
    const items = [];

    // 1. YouTube Home Logo
    const logo = document.querySelector('ytd-topbar-logo-renderer #logo, a#logo, #masthead a#logo, #masthead-logo a');
    if (logo && isElementVisible(logo)) {
      items.push({
        type: 'logo',
        element: logo,
        badge: '⏎ Home',
        label: 'YouTube Home',
        icon: '🏠',
        action: () => {
          showOSD('Navigating Home', '🏠');
          logo.click();
          setTimeout(() => {
            if (window.location.pathname !== '/') {
              window.location.href = 'https://www.youtube.com/';
            }
          }, 120);
        }
      });
    }

    // 2. Search Box
    const searchInput = document.querySelector('input.ytSearchboxComponentInput, input[name="search_query"], ytd-searchbox input');
    if (searchInput && isElementVisible(searchInput)) {
      items.push({
        type: 'search',
        element: searchInput.closest('ytd-searchbox, form, #search-input') || searchInput,
        badge: '⏎ Search',
        label: 'Search YouTube',
        icon: '🔍',
        action: () => {
          searchInput.focus();
          searchInput.select();
          showOSD('Search', '🔍');
        }
      });
    }

    if (isWatchPage()) {
      // 3. Channel Owner
      const channelLink = document.querySelector('#owner #avatar, #channel-name a, ytd-video-owner-renderer a#avatar, ytd-video-owner-renderer #channel-name a');
      if (channelLink && isElementVisible(channelLink)) {
        const nameElem = document.querySelector('#channel-name a, ytd-channel-name a');
        const channelName = nameElem ? nameElem.textContent.trim() : 'Channel';
        items.push({
          type: 'channel',
          element: channelLink.closest('ytd-video-owner-renderer, #owner') || channelLink,
          badge: '⏎ Channel',
          label: `Channel: ${channelName}`,
          icon: '👤',
          action: () => {
            showOSD(`Opening ${channelName}`, '👤');
            channelLink.click();
          }
        });
      }

      // 4. Subscribe Button
      const subBtn = document.querySelector('#subscribe-button button, ytd-subscribe-button-renderer button');
      if (subBtn && isElementVisible(subBtn)) {
        items.push({
          type: 'subscribe',
          element: subBtn.closest('#subscribe-button, ytd-subscribe-button-renderer') || subBtn,
          badge: '⏎ Subscribe',
          label: 'Subscribe Button',
          icon: '🔔',
          action: () => {
            subBtn.click();
            showOSD('Subscribe toggled', '🔔');
          }
        });
      }

      // 5. Like Button
      const likeBtn = document.querySelector('like-button-view-model button, segmented-like-dislike-button-view-model like-button-view-model button, #segmented-like-button button, ytd-toggle-button-renderer button#like-button, button[aria-label*="like this video" i]');
      if (likeBtn && isElementVisible(likeBtn)) {
        items.push({
          type: 'like',
          element: likeBtn.closest('like-button-view-model, segmented-like-dislike-button-view-model') || likeBtn,
          badge: '⏎ Like',
          label: 'Like Video',
          icon: '👍',
          action: () => {
            likeBtn.click();
            showOSD('Liked / Toggle', '👍');
          }
        });
      }

      // 6. Comments Section
      const commentsElem = document.querySelector('#comments, ytd-comments, #sections');
      if (commentsElem) {
        items.push({
          type: 'comments',
          element: commentsElem,
          badge: '⏎ Comments',
          label: 'Comments Section',
          icon: '💬',
          action: () => {
            jumpToComments();
          }
        });
      }

      // 7. Watch Page Recommendations
      const recCards = getWatchRecommendations();
      for (const card of recCards) {
        const titleElem = card.querySelector('#video-title, .yt-lockup-metadata-view-model-wiz__title');
        const title = titleElem ? titleElem.textContent.trim() : 'Video Recommendation';
        items.push({
          type: 'video',
          element: card,
          badge: '⏎ Open',
          label: title,
          icon: '▶',
          action: () => {
            selectCard(card);
            openSelectedVideo();
          }
        });
      }
    } else {
      // Browse Page Video Cards
      const cards = getVideoCards();
      for (const card of cards) {
        const titleElem = card.querySelector('#video-title, .yt-lockup-metadata-view-model-wiz__title');
        const title = titleElem ? titleElem.textContent.trim() : 'Video';
        items.push({
          type: 'video',
          element: card,
          badge: '⏎ Open',
          label: title,
          icon: '▶',
          action: () => {
            selectCard(card);
            openSelectedVideo();
          }
        });
      }
    }

    return items;
  }

  // Selection & Navigation Management
  function selectNavItem(index, items = null) {
    if (!items) items = getNavigableItems();
    if (!items || items.length === 0) return;

    if (index < 0) index = items.length - 1;
    if (index >= items.length) index = 0;

    dismissInlinePreviews();
    clearNavSelection();

    currentNavIndex = index;
    currentNavItem = items[index];

    if (currentNavItem.type === 'video') {
      currentCard = currentNavItem.element;
      currentCard.classList.add('yt-kbd-selected');
      currentCard.setAttribute('data-yt-kbd-badge', '⏎ Open');
    } else {
      currentCard = null;
      currentNavItem.element.classList.add('yt-kbd-selected');
      currentNavItem.element.setAttribute('data-yt-kbd-badge', currentNavItem.badge || '⏎ Select');
    }

    currentNavItem.element.scrollIntoView({
      behavior: 'auto',
      block: 'nearest',
      inline: 'nearest'
    });

    watchFocus = 'nav';
    showOSD(`${currentNavItem.label} (${currentNavItem.badge})`, currentNavItem.icon);
  }

  function clearNavSelection() {
    dismissInlinePreviews();
    if (currentNavItem && currentNavItem.element) {
      currentNavItem.element.classList.remove('yt-kbd-selected');
      currentNavItem.element.removeAttribute('data-yt-kbd-badge');
    }
    if (currentCard) {
      currentCard.classList.remove('yt-kbd-selected');
      currentCard.removeAttribute('data-yt-kbd-badge');
      currentCard = null;
    }
    document.querySelectorAll('.yt-kbd-selected').forEach(el => {
      el.classList.remove('yt-kbd-selected');
      el.removeAttribute('data-yt-kbd-badge');
    });
    currentNavItem = null;
    currentNavIndex = -1;
  }

  function navigateNavItems(step) {
    const items = getNavigableItems();
    if (!items || items.length === 0) return;

    if (currentNavIndex === -1 || !currentNavItem) {
      selectNavItem(step > 0 ? 0 : items.length - 1, items);
    } else {
      selectNavItem(currentNavIndex + step, items);
    }
  }

  function activateCurrentItem() {
    if (!currentNavItem) return;
    const item = currentNavItem;
    if (typeof item.action === 'function') {
      item.action();
    }
  }

  function selectCard(card) {
    if (!card) return;
    dismissInlinePreviews();
    clearNavSelection();
    currentCard = card;
    currentCard.classList.add('yt-kbd-selected');
    currentCard.setAttribute('data-yt-kbd-badge', '⏎ Open');
    currentCard.scrollIntoView({
      behavior: 'auto',
      block: 'nearest',
      inline: 'nearest'
    });
  }

  function clearCardSelection() {
    clearNavSelection();
  }

  // Spatial Navigation for Video Grids
  function navigateDirection(dir) {
    let cards;
    if (isWatchPage() && (currentCard || watchFocus === 'nav')) {
      cards = getWatchRecommendations();
    } else {
      cards = getVideoCards();
    }

    if (!cards || cards.length === 0) return;

    if (!currentCard || !document.contains(currentCard)) {
      const sorted = cards.filter(c => {
        const r = c.getBoundingClientRect();
        return r.bottom > 80 && r.top < window.innerHeight;
      });
      selectCard(sorted.length > 0 ? sorted[0] : cards[0]);
      return;
    }

    // Pre-calculate and cache bounding rects for all cards in a single layout pass
    const rects = new Map();
    for (const c of cards) {
      rects.set(c, c.getBoundingClientRect());
    }

    const curRect = rects.get(currentCard);
    if (!curRect) {
      selectCard(cards[0]);
      return;
    }

    const cx = curRect.left + curRect.width / 2;
    const cy = curRect.top + curRect.height / 2;
    const others = cards.filter(c => c !== currentCard);
    let target = null;

    // Helper: test if two cards share the same visual row (generous vertical overlap)
    function isSameRow(rA, rB) {
      const vOverlap = Math.min(rA.bottom, rB.bottom) - Math.max(rA.top, rB.top);
      const minH = Math.min(rA.height, rB.height);
      const maxH = Math.max(rA.height, rB.height);
      const cyA = rA.top + rA.height / 2;
      const cyB = rB.top + rB.height / 2;
      return vOverlap > minH * 0.3 || Math.abs(cyB - cyA) < maxH * 0.75;
    }

    // Helper: test if two cards share the same visual column (horizontal overlap)
    function isSameColumn(rA, rB) {
      const hOverlap = Math.min(rA.right, rB.right) - Math.max(rA.left, rB.left);
      return hOverlap > Math.min(rA.width, rB.width) * 0.3;
    }

    const curIdx = cards.indexOf(currentCard);

    if (dir === 'Right') {
      const rowCandidates = others.filter(c => {
        const r = rects.get(c);
        return r.left >= curRect.left + 15 && isSameRow(curRect, r);
      });

      if (rowCandidates.length > 0) {
        rowCandidates.sort((a, b) => rects.get(a).left - rects.get(b).left);
        target = rowCandidates[0];
      } else {
        // Next row: find cards below current row, pick the leftmost card in the next row
        const nextRows = others.filter(c => {
          const r = rects.get(c);
          return r.top >= curRect.bottom - 20;
        });
        if (nextRows.length > 0) {
          nextRows.sort((a, b) => {
            const ra = rects.get(a);
            const rb = rects.get(b);
            if (Math.abs(ra.top - rb.top) > 30) return ra.top - rb.top;
            return ra.left - rb.left;
          });
          target = nextRows[0];
        } else if (curIdx >= 0 && curIdx < cards.length - 1) {
          target = cards[curIdx + 1];
        }
      }
    } else if (dir === 'Left') {
      const rowCandidates = others.filter(c => {
        const r = rects.get(c);
        return r.right <= curRect.right - 15 && isSameRow(curRect, r);
      });

      if (rowCandidates.length > 0) {
        rowCandidates.sort((a, b) => rects.get(b).right - rects.get(a).right);
        target = rowCandidates[0];
      } else {
        // Previous row: find cards above current row, pick the rightmost card in previous row
        const prevRows = others.filter(c => {
          const r = rects.get(c);
          return r.bottom <= curRect.top + 20;
        });
        if (prevRows.length > 0) {
          prevRows.sort((a, b) => {
            const ra = rects.get(a);
            const rb = rects.get(b);
            if (Math.abs(ra.top - rb.top) > 30) return rb.top - ra.top;
            return rb.right - ra.right;
          });
          target = prevRows[0];
        } else if (curIdx > 0) {
          target = cards[curIdx - 1];
        }
      }
    } else if (dir === 'Down') {
      const below = others.filter(c => {
        const r = rects.get(c);
        return r.top + r.height / 2 > cy + 15;
      });

      if (below.length > 0) {
        const sameCol = below.filter(c => isSameColumn(curRect, rects.get(c)));
        if (sameCol.length > 0) {
          sameCol.sort((a, b) => rects.get(a).top - rects.get(b).top);
          target = sameCol[0];
        } else {
          below.sort((a, b) => {
            const ra = rects.get(a);
            const rb = rects.get(b);
            const ax = ra.left + ra.width / 2;
            const ay = ra.top + ra.height / 2;
            const bx = rb.left + rb.width / 2;
            const by = rb.top + rb.height / 2;
            const scoreA = Math.abs(ax - cx) * 1.5 + (ay - cy);
            const scoreB = Math.abs(bx - cx) * 1.5 + (by - cy);
            return scoreA - scoreB;
          });
          target = below[0];
        }
      } else {
        window.scrollBy({ top: 400, behavior: 'auto' });
      }
    } else if (dir === 'Up') {
      const above = others.filter(c => {
        const r = rects.get(c);
        return r.top + r.height / 2 < cy - 15;
      });

      if (above.length > 0) {
        const sameCol = above.filter(c => isSameColumn(curRect, rects.get(c)));
        if (sameCol.length > 0) {
          sameCol.sort((a, b) => rects.get(b).bottom - rects.get(a).bottom);
          target = sameCol[0];
        } else {
          above.sort((a, b) => {
            const ra = rects.get(a);
            const rb = rects.get(b);
            const ax = ra.left + ra.width / 2;
            const ay = ra.top + ra.height / 2;
            const bx = rb.left + rb.width / 2;
            const by = rb.top + rb.height / 2;
            const scoreA = Math.abs(ax - cx) * 1.5 + (cy - ay);
            const scoreB = Math.abs(bx - cx) * 1.5 + (cy - by);
            return scoreA - scoreB;
          });
          target = above[0];
        }
      } else {
        window.scrollTo({ top: 0, behavior: 'auto' });
      }
    }

    if (target) selectCard(target);
  }

  // Open Selected Video
  function openSelectedVideo() {
    if (!currentCard) return;
    const link = getVideoLink(currentCard);
    if (link && link.href) {
      showOSD('Opening Video', '▶');
      const href = link.href;
      clearNavSelection();
      watchFocus = 'player';
      link.click();
      setTimeout(() => {
        if (window.location.href !== href && !window.location.href.includes(new URL(href, window.location.origin).search)) {
          window.location.href = href;
        }
      }, 150);
    }
  }

  // Playback Controls
  function togglePlayPause() {
    const playBtn = document.querySelector('.ytp-play-button');
    const player = getPlayer();
    const video = getVideo();

    if (playBtn) {
      playBtn.click();
      setTimeout(() => {
        const isPaused = video ? video.paused : (player && typeof player.getPlayerState === 'function' ? player.getPlayerState() === 2 : false);
        showOSD(isPaused ? 'Paused' : 'Playing', isPaused ? '⏸' : '▶');
      }, 40);
      return;
    }

    if (player && typeof player.getPlayerState === 'function') {
      const state = player.getPlayerState();
      if (state === 1 || state === 3) {
        player.pauseVideo();
        showOSD('Paused', '⏸');
      } else {
        player.playVideo();
        showOSD('Playing', '▶');
      }
      return;
    }

    if (video) {
      if (video.paused) {
        video.play().catch(() => {});
        showOSD('Playing', '▶');
      } else {
        video.pause();
        showOSD('Paused', '⏸');
      }
      return;
    }
  }

  // Query all matching elements including across open shadow roots
  function querySelectorAllDeep(root, selector) {
    const results = [];
    if (!root) return results;
    try {
      if (typeof root.querySelectorAll === 'function') {
        const found = root.querySelectorAll(selector);
        for (let i = 0; i < found.length; i++) {
          results.push(found[i]);
        }
      }
      if (root.shadowRoot) {
        results.push(...querySelectorAllDeep(root.shadowRoot, selector));
      }
      const children = root.children || [];
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (child && child.shadowRoot) {
          results.push(...querySelectorAllDeep(child.shadowRoot, selector));
        }
      }
    } catch (_) {}
    return results;
  }

  // Click a skip button cleanly using native click + pointer/mouse event simulation
  function clickSkipButton(el) {
    if (!el) return false;

    let clicked = false;
    const targets = new Set();
    targets.add(el);

    if (el.parentElement) targets.add(el.parentElement);
    if (el.parentElement && el.parentElement.parentElement) targets.add(el.parentElement.parentElement);

    const closestBtn = el.closest && el.closest(
      'button, [role="button"], .ytp-ad-skip-button-modern, .ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-container, .ytp-ad-skip-button-slot, yt-button-shape'
    );
    if (closestBtn) targets.add(closestBtn);

    if (typeof el.querySelectorAll === 'function') {
      try {
        const subEls = el.querySelectorAll('button, [role="button"], span, div, svg');
        subEls.forEach(sub => targets.add(sub));
      } catch (_) {}
    }

    for (const target of targets) {
      try {
        // Ensure element is visible and interactable
        if (target.style) {
          if (target.style.display === 'none') target.style.removeProperty('display');
          if (target.style.pointerEvents === 'none') target.style.removeProperty('pointer-events');
          if (target.style.visibility === 'hidden') target.style.removeProperty('visibility');
        }

        // 1. Native click method
        if (typeof target.click === 'function') {
          target.click();
          clicked = true;
        }

        // 2. Dispatch full pointer and mouse event sequence with W3C button states
        const rect = (typeof target.getBoundingClientRect === 'function')
          ? target.getBoundingClientRect()
          : { left: 10, top: 10, width: 20, height: 20 };
        const clientX = rect.left + (rect.width > 0 ? rect.width / 2 : 10);
        const clientY = rect.top + (rect.height > 0 ? rect.height / 2 : 10);

        const downOpts = {
          bubbles: true,
          cancelable: true,
          view: window,
          composed: true,
          clientX,
          clientY,
          button: 0,
          buttons: 1,
          isPrimary: true
        };

        const upOpts = {
          bubbles: true,
          cancelable: true,
          view: window,
          composed: true,
          clientX,
          clientY,
          button: 0,
          buttons: 0,
          detail: 1,
          isPrimary: true
        };

        if (window.PointerEvent) {
          target.dispatchEvent(new PointerEvent('pointerdown', downOpts));
        }
        target.dispatchEvent(new MouseEvent('mousedown', downOpts));

        if (window.PointerEvent) {
          target.dispatchEvent(new PointerEvent('pointerup', upOpts));
        }
        target.dispatchEvent(new MouseEvent('mouseup', upOpts));
        target.dispatchEvent(new MouseEvent('click', upOpts));
        clicked = true;
      } catch (_) {}
    }

    return clicked;
  }

  // Find all potential skip, close, and dismiss buttons across DOM and shadow roots
  function findSkipButtons() {
    const candidates = [];

    function addCandidate(el) {
      if (!el || candidates.includes(el)) return;

      const text = (el.textContent || '').trim().toLowerCase();
      const aria = (el.getAttribute('aria-label') || '').trim().toLowerCase();
      const id = (el.id || '').toLowerCase();
      const cls = (typeof el.className === 'string' ? el.className : '').toLowerCase();

      // Exclude screen reader / navigation skip buttons
      if (
        id.includes('skip-navigation') ||
        cls.includes('skip-navigation') ||
        text.includes('skip navigation') ||
        aria.includes('skip navigation') ||
        text.startsWith('skip in') ||
        aria.startsWith('skip in')
      ) {
        return;
      }

      // Exclude advertiser CTA buttons (e.g. "Shop now", "Learn more", "Install", "Visit")
      if (
        text.includes('shop now') ||
        text.includes('learn more') ||
        text.includes('visit site') ||
        text.includes('download') ||
        text.includes('install')
      ) {
        return;
      }

      candidates.push(el);
    }

    const playerContainer = document.getElementById('movie_player') || document.querySelector('.video-ads') || document.body;

    // 1. Check known button selectors
    for (const selector of SKIP_AD_SELECTORS) {
      try {
        const found = querySelectorAllDeep(playerContainer, selector);
        for (let i = 0; i < found.length; i++) {
          addCandidate(found[i]);
        }
      } catch (_) {}
    }

    // 2. Scan interactive elements for skip or dismiss text / aria-label
    try {
      const interactiveEls = querySelectorAllDeep(
        playerContainer,
        'button, [role="button"], a, div, span, yt-button-shape'
      );
      for (let i = 0; i < interactiveEls.length; i++) {
        const el = interactiveEls[i];
        const aria = (el.getAttribute('aria-label') || '').trim().toLowerCase();
        const text = (el.textContent || '').trim().toLowerCase();

        if (
          aria === 'skip' ||
          aria === 'skip ad' ||
          aria.startsWith('skip ad') ||
          aria.includes('continue to video') ||
          aria === 'dismiss'
        ) {
          addCandidate(el);
          continue;
        }

        if (
          (text === 'skip' || text === 'skip ad' || text === 'skip ads' || text.startsWith('skip ad') || text.startsWith('skip ')) &&
          text.length <= 25 &&
          !text.startsWith('skip in')
        ) {
          addCandidate(el);
          continue;
        }

        if (text === 'dismiss' || text.includes('continue to video')) {
          addCandidate(el);
          continue;
        }
      }
    } catch (_) {}

    return candidates;
  }

  // Dismiss interstitial screens, centre CTA cards, and banner overlays
  function dismissInterstitialScreens() {
    let dismissed = false;

    // 1. Click genuine skip/close/dismiss buttons inside interstitial overlays
    const interstitials = document.querySelectorAll(
      '.ytp-ad-action-interstitial, .ytp-ad-action-interstitial-slot, .ytp-ad-player-overlay-flyout-cta, .ytp-ad-player-overlay-instream-info, .ytp-ad-survey, .ytp-ad-survey-questions, .ytp-ad-timed-pie-countdown-container'
    );
    for (const inst of interstitials) {
      const btns = inst.querySelectorAll('button, [role="button"], div, span');
      for (const b of btns) {
        const text = (b.textContent || '').trim().toLowerCase();
        const aria = (b.getAttribute('aria-label') || '').trim().toLowerCase();
        const cls = (typeof b.className === 'string' ? b.className : '').toLowerCase();

        // ONLY click if it is a skip/dismiss/close button, NEVER click advertiser CTA ("Shop now", etc.)
        if (
          text.includes('skip') ||
          text.includes('dismiss') ||
          text.includes('close') ||
          text.includes('no thanks') ||
          aria.includes('skip') ||
          aria.includes('dismiss') ||
          aria.includes('close') ||
          cls.includes('skip') ||
          cls.includes('dismiss') ||
          cls.includes('close')
        ) {
          if (!text.includes('skip navigation') && !aria.includes('skip navigation')) {
            clickSkipButton(b);
            dismissed = true;
          }
        }
      }

      // Hide interstitial body so it does not block the video
      if (!inst.classList.contains('ytp-ad-skip-button-slot') && !inst.classList.contains('ytp-ad-skip-button-container')) {
        inst.style.setProperty('display', 'none', 'important');
        inst.style.setProperty('pointer-events', 'none', 'important');
        inst.style.setProperty('opacity', '0', 'important');
      }
    }

    const backgrounds = document.querySelectorAll('.ytp-ad-action-interstitial-background');
    backgrounds.forEach(bg => {
      bg.style.setProperty('display', 'none', 'important');
      bg.style.setProperty('pointer-events', 'none', 'important');
      bg.style.setProperty('opacity', '0', 'important');
    });

    // 2. Banner and image overlay ad close buttons
    const overlays = document.querySelectorAll(
      'button.ytp-ad-overlay-close-button, .ytp-ad-overlay-close-button, .ytp-ad-image-overlay button, .ytp-ad-overlay-close-container button'
    );
    for (const o of overlays) {
      clickSkipButton(o);
      dismissed = true;
    }

    return dismissed;
  }

  // Detect whether an ad or interstitial is currently interrupting playback
  function isAdActive() {
    const player = getPlayer();
    if (player && player.classList) {
      if (player.classList.contains('ad-showing') || player.classList.contains('ad-interrupting')) {
        return true;
      }
    }
    if (document.querySelector('.ad-showing, .ad-interrupting')) {
      return true;
    }
    if (document.querySelector('.video-ads .ytp-ad-module, .ytp-ad-skip-button-slot, .ytp-ad-text, .ytp-ad-preview-container')) {
      return true;
    }
    // Pie countdown or interstitial screens (e.g. sponsor end-screen / CTA overlay)
    if (document.querySelector(
      '.ytp-ad-timed-pie-countdown-container, .ytp-ad-timed-pie-countdown-icon, .ytp-ad-timed-pie-countdown, [class*="pie-countdown" i], .ytp-ad-action-interstitial, .ytp-ad-survey, .ytp-ad-survey-questions, .ytp-ad-player-overlay-flyout-cta'
    )) {
      return true;
    }
    if (player && typeof player.getAdState === 'function') {
      try {
        if (player.getAdState() > 0) return true;
      } catch (_) {}
    }
    const buttons = findSkipButtons();
    if (buttons.length > 0) return true;
    return false;
  }

  // Recover video visibility if an ad or overlay left the player in a black or paused state
  function recoverVideoDisplay() {
    const video = getVideo();
    const player = getPlayer();

    // 1. Force video element visible
    if (video) {
      video.style.setProperty('opacity', '1', 'important');
      video.style.setProperty('visibility', 'visible', 'important');
      video.style.setProperty('display', 'block', 'important');
      if (video.playbackRate > 2.0 && !isAdActive()) {
        video.playbackRate = 1.0;
      }
    }

    // 2. Hide any leftover black ad interstitials (do NOT hide .ytp-ad-player-overlay as it contains skip buttons)
    const stuckInterstitials = document.querySelectorAll(
      '.ytp-ad-action-interstitial, .ytp-ad-action-interstitial-background, .ytp-ad-timed-pie-countdown-container'
    );
    stuckInterstitials.forEach(el => {
      el.style.setProperty('display', 'none', 'important');
      el.style.setProperty('pointer-events', 'none', 'important');
    });

    // 3. Ensure ad UI containers are not accidentally left with display: none
    const adOverlays = document.querySelectorAll('.ytp-ad-player-overlay, .ytp-ad-skip-button-slot, .ytp-ad-skip-button-container');
    adOverlays.forEach(el => {
      if (el.style && el.style.display === 'none') {
        el.style.removeProperty('display');
      }
    });

    // 4. If main video is genuinely playing and no ads are active, clean leftover ad classes
    if (video && !video.paused && player && player.classList) {
      if (!isAdActive()) {
        player.classList.remove('ad-showing');
        player.classList.remove('ad-interrupting');
      }
    }

    // 5. Force player reflow to restore video surface
    if (player && typeof player.setSize === 'function') {
      try { player.setSize(); } catch (e) {}
    }
    window.dispatchEvent(new Event('resize'));
  }

  let skipMonitorTimer = null;

  // Skip Video Ad on keypress (Shift+A or a) - automatically clears ad pods (Ad 1 & Ad 2), countdowns & middle CTA screens
  function skipAd() {
    const video = getVideo();
    const player = getPlayer();
    const isAd = isAdActive();
    const buttons = findSkipButtons();

    console.log('[ytkbd:skipAd] invoked', {
      isAd,
      buttonCount: buttons.length,
      buttons: buttons.map(b => ({
        tag: b.tagName,
        cls: typeof b.className === 'string' ? b.className : '',
        text: (b.textContent || '').trim().slice(0, 30),
        aria: b.getAttribute && b.getAttribute('aria-label')
      })),
      currentTime: video ? video.currentTime : null,
      duration: video ? video.duration : null
    });

    if (!isAd && buttons.length === 0) {
      showOSD('No Ad to Skip', '⏭');
      return false;
    }

    // Unhide any mistakenly hidden ad overlay containers so skip buttons are interactable
    const adOverlays = document.querySelectorAll('.ytp-ad-player-overlay, .ytp-ad-skip-button-slot, .ytp-ad-skip-button-container');
    adOverlays.forEach(el => {
      if (el.style && el.style.display === 'none') {
        el.style.removeProperty('display');
      }
    });

    // 1. Initial immediate pass: click skip buttons, dismiss interstitial overlays, and try player API
    for (const btn of buttons) {
      clickSkipButton(btn);
    }
    dismissInterstitialScreens();

    if (player && typeof player.skipAd === 'function') {
      try { player.skipAd(); } catch (_) {}
    }

    const originalMuted = video ? video.muted : false;

    // Fast-forward initial pass if ad is active
    if (video && isAd) {
      try {
        video.muted = true;
        video.playbackRate = 16.0;
        // CRITICAL: If YouTube paused video during interstitial/countdown, unpause it so time advances
        if (video.paused) {
          const p = video.play();
          if (p && typeof p.catch === 'function') p.catch(() => {});
        }
        // The Skip button's real click handler ignores script-dispatched (untrusted) clicks,
        // so clickSkipButton() above rarely actually skips it. Jumping the underlying <video>
        // to its own end fires a native 'ended' event, which YouTube's ad module always honors
        // (it's a property write, not a gated user-gesture action) and advances immediately
        // instead of playing the whole ad through at 16x.
        if (isFinite(video.duration) && video.duration > 0) {
          video.currentTime = Math.max(0, video.duration - 0.05);
        }
      } catch (_) {}
    }
    if (player && typeof player.playVideo === 'function' && video && video.paused) {
      try { player.playVideo(); } catch (_) {}
    }

    // 2. Persistent monitor: runs for up to 5 seconds across ad transitions (Ad 1 -> Ad 2 -> CTA / sponsor screen)
    if (skipMonitorTimer) {
      clearInterval(skipMonitorTimer);
      skipMonitorTimer = null;
    }

    let checks = 0;
    let cleanChecks = 0;
    const maxChecks = 70; // up to 4.9s (70 * 70ms)

    skipMonitorTimer = setInterval(() => {
      checks++;

      // TEMP DEBUG: shows whether our currentTime write from the previous tick actually
      // stuck, or whether YouTube reset it back down before this tick ran.
      if (video) {
        console.log('[ytkbd:skipAd] tick', checks, {
          currentTime: video.currentTime,
          duration: video.duration,
          paused: video.paused,
          playbackRate: video.playbackRate,
          readyState: video.readyState
        });
      }

      // Click any new skip buttons that mount during the transition (e.g. Ad 2 skip button, or endcap pill button)
      const currentButtons = findSkipButtons();
      if (currentButtons.length) {
        console.log('[ytkbd:skipAd] found buttons', currentButtons.map(b => ({
          tag: b.tagName,
          cls: typeof b.className === 'string' ? b.className : '',
          text: (b.textContent || '').trim().slice(0, 30),
          aria: b.getAttribute && b.getAttribute('aria-label')
        })));
      }
      for (const btn of currentButtons) {
        clickSkipButton(btn);
      }

      // Dismiss any follow-up interstitial screens or centre CTA cards
      dismissInterstitialScreens();

      // Try player.skipAd() if available
      if (player && typeof player.skipAd === 'function') {
        try { player.skipAd(); } catch (_) {}
      }

      const adActive = isAdActive();

      if (adActive && video) {
        // Ad (or Ad 2 of 2 / interstitial countdown) is active: fast-forward at 16x speed and mute
        cleanChecks = 0;
        try {
          video.muted = true;
          video.playbackRate = 16.0;
          // CRITICAL: Ensure video is actually playing so the countdown progresses to 0 in milliseconds
          if (video.paused) {
            const p = video.play();
            if (p && typeof p.catch === 'function') p.catch(() => {});
          }
          // Same trusted-click workaround as the initial pass: force this ad's video element
          // to its end so it fires 'ended' and YouTube advances past it immediately, rather
          // than us just riding out the full (sped-up) ad duration.
          if (isFinite(video.duration) && video.duration > 0) {
            const target = Math.max(0, video.duration - 0.05);
            console.log('[ytkbd:skipAd] forcing currentTime', { from: video.currentTime, to: target });
            video.currentTime = target;
            console.log('[ytkbd:skipAd] currentTime immediately after write', video.currentTime);
          }
        } catch (_) {}
        if (player && typeof player.playVideo === 'function' && video.paused) {
          try { player.playVideo(); } catch (_) {}
        }

        // If ad countdown appears stuck after ~1 second (15 checks), attempt seekTo to nudge player
        if (checks === 15 && player && typeof player.seekTo === 'function') {
          try {
            const cur = Math.floor(player.getCurrentTime?.() || 0);
            player.seekTo(cur, true);
          } catch (_) {}
        }
      } else {
        // No ad or interstitial active in this tick
        cleanChecks++;

        // If main video was paused, resume playback immediately
        if (video && video.paused && !adActive) {
          try {
            const p = video.play();
            if (p && typeof p.catch === 'function') p.catch(() => {});
          } catch (_) {}
        }

        // Once there are 8 consecutive clean checks (~560ms) with no ads and no interstitials:
        if (cleanChecks >= 8 || checks >= maxChecks) {
          clearInterval(skipMonitorTimer);
          skipMonitorTimer = null;

          if (video) {
            try {
              video.playbackRate = 1.0;
              video.muted = originalMuted;
            } catch (_) {}

            if (video.paused) {
              try {
                const p = video.play();
                if (p && typeof p.catch === 'function') p.catch(() => {});
              } catch (_) {}
            }
          }

          recoverVideoDisplay();
        }
      }
    }, 70);

    showOSD('Ad Skipped', '⏭');
    return true;
  }

  // Tiled / Windowed Fullscreen (strictly within current window/tile)
  function toggleTiledFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    injectExtensionStyles();
    const isTiled = document.body.classList.toggle('yt-kbd-tiled-fullscreen');
    document.documentElement.classList.toggle('yt-kbd-tiled-html', isTiled);
    const player = getPlayer();
    if (player && typeof player.setSize === 'function') {
      player.setSize();
    }
    window.dispatchEvent(new Event('resize'));
    showOSD(isTiled ? 'Tiled Fullscreen' : 'Exit Tiled Fullscreen', '🔲');
  }

  function toggleFullscreen() {
    if (document.body.classList.contains('yt-kbd-tiled-fullscreen')) {
      document.body.classList.remove('yt-kbd-tiled-fullscreen');
      document.documentElement.classList.remove('yt-kbd-tiled-html');
      window.dispatchEvent(new Event('resize'));
    }

    const fsBtn = document.querySelector('.ytp-fullscreen-button');
    if (fsBtn) {
      fsBtn.click();
      setTimeout(() => {
        const isFs = Boolean(document.fullscreenElement);
        showOSD(isFs ? 'Fullscreen' : 'Exit Fullscreen', '⛶');
      }, 40);
      return;
    }

    const player = getPlayer();
    if (player && typeof player.toggleFullscreen === 'function') {
      player.toggleFullscreen();
      showOSD('Toggle Fullscreen', '⛶');
      return;
    }

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
      showOSD('Exit Fullscreen', '⛶');
    } else {
      const container = document.getElementById('player-container') || document.querySelector('ytd-player') || getVideo();
      if (container && container.requestFullscreen) {
        container.requestFullscreen().catch(() => {});
        showOSD('Fullscreen', '⛶');
      }
    }
  }

  function seekRelative(seconds) {
    const player = getPlayer();
    const video = getVideo();

    if (player && typeof player.seekBy === 'function') {
      player.seekBy(seconds);
    } else if (player && typeof player.getCurrentTime === 'function' && typeof player.seekTo === 'function') {
      player.seekTo(Math.max(0, player.getCurrentTime() + seconds), true);
    } else if (video) {
      video.currentTime = Math.max(0, Math.min(video.duration || Infinity, video.currentTime + seconds));
    }

    const sign = seconds > 0 ? '+' : '';
    showOSD(`${sign}${seconds}s`, seconds > 0 ? '⏩' : '⏪');
  }

  function seekPercent(pct) {
    const player = getPlayer();
    const video = getVideo();
    const duration = (player && typeof player.getDuration === 'function') ? player.getDuration() : (video ? video.duration : 0);

    if (duration > 0) {
      const targetTime = duration * (pct / 100);
      if (player && typeof player.seekTo === 'function') {
        player.seekTo(targetTime, true);
      } else if (video) {
        video.currentTime = targetTime;
      }
      showOSD(`Seek ${pct}%`, '⏩');
    }
  }

  function changeVolume(delta) {
    const player = getPlayer();
    const video = getVideo();
    let vol = 100;

    if (player && typeof player.getVolume === 'function' && typeof player.setVolume === 'function') {
      vol = Math.max(0, Math.min(100, player.getVolume() + delta));
      player.setVolume(vol);
      if (player.isMuted && player.isMuted() && delta > 0) player.unMute();
    } else if (video) {
      video.volume = Math.max(0, Math.min(1, video.volume + delta / 100));
      vol = Math.round(video.volume * 100);
      if (video.muted && delta > 0) video.muted = false;
    }

    showOSD(`Volume: ${vol}%`, vol === 0 ? '🔇' : '🔊');
  }

  function toggleMute() {
    const player = getPlayer();
    const video = getVideo();
    let muted = false;

    if (player && typeof player.isMuted === 'function') {
      if (player.isMuted()) {
        player.unMute();
        muted = false;
      } else {
        player.mute();
        muted = true;
      }
    } else if (video) {
      video.muted = !video.muted;
      muted = video.muted;
    } else {
      const btn = document.querySelector('.ytp-mute-button');
      if (btn) btn.click();
      return;
    }

    showOSD(muted ? 'Muted' : 'Unmuted', muted ? '🔇' : '🔊');
  }

  function changeSpeed(delta) {
    const player = getPlayer();
    const video = getVideo();
    const speeds = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

    let currentSpeed = 1.0;
    if (player && typeof player.getPlaybackRate === 'function') {
      currentSpeed = player.getPlaybackRate();
    } else if (video) {
      currentSpeed = video.playbackRate;
    }

    let idx = speeds.findIndex(s => Math.abs(s - currentSpeed) < 0.1);
    if (idx === -1) idx = 3;

    let nextIdx = Math.max(0, Math.min(speeds.length - 1, idx + (delta > 0 ? 1 : -1)));
    let newSpeed = speeds[nextIdx];

    if (player && typeof player.setPlaybackRate === 'function') {
      player.setPlaybackRate(newSpeed);
    }
    if (video) {
      video.playbackRate = newSpeed;
    }

    showOSD(`Speed: ${newSpeed}x`, '⚡');
  }

  function nextVideo() {
    const nextBtn = document.querySelector('.ytp-next-button');
    if (nextBtn) {
      nextBtn.click();
      showOSD('Next Video', '⏭');
      return;
    }
    const player = getPlayer();
    if (player && typeof player.nextVideo === 'function') {
      player.nextVideo();
      showOSD('Next Video', '⏭');
      return;
    }
    showOSD('No Next Video', '⏭');
  }

  function prevVideo() {
    const prevBtn = document.querySelector('.ytp-prev-button');
    if (prevBtn) {
      prevBtn.click();
      showOSD('Previous Video', '⏮');
      return;
    }
    const player = getPlayer();
    if (player && typeof player.previousVideo === 'function') {
      player.previousVideo();
      showOSD('Previous Video', '⏮');
      return;
    }
    showOSD('No Previous Video', '⏮');
  }

  function focusSearch() {
    const searchInput = document.querySelector(
      'input.ytSearchboxComponentInput, input[name="search_query"], input#search, ytd-searchbox input'
    );
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
      showOSD('Search', '🔍');
    }
  }

  function jumpToComments() {
    if (watchFocus === 'scroll' && window.scrollY > 250) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      watchFocus = 'player';
      showOSD('Player Mode (↑↓ Volume)', '🎬');
      return;
    }

    const comments = document.querySelector(
      '#comments, ytd-comments, #sections, ytd-item-section-renderer[section-identifier="comment-item-section"]'
    );
    if (comments) {
      const rect = comments.getBoundingClientRect();
      const targetY = Math.max(0, rect.top + window.scrollY - 70);
      window.scrollTo({ top: targetY, behavior: 'smooth' });
      comments.classList.add('yt-kbd-focus-comments');
      setTimeout(() => comments.classList.remove('yt-kbd-focus-comments'), 2000);
    } else {
      const player = document.getElementById('movie_player') || getVideo();
      const playerHeight = player ? player.offsetHeight : 540;
      window.scrollBy({ top: playerHeight + 100, behavior: 'smooth' });
    }

    watchFocus = 'scroll';
    clearNavSelection();
    showOSD('Scroll Mode: ON (↑↓ scroll, Esc exit)', '📜');
  }

  function toggleScrollMode() {
    if (watchFocus === 'scroll') {
      watchFocus = 'player';
      showOSD('Player Mode (↑↓ Volume, ←→ Seek)', '🎬');
    } else {
      watchFocus = 'scroll';
      clearNavSelection();
      showOSD('Scroll Mode: ON (↑↓ scroll, Esc exit)', '📜');
    }
  }

  function likeVideo() {
    const likeBtn = document.querySelector(
      'like-button-view-model button, segmented-like-dislike-button-view-model like-button-view-model button, segmented-like-button-view-model button, ytd-toggle-button-renderer button#like-button, button[aria-label*="like this video" i]'
    );
    if (likeBtn) {
      likeBtn.click();
      showOSD('Liked / Toggle', '👍');
    }
  }

  // Keyboard Event Dispatcher
  function setupEventListeners() {
    window.addEventListener('keydown', handleKeyDown, true);

    document.addEventListener('click', (e) => {
      const cards = getVideoCards();
      const matched = cards.find(c => c.contains(e.target));
      if (matched) {
        selectCard(matched);
      }
    }, true);

    window.addEventListener('yt-navigate-finish', handlePageChange);
    window.addEventListener('popstate', handlePageChange);
  }

  function handlePageChange() {
    clearNavSelection();
    watchFocus = 'player';
    if (modalBackdrop) modalBackdrop.classList.remove('show');
    recoverVideoDisplay();
  }

  function handleKeyDown(e) {
    // If typing in an input field
    if (isTyping(e)) {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.target.blur();
        showOSD('Focus Cleared', '⎋');
      }
      return;
    }

    // Ignore system hotkeys with Ctrl or Super/Meta
    if (e.ctrlKey || e.metaKey) return;

    // Alt+Left Arrow for Back in history
    if (e.altKey) {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        window.history.back();
        showOSD('Back', '⬅');
      }
      return;
    }

    const key = e.key;

    // SPACE BAR: ALWAYS page scroll; NEVER pause the video. Stop immediate propagation so YouTube's player never receives Space.
    if (key === ' ' || e.code === 'Space') {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      window.scrollBy({ top: e.shiftKey ? -320 : 320, behavior: 'smooth' });
      return;
    }

    // PLAY / PAUSE: Strictly Shift+K (or k)
    if (key.toLowerCase() === 'k') {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      togglePlayPause();
      return;
    }

    // SKIP AD: Shift+A or a
    if (key.toLowerCase() === 'a' || e.code === 'KeyA') {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      skipAd();
      return;
    }

    // TILED FULLSCREEN: Shift+F or w (Windowed within tile - stops propagation so YouTube native player does not go OS fullscreen)
    if ((key.toLowerCase() === 'f' && e.shiftKey) || key.toLowerCase() === 'w') {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      toggleTiledFullscreen();
      return;
    }

    // Two-key leader sequences (g h, g s, g t, g l)
    if (gLeaderActive) {
      clearTimeout(gLeaderTimer);
      gLeaderActive = false;
      const k = e.key.toLowerCase();
      if (k === 'h') {
        e.preventDefault();
        window.location.href = 'https://www.youtube.com/';
        return;
      } else if (k === 's') {
        e.preventDefault();
        window.location.href = 'https://www.youtube.com/feed/subscriptions';
        return;
      } else if (k === 't') {
        e.preventDefault();
        window.location.href = 'https://www.youtube.com/feed/trending';
        return;
      } else if (k === 'l') {
        e.preventDefault();
        window.location.href = 'https://www.youtube.com/feed/you';
        return;
      }
    }

    // Help Modal Toggle: '?'
    if (key === '?') {
      e.preventDefault();
      toggleHelpModal();
      return;
    }

    // Escape Handler
    if (key === 'Escape') {
      if (modalBackdrop && modalBackdrop.classList.contains('show')) {
        e.preventDefault();
        toggleHelpModal();
        return;
      }
      if (document.body.classList.contains('yt-kbd-tiled-fullscreen')) {
        e.preventDefault();
        toggleTiledFullscreen();
        return;
      }
      if (currentNavItem || currentCard) {
        e.preventDefault();
        clearNavSelection();
        watchFocus = 'player';
        showOSD(isWatchPage() ? 'Player Controls' : 'Selection Cleared', '🎬');
        return;
      }
      if (document.fullscreenElement) {
        e.preventDefault();
        document.exitFullscreen().catch(() => {});
        return;
      }
    }

    // TAB / Shift+TAB: Cycle between on-page icons (Home logo, search, channel, like, comments) & video cards
    if (key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      navigateNavItems(e.shiftKey ? -1 : 1);
      return;
    }

    // DIRECT HOME SHORTCUT: 'h' focuses YouTube Home logo (or navigates home if already selected)
    if (key === 'h' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      const items = getNavigableItems();
      const logoIdx = items.findIndex(it => it.type === 'logo');
      if (logoIdx !== -1) {
        if (currentNavIndex === logoIdx) {
          activateCurrentItem();
        } else {
          selectNavItem(logoIdx, items);
        }
      } else {
        window.location.href = 'https://www.youtube.com/';
      }
      return;
    }

    // Search focus: '/' or 's'
    if (key === '/' || key === 's') {
      e.preventDefault();
      focusSearch();
      return;
    }

    // Backspace: Navigate back
    if (key === 'Backspace') {
      e.preventDefault();
      window.history.back();
      showOSD('Back', '⬅');
      return;
    }

    // Home key: Go home
    if (key === 'Home') {
      e.preventDefault();
      window.location.href = 'https://www.youtube.com/';
      return;
    }

    // Leader key 'g'
    if (key === 'g' && !e.shiftKey) {
      e.preventDefault();
      gLeaderActive = true;
      showOSD('Go to: h (Home), s (Subs), t (Trend)', '⚡');
      gLeaderTimer = setTimeout(() => {
        gLeaderActive = false;
      }, 1500);
      return;
    }

    // Fullscreen native: 'f'
    if (key === 'f' && !e.shiftKey) {
      e.preventDefault();
      toggleFullscreen();
      return;
    }

    // 'v' or 'r': Toggle navigation focus
    if (key === 'v' || key === 'r') {
      e.preventDefault();
      if (currentNavItem || currentCard) {
        clearNavSelection();
        watchFocus = 'player';
        showOSD('Player Controls', '🎬');
      } else {
        navigateNavItems(1);
      }
      return;
    }

    // Shorts Page controls
    if (isShortsPage()) {
      if (key === 'ArrowDown' || key === 'j') {
        e.preventDefault();
        const nextBtn = document.querySelector('#navigation-button-down button');
        if (nextBtn) nextBtn.click();
        else window.scrollBy({ top: window.innerHeight, behavior: 'smooth' });
        return;
      }
      if (key === 'ArrowUp' || key === 'k') {
        e.preventDefault();
        const prevBtn = document.querySelector('#navigation-button-up button');
        if (prevBtn) prevBtn.click();
        else window.scrollBy({ top: -window.innerHeight, behavior: 'smooth' });
        return;
      }
      if (key === 'm') {
        e.preventDefault();
        toggleMute();
        return;
      }
    }

    // Watch Page Controls
    if (isWatchPage()) {
      // Jump to Comments: Shift+C
      if (key === 'C' && e.shiftKey) {
        e.preventDefault();
        jumpToComments();
        return;
      }

      // Toggle Scroll Mode directly: Shift+S or ScrollLock
      if ((key === 'S' && e.shiftKey) || key === 'ScrollLock') {
        e.preventDefault();
        toggleScrollMode();
        return;
      }

      // Universal Page Scrolling anytime with Shift + ArrowDown / ArrowUp or PageDown / PageUp
      if (key === 'ArrowDown' && e.shiftKey) {
        e.preventDefault();
        window.scrollBy({ top: 220, behavior: 'smooth' });
        return;
      }
      if (key === 'ArrowUp' && e.shiftKey) {
        e.preventDefault();
        window.scrollBy({ top: -220, behavior: 'smooth' });
        return;
      }
      if (key === 'PageDown') {
        e.preventDefault();
        window.scrollBy({ top: window.innerHeight * 0.75, behavior: 'smooth' });
        return;
      }
      if (key === 'PageUp') {
        e.preventDefault();
        window.scrollBy({ top: -window.innerHeight * 0.75, behavior: 'smooth' });
        return;
      }

      // Scroll Mode (when reading comments or scrolling page)
      if (watchFocus === 'scroll') {
        if (key === 'ArrowDown' || key === 'j') {
          e.preventDefault();
          window.scrollBy({ top: 160, behavior: 'smooth' });
          return;
        }
        if (key === 'ArrowUp' || key === 'k') {
          e.preventDefault();
          window.scrollBy({ top: -160, behavior: 'smooth' });
          return;
        }
        if (key === 'Escape') {
          e.preventDefault();
          watchFocus = 'player';
          showOSD('Player Mode (↑↓ Volume, ←→ Seek)', '🎬');
          return;
        }
        if (key === 'Home') {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: 'smooth' });
          watchFocus = 'player';
          showOSD('Player Mode', '🎬');
          return;
        }
        if (key === 'm') {
          e.preventDefault();
          toggleMute();
          return;
        }
      }

      // Like video: '+' or Shift+L
      if (key === '+' || (key === 'L' && e.shiftKey)) {
        e.preventDefault();
        likeVideo();
        return;
      }

      // If an interactive item or recommendation card IS currently selected:
      if (currentNavItem || currentCard) {
        if (key === 'Enter') {
          e.preventDefault();
          activateCurrentItem();
          return;
        }
        if (key === 'ArrowDown') {
          e.preventDefault();
          navigateNavItems(1);
          return;
        }
        if (key === 'ArrowUp') {
          e.preventDefault();
          navigateNavItems(-1);
          return;
        }
        if (key === 'ArrowLeft') {
          e.preventDefault();
          clearNavSelection();
          watchFocus = 'player';
          showOSD('Player Controls', '🎬');
          return;
        }
      }

      // Default Watch Page Player Mode (when no item is highlighted)
      if (key === 'ArrowLeft') {
        e.preventDefault();
        seekRelative(-5);
        return;
      }
      if (key === 'ArrowRight') {
        e.preventDefault();
        seekRelative(5);
        return;
      }
      if (key === 'j') {
        e.preventDefault();
        seekRelative(-10);
        return;
      }
      if (key === 'l') {
        e.preventDefault();
        seekRelative(10);
        return;
      }
      if (key === 'ArrowUp') {
        e.preventDefault();
        changeVolume(5);
        return;
      }
      if (key === 'ArrowDown') {
        e.preventDefault();
        changeVolume(-5);
        return;
      }
      if (key === 'm') {
        e.preventDefault();
        toggleMute();
        return;
      }
      if (key === 't') {
        e.preventDefault();
        const btn = document.querySelector('.ytp-size-button');
        if (btn) btn.click();
        showOSD('Theatre Mode', '🔲');
        return;
      }
      if (key === 'i') {
        e.preventDefault();
        const btn = document.querySelector('.ytp-miniplayer-button');
        if (btn) btn.click();
        showOSD('Miniplayer', '🗔');
        return;
      }
      if (key === 'c') {
        e.preventDefault();
        const btn = document.querySelector('.ytp-subtitles-button');
        if (btn) btn.click();
        showOSD('Subtitles / CC', '💬');
        return;
      }
      if (key === 'N' && e.shiftKey) {
        e.preventDefault();
        nextVideo();
        return;
      }
      if (key === 'P' && e.shiftKey) {
        e.preventDefault();
        prevVideo();
        return;
      }
      if (key === '>' || key === ']') {
        e.preventDefault();
        changeSpeed(1);
        return;
      }
      if (key === '<' || key === '[') {
        e.preventDefault();
        changeSpeed(-1);
        return;
      }
      if (/^[0-9]$/.test(key)) {
        e.preventDefault();
        seekPercent(parseInt(key, 10) * 10);
        return;
      }
    }

    // Browse Pages (Home, Search, Subscriptions, Channel Feeds)
    if (isBrowsePage()) {
      if (currentNavItem && currentNavItem.type !== 'video') {
        if (key === 'Enter') {
          e.preventDefault();
          activateCurrentItem();
          return;
        }
        if (key === 'ArrowDown') {
          e.preventDefault();
          navigateNavItems(1);
          return;
        }
        if (key === 'ArrowUp') {
          e.preventDefault();
          navigateNavItems(-1);
          return;
        }
      }

      if (key === 'ArrowRight') {
        e.preventDefault();
        navigateDirection('Right');
        return;
      }
      if (key === 'ArrowLeft') {
        e.preventDefault();
        navigateDirection('Left');
        return;
      }
      if (key === 'ArrowDown') {
        e.preventDefault();
        navigateDirection('Down');
        return;
      }
      if (key === 'ArrowUp') {
        e.preventDefault();
        navigateDirection('Up');
        return;
      }
      if (key === 'j') {
        e.preventDefault();
        navigateNavItems(1);
        return;
      }
      if (key === 'k') {
        e.preventDefault();
        navigateNavItems(-1);
        return;
      }
      if (key === 'Enter') {
        e.preventDefault();
        if (currentNavItem) {
          activateCurrentItem();
        } else if (currentCard) {
          openSelectedVideo();
        } else {
          navigateDirection('Down');
          if (currentCard) openSelectedVideo();
        }
        return;
      }
    }
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  if (!document.body) {
    window.addEventListener('DOMContentLoaded', () => {
      injectExtensionStyles();
      createOSD();
      createHelpModal();
    });
  }
})();

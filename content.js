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
    // Modern desktop skip buttons
    'button.ytp-ad-skip-button-modern',
    '.ytp-ad-skip-button-modern',
    'button.ytp-skip-ad-button',
    '.ytp-skip-ad-button',
    'button.ytp-ad-skip-button',
    '.ytp-ad-skip-button',
    '.ytp-ad-skip-button-slot button',
    '.ytp-ad-skip-button-container button',
    '.ytp-ad-player-overlay-skip-or-preview button',
    '.ytp-ad-player-overlay-skip-or-preview-modern button',
    'button.ytp-ad-skip-button-icon',
    'button[id^="skip-button"]',
    'div[id^="skip-button"] button',
    'button[id*="skip"]',
    'button[class*="skip-button"]',
    '.videoAdUiSkipButton',
    'button.videoAdUiSkipButton',
    'button[aria-label*="skip" i]',
    'button[aria-label*="Skip" i]',
    '[aria-label*="Skip ad" i]',
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

      /* Highlight for selected elements (video cards, icons, buttons) */
      .yt-kbd-selected {
        outline: 3px solid #ff0033 !important;
        outline-offset: 4px !important;
        border-radius: 12px !important;
        box-shadow: 0 0 24px rgba(255, 0, 51, 0.55), 0 4px 16px rgba(0, 0, 0, 0.7) !important;
        position: relative !important;
        z-index: 9999 !important;
        transform: scale(1.02) !important;
        transition: transform 0.15s cubic-bezier(0.2, 0, 0, 1), outline 0.15s ease, box-shadow 0.15s ease !important;
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

  function getVideoCards(root = document) {
    const raw = Array.from(root.querySelectorAll(VIDEO_CARD_SELECTORS));
    return raw.filter(card => {
      if (card.querySelector('ytd-ad-slot-renderer, .ytd-in-feed-ad-layout-renderer, ytd-statement-banner-renderer')) {
        return false;
      }
      const rect = card.getBoundingClientRect();
      if (rect.width < 40 || rect.height < 40) return false;
      const style = window.getComputedStyle(card);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
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
      behavior: 'smooth',
      block: 'nearest',
      inline: 'nearest'
    });

    watchFocus = 'nav';
    showOSD(`${currentNavItem.label} (${currentNavItem.badge})`, currentNavItem.icon);
  }

  function clearNavSelection() {
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
    clearNavSelection();
    currentCard = card;
    currentCard.classList.add('yt-kbd-selected');
    currentCard.setAttribute('data-yt-kbd-badge', '⏎ Open');
    currentCard.scrollIntoView({
      behavior: 'smooth',
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

    const curRect = currentCard.getBoundingClientRect();
    const cx = curRect.left + curRect.width / 2;
    const cy = curRect.top + curRect.height / 2;
    const others = cards.filter(c => c !== currentCard);
    let target = null;

    if (dir === 'Right') {
      const rowCandidates = others.filter(c => {
        const r = c.getBoundingClientRect();
        const candCy = r.top + r.height / 2;
        return r.left >= curRect.left + 15 && Math.abs(candCy - cy) < curRect.height * 0.6;
      });
      if (rowCandidates.length > 0) {
        rowCandidates.sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
        target = rowCandidates[0];
      } else {
        const nextRow = others.filter(c => c.getBoundingClientRect().top >= curRect.bottom - 15);
        if (nextRow.length > 0) {
          nextRow.sort((a, b) => {
            const ra = a.getBoundingClientRect();
            const rb = b.getBoundingClientRect();
            if (Math.abs(ra.top - rb.top) > 40) return ra.top - rb.top;
            return ra.left - rb.left;
          });
          target = nextRow[0];
        }
      }
    } else if (dir === 'Left') {
      const rowCandidates = others.filter(c => {
        const r = c.getBoundingClientRect();
        const candCy = r.top + r.height / 2;
        return r.right <= curRect.right - 15 && Math.abs(candCy - cy) < curRect.height * 0.6;
      });
      if (rowCandidates.length > 0) {
        rowCandidates.sort((a, b) => b.getBoundingClientRect().right - a.getBoundingClientRect().right);
        target = rowCandidates[0];
      } else {
        const prevRow = others.filter(c => c.getBoundingClientRect().bottom <= curRect.top + 15);
        if (prevRow.length > 0) {
          prevRow.sort((a, b) => {
            const ra = a.getBoundingClientRect();
            const rb = b.getBoundingClientRect();
            if (Math.abs(ra.top - rb.top) > 40) return rb.top - ra.top;
            return rb.right - ra.right;
          });
          target = prevRow[0];
        }
      }
    } else if (dir === 'Down') {
      const below = others.filter(c => c.getBoundingClientRect().top + c.getBoundingClientRect().height / 2 > cy + 15);
      if (below.length > 0) {
        below.sort((a, b) => {
          const ra = a.getBoundingClientRect();
          const rb = b.getBoundingClientRect();
          const ax = ra.left + ra.width / 2;
          const ay = ra.top + ra.height / 2;
          const bx = rb.left + rb.width / 2;
          const by = rb.top + rb.height / 2;
          const scoreA = Math.abs(ax - cx) * 2.2 + (ay - cy);
          const scoreB = Math.abs(bx - cx) * 2.2 + (by - cy);
          return scoreA - scoreB;
        });
        target = below[0];
      } else {
        window.scrollBy({ top: 600, behavior: 'smooth' });
      }
    } else if (dir === 'Up') {
      const above = others.filter(c => c.getBoundingClientRect().top + c.getBoundingClientRect().height / 2 < cy - 15);
      if (above.length > 0) {
        above.sort((a, b) => {
          const ra = a.getBoundingClientRect();
          const rb = b.getBoundingClientRect();
          const ax = ra.left + ra.width / 2;
          const ay = ra.top + ra.height / 2;
          const bx = rb.left + rb.width / 2;
          const by = rb.top + rb.height / 2;
          const scoreA = Math.abs(ax - cx) * 2.2 + (cy - ay);
          const scoreB = Math.abs(bx - cx) * 2.2 + (cy - by);
          return scoreA - scoreB;
        });
        target = above[0];
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
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

  // Click a skip button cleanly using native click + pointer/mouse event simulation
  function clickSkipButton(el) {
    if (!el) return false;

    // Resolve to the nearest clickable button or interactive element
    const btn = (el.tagName === 'BUTTON' ? el : null) ||
                (el.closest && el.closest('button')) ||
                (el.querySelector && el.querySelector('button')) ||
                el;

    let clicked = false;

    // 1. Direct native click (triggers Polymer/framework listeners)
    try {
      if (typeof btn.click === 'function') {
        btn.click();
        clicked = true;
      }
    } catch (e) {}

    // 2. Dispatch full pointer & mouse sequence directly on the button
    try {
      const rect = btn.getBoundingClientRect ? btn.getBoundingClientRect() : { left: 0, top: 0, width: 0, height: 0 };
      const clientX = rect.left + (rect.width > 0 ? rect.width / 2 : 10);
      const clientY = rect.top + (rect.height > 0 ? rect.height / 2 : 10);
      const opts = {
        bubbles: true,
        cancelable: true,
        view: window,
        composed: true,
        clientX: clientX,
        clientY: clientY,
        button: 0,
        buttons: 1
      };

      if (window.PointerEvent) {
        btn.dispatchEvent(new PointerEvent('pointerdown', opts));
      }
      btn.dispatchEvent(new MouseEvent('mousedown', opts));
      if (window.PointerEvent) {
        btn.dispatchEvent(new PointerEvent('pointerup', opts));
      }
      btn.dispatchEvent(new MouseEvent('mouseup', opts));
      btn.dispatchEvent(new MouseEvent('click', opts));
      clicked = true;
    } catch (e) {}

    // If target was resolved from a child, also trigger click on child
    if (el !== btn && typeof el.click === 'function') {
      try {
        el.click();
      } catch (e) {}
    }

    return clicked;
  }

  // Find all potential skip buttons using selectors and deep text/aria scanning
  function findSkipButtons() {
    const candidates = [];

    // 1. Check known button selectors
    for (const selector of SKIP_AD_SELECTORS) {
      try {
        const found = document.querySelectorAll(selector);
        for (let i = 0; i < found.length; i++) {
          const el = found[i];
          if (el && !candidates.includes(el)) {
            candidates.push(el);
          }
        }
      } catch (e) {}
    }

    // 2. Scan ad modules strictly for button elements with skip text or skip aria labels
    const adModule = document.querySelector('.video-ads.ytp-ad-module, .ytp-ad-module');
    if (adModule) {
      try {
        const btns = adModule.querySelectorAll('button, [role="button"], .ytp-button');
        for (let i = 0; i < btns.length; i++) {
          const el = btns[i];
          if (candidates.includes(el)) continue;

          const aria = (el.getAttribute('aria-label') || '').trim().toLowerCase();
          if (aria.includes('skip')) {
            candidates.push(el);
            continue;
          }

          const text = (el.textContent || '').trim().toLowerCase();
          if (text.includes('skip') && text.length <= 15 && !text.startsWith('skip in')) {
            candidates.push(el);
          }
        }
      } catch (e) {}
    }

    return candidates;
  }

  function dismissOverlayAds() {
    const overlays = document.querySelectorAll(
      'button.ytp-ad-overlay-close-button, .ytp-ad-overlay-close-button, .ytp-ad-image-overlay button'
    );
    for (let i = 0; i < overlays.length; i++) {
      clickSkipButton(overlays[i]);
    }
  }

  // Skip Video Ad on keypress (Shift+A or a)
  function skipAd() {
    const player = getPlayer();
    const isAd = Boolean(
      document.querySelector('.ad-showing, .ad-interrupting') ||
      (player && player.classList && (player.classList.contains('ad-showing') || player.classList.contains('ad-interrupting')))
    );

    const buttons = findSkipButtons();

    if (!isAd && buttons.length === 0) {
      showOSD('No Ad to Skip', '⏭');
      return false;
    }

    let handled = false;

    // 1. Click skip buttons
    for (const btn of buttons) {
      if (clickSkipButton(btn)) {
        handled = true;
      }
    }

    // 2. Dismiss any overlay banner ads
    dismissOverlayAds();

    // 3. YouTube Player native API skip
    if (player && typeof player.skipAd === 'function') {
      try {
        player.skipAd();
        handled = true;
      } catch (e) {}
    }

    // 4. Fast-forward video ONLY when an ad is actively playing
    if (isAd) {
      const video = getVideo();
      if (video && isFinite(video.duration) && video.duration > 0) {
        handled = true;
        try {
          video.muted = true;
          video.playbackRate = 16.0;
          video.currentTime = Math.max(0, video.duration - 0.1);

          const restoreSpeed = () => {
            if (video && video.playbackRate === 16.0) {
              video.playbackRate = 1.0;
            }
          };
          video.addEventListener('ended', restoreSpeed, { once: true });
          setTimeout(restoreSpeed, 1000);
        } catch (e) {}
      }
    }

    // Burst retry for smooth button clicking during animation transitions
    if (buttons.length > 0) {
      [60, 150, 300].forEach(delay => {
        setTimeout(() => {
          const retryButtons = findSkipButtons();
          for (const b of retryButtons) {
            clickSkipButton(b);
          }
        }, delay);
      });
    }

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
      const card = e.target.closest(VIDEO_CARD_SELECTORS);
      if (card && getVideoCards().includes(card)) {
        selectCard(card);
      }
    }, true);

    window.addEventListener('yt-navigate-finish', handlePageChange);
    window.addEventListener('popstate', handlePageChange);
  }

  function handlePageChange() {
    clearNavSelection();
    watchFocus = 'player';
    if (modalBackdrop) modalBackdrop.classList.remove('show');
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

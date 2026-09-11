# YouTube Keyboard Navigation & Playback Controller

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-red.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Chromium%20%7C%20Brave%20%7C%20Edge%20%7C%20Hyprland-blueviolet.svg)](#installation)

Full keyboard navigation, instant ad skipping, windowed tiled fullscreen, and enhanced playback controls for the YouTube web app and PWAs. Built for power users and tiling window managers (Hyprland, i3, Sway, bspwm) on Arch Linux and Omarchy.

---

## ✨ Features

- **🏠 Interactive On-Page Navigation**:
  - Press <kbd>Tab</kbd> / <kbd>Shift</kbd> + <kbd>Tab</kbd> on any video page to cycle between the **YouTube Home logo**, **Search box**, **Channel**, **Like button**, **Comments**, and **Video recommendations**.
  - Press <kbd>Enter</kbd> to activate the selected item (e.g. highlight Home logo &rarr; press <kbd>Enter</kbd> to return to homepage).
  - Press <kbd>h</kbd> to immediately target the YouTube Home button.
- **⏭ Instant Skip Ad**:
  - Tap <kbd>Shift</kbd> + <kbd>A</kbd> or <kbd>a</kbd> to skip video ads the instant the skip button appears.
- **🔲 Tiled Windowed Fullscreen**:
  - Press <kbd>Shift</kbd> + <kbd>F</kbd> or <kbd>w</kbd> to expand the video to completely fill your active browser window or Hyprland tile with clean letterboxing—without triggering monitor-wide OS fullscreen.
- **⏸ Accidental Pause Prevention**:
  - <kbd>Space</kbd> performs smooth page scrolling without accidentally pausing playback.
  - Play/pause is strictly mapped to <kbd>Shift</kbd> + <kbd>K</kbd> (or <kbd>k</kbd>).
- **📜 Comments & Dedicated Scroll Mode**:
  - Press <kbd>Shift</kbd> + <kbd>C</kbd> to smoothly scroll to comments and activate scroll mode.
  - While in scroll mode, <kbd>↑</kbd> and <kbd>↓</kbd> (or <kbd>j</kbd>/<kbd>k</kbd>) scroll the page rather than adjusting audio volume. Tap <kbd>Esc</kbd> or <kbd>←</kbd> to return to player mode.
- **⚡ Glassmorphic On-Screen Display (OSD)**:
  - Clean floating pill notification confirms volume, seek, speed, like, and navigation states.
- **📋 Interactive Fuzzy Search Menu**:
  - Includes a desktop menu script (`omarchy-menu-youtube-keybindings`) that integrates directly with Hyprland and `omarchy-menu-select` / `wofi` (<kbd>SUPER</kbd> + <kbd>SHIFT</kbd> + <kbd>K</kbd>).

---

## ⌨ Keyboard Shortcut Reference

### Playback & Video Controls
| Shortcut | Action |
| :--- | :--- |
| <kbd>Shift</kbd> + <kbd>K</kbd> or <kbd>k</kbd> | Play / Pause video |
| <kbd>Shift</kbd> + <kbd>A</kbd> or <kbd>a</kbd> | Skip video ad immediately |
| <kbd>Shift</kbd> + <kbd>F</kbd> or <kbd>w</kbd> | Tiled fullscreen (windowed — stays in window/tile) |
| <kbd>f</kbd> | Native OS fullscreen |
| <kbd>←</kbd> / <kbd>→</kbd> | Seek backward / forward 5 seconds |
| <kbd>j</kbd> / <kbd>l</kbd> | Seek backward / forward 10 seconds |
| <kbd>↑</kbd> / <kbd>↓</kbd> | Volume up / down (±5%) |
| <kbd>m</kbd> | Toggle mute / unmute |
| <kbd>0</kbd> .. <kbd>9</kbd> | Seek to 0% .. 90% of duration |
| <kbd>]</kbd> / <kbd>&gt;</kbd> | Speed up playback (+0.25x) |
| <kbd>[</kbd> / <kbd>&lt;</kbd> | Slow down playback (-0.25x) |
| <kbd>Shift</kbd> + <kbd>N</kbd> | Next video in queue/playlist |
| <kbd>Shift</kbd> + <kbd>P</kbd> | Previous video |
| <kbd>t</kbd> | Toggle theater mode |
| <kbd>i</kbd> | Toggle miniplayer |
| <kbd>c</kbd> | Toggle subtitles / captions |
| <kbd>+</kbd> or <kbd>Shift</kbd> + <kbd>L</kbd> | Like / Toggle like |
| <kbd>Space</kbd> / <kbd>Shift</kbd> + <kbd>Space</kbd> | Smooth page scroll down / up (does NOT pause) |

### On-Page Elements & Card Browsing
| Shortcut | Action |
| :--- | :--- |
| <kbd>Tab</kbd> / <kbd>Shift</kbd> + <kbd>Tab</kbd> | Cycle through on-page icons (Home Logo, Search, Channel, Like, Comments) and recommended videos |
| <kbd>h</kbd> | Direct focus to YouTube Home logo (<kbd>Enter</kbd> to go Home) |
| <kbd>Enter</kbd> | Activate highlighted element (go Home, focus search, view channel, like, open video) |
| <kbd>Esc</kbd> or <kbd>←</kbd> | Deselect element / card & return to player controls |
| <kbd>v</kbd> or <kbd>r</kbd> | Toggle on-page navigation mode |
| <kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd> | 2D directional grid navigation across video cards in feeds & search |
| <kbd>Shift</kbd> + <kbd>C</kbd> | Smooth jump to comments & activate Scroll Mode |
| <kbd>Shift</kbd> + <kbd>S</kbd> | Toggle Scroll Mode (<kbd>↑</kbd>/<kbd>↓</kbd> scroll page instead of volume) |
| <kbd>Shift</kbd> + <kbd>↑</kbd> / <kbd>↓</kbd> | Scroll page up / down anytime |

### Quick Navigation & Feeds
| Shortcut | Action |
| :--- | :--- |
| <kbd>/</kbd> or <kbd>s</kbd> | Focus search box |
| <kbd>Backspace</kbd> or <kbd>Alt</kbd> + <kbd>←</kbd> | Navigate back in history |
| <kbd>g</kbd> then <kbd>h</kbd> | Go to Home feed |
| <kbd>g</kbd> then <kbd>s</kbd> | Go to Subscriptions feed |
| <kbd>g</kbd> then <kbd>t</kbd> | Go to Trending feed |
| <kbd>g</kbd> then <kbd>l</kbd> | Go to Library ("You") |
| <kbd>?</kbd> | Toggle built-in shortcut cheatsheet modal |

---

## 🚀 Installation

### 1. Quick Install (Linux / Omarchy)
Clone the repository and run the installer:

```bash
git clone https://github.com/tomlawson9444/youtube-keyboard-navigation.git
cd youtube-keyboard-navigation
./install.sh
```

This copies the extension files to `~/.config/chromium/extensions/youtube-nav` and installs `omarchy-menu-youtube-keybindings` to `~/.local/bin/`.

### 2. Load into Your Browser
Compatible with **Chromium**, **Google Chrome**, **Brave**, **Microsoft Edge**, and **Arc**:

1. Navigate to `chrome://extensions` in your browser.
2. Toggle **Developer mode** in the top-right corner.
3. Click **Load unpacked**.
4. Select the `youtube-keyboard-navigation` directory (or `~/.config/chromium/extensions/youtube-nav`).

### 3. Hyprland Desktop Keybinding (Optional)
To bind the interactive fuzzy-search keybindings menu to <kbd>SUPER</kbd> + <kbd>SHIFT</kbd> + <kbd>K</kbd>, add this line to your Hyprland configuration (e.g. `~/.config/hypr/bindings.lua` or `hyprland.conf`):

```ini
bind = $mainMod SHIFT, K, exec, omarchy-menu-youtube-keybindings
```

---

## 📄 License

Distributed under the [MIT License](LICENSE). Copyright &copy; 2026 Tom Lawson.

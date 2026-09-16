# YouTube Keyboard Navigation — Omarchy Edition

[![Designed for Omarchy](https://img.shields.io/badge/Designed_for-Omarchy_Linux-black?logo=archlinux)](https://omarchy.org/)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-red.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Licence: MIT](https://img.shields.io/badge/Licence-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Chromium%20%7C%20Brave%20%7C%20Edge%20%7C%20Hyprland-blueviolet.svg)](#installation)

A high-performance browser extension and desktop menu utility purpose-built for **[Omarchy](https://omarchy.org/)** and its Hyprland tiling desktop. Provides comprehensive keyboard control for the YouTube web app and PWAs—eliminating the need for a mouse and harmonising video playback with your tiling window workflow.

---

## ✨ Features

- **🏠 Interactive On-Page Navigation**:
  - Press <kbd>Tab</kbd> / <kbd>Shift</kbd> + <kbd>Tab</kbd> on any video page to cycle between the **YouTube Home logo**, **Search box**, **Channel**, **Like button**, **Comments section**, and **Video recommendations**.
  - Press <kbd>Enter</kbd> to action whichever item is highlighted (e.g. highlight the Home logo &rarr; press <kbd>Enter</kbd> to return to the homepage).
  - Press <kbd>h</kbd> to jump focus straight to the YouTube Home logo.
- **⏭ Instant Ad Skipping**:
  - Tap <kbd>Shift</kbd> + <kbd>A</kbd> or <kbd>a</kbd> to dismiss video advertisements the moment the skip button appears.
- **🔲 Tiled Windowed Full Screen**:
  - Press <kbd>Shift</kbd> + <kbd>F</kbd> or <kbd>w</kbd> to expand the video to completely fill your active Hyprland tile or browser window with clean letterboxing—without triggering monitor-wide OS full screen or disrupting your tiling layout.
- **⏸ Accidental Pause Prevention**:
  - <kbd>Space</kbd> performs smooth page scrolling without accidentally pausing playback.
  - Play/pause is strictly mapped to <kbd>Shift</kbd> + <kbd>K</kbd> (or unshifted <kbd>k</kbd>).
- **📜 Comments & Dedicated Scroll Mode**:
  - Press <kbd>Shift</kbd> + <kbd>C</kbd> to smoothly scroll down to comments and engage scroll mode.
  - Whilst in scroll mode, <kbd>↑</kbd> and <kbd>↓</kbd> (or <kbd>j</kbd>/<kbd>k</kbd>) scroll the page rather than adjusting audio volume. Tap <kbd>Esc</kbd> or <kbd>←</kbd> to return to player mode.
- **⚡ Glassmorphic On-Screen Display (OSD)**:
  - Clean floating pill notification confirms volume, seek position, playback speed, likes, and navigation states.
- **📋 Omarchy Desktop Keybindings Menu**:
  - Includes an interactive desktop search menu (`omarchy-menu-youtube-keybindings`) integrated with `omarchy-menu-select` and Hyprland (<kbd>SUPER</kbd> + <kbd>SHIFT</kbd> + <kbd>K</kbd>).

---

## ⌨ Keyboard Shortcut Reference

### Playback & Video Controls
| Shortcut | Action |
| :--- | :--- |
| <kbd>Shift</kbd> + <kbd>K</kbd> or <kbd>k</kbd> | Play / Pause video |
| <kbd>Shift</kbd> + <kbd>A</kbd> or <kbd>a</kbd> | Skip video advertisement immediately |
| <kbd>Shift</kbd> + <kbd>F</kbd> or <kbd>w</kbd> | Tiled full screen (windowed — stays inside active tile) |
| <kbd>f</kbd> | Native OS full screen |
| <kbd>←</kbd> / <kbd>→</kbd> | Seek backward / forward 5 seconds |
| <kbd>j</kbd> / <kbd>l</kbd> | Seek backward / forward 10 seconds |
| <kbd>↑</kbd> / <kbd>↓</kbd> | Volume up / down (±5%) |
| <kbd>m</kbd> | Toggle mute / unmute |
| <kbd>0</kbd> .. <kbd>9</kbd> | Seek to 0% .. 90% of video duration |
| <kbd>]</kbd> / <kbd>&gt;</kbd> | Speed up playback (+0.25x) |
| <kbd>[</kbd> / <kbd>&lt;</kbd> | Slow down playback (-0.25x) |
| <kbd>Shift</kbd> + <kbd>N</kbd> | Next video in queue/playlist |
| <kbd>Shift</kbd> + <kbd>P</kbd> | Previous video |
| <kbd>t</kbd> | Toggle theatre mode |
| <kbd>i</kbd> | Toggle miniplayer |
| <kbd>c</kbd> | Toggle subtitles / captions |
| <kbd>+</kbd> or <kbd>Shift</kbd> + <kbd>L</kbd> | Like / Toggle like |
| <kbd>Space</kbd> / <kbd>Shift</kbd> + <kbd>Space</kbd> | Smooth page scroll down / up (does NOT pause video) |

### On-Page Elements & Card Browsing
| Shortcut | Action |
| :--- | :--- |
| <kbd>Tab</kbd> / <kbd>Shift</kbd> + <kbd>Tab</kbd> | Cycle through on-page icons (Home Logo, Search, Channel, Like, Comments) and recommended videos |
| <kbd>h</kbd> | Direct focus to YouTube Home logo (<kbd>Enter</kbd> to go Home) |
| <kbd>Enter</kbd> | Action highlighted element (go Home, focus search, view channel, like, open video) |
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

### 1. Quick Install on Omarchy
Clone the repository and run the automated installer:

```bash
git clone https://github.com/tomlawson9444/youtube-keyboard-navigation.git
cd youtube-keyboard-navigation
./install.sh
```

This installs the extension to `~/.config/chromium/extensions/youtube-nav` and places the interactive menu helper in `~/.local/bin/omarchy-menu-youtube-keybindings`. The installer is safe to re-run: it verifies every source file exists before copying anything, and it only ever writes into those two known locations.

### 2. Load into Your Browser
Compatible with **Chromium**, **Google Chrome**, **Brave**, **Microsoft Edge**, and **Arc**:

1. Navigate to `chrome://extensions` in your browser.
2. Toggle **Developer mode** in the top-right corner.
3. Click **Load unpacked**.
4. Select the `youtube-keyboard-navigation` directory (or `~/.config/chromium/extensions/youtube-nav`).

### 3. Omarchy / Hyprland Desktop Keybinding
To bind the interactive fuzzy-search keybindings menu to <kbd>SUPER</kbd> + <kbd>SHIFT</kbd> + <kbd>K</kbd>, add the following binding to `~/.config/hypr/bindings.lua`:

```lua
o.bind("SUPER + SHIFT + K", "YouTube Shortcuts", "omarchy-menu-youtube-keybindings")
```

*(Alternatively, in standard `hyprland.conf`:)*
```ini
bind = $mainMod SHIFT, K, exec, omarchy-menu-youtube-keybindings
```

### 4. Removal
To cleanly remove everything the installer added:

```bash
cd youtube-keyboard-navigation
./uninstall.sh
```

This deletes `~/.config/chromium/extensions/youtube-nav` and `~/.local/bin/omarchy-menu-youtube-keybindings`, and only those two paths — it never touches anything else on your system. It also prints reminders to:
- Remove the extension from `chrome://extensions` (deleting its source folder does not unregister a "Load unpacked" extension on its own).
- Delete the Hyprland keybinding line from `~/.config/hypr/bindings.lua` or `hyprland.conf`, if you added one.

---

## 📄 Licence

Distributed under the [MIT Licence](LICENSE). Copyright &copy; 2026 Tom Lawson.

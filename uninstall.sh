#!/usr/bin/env bash
set -euo pipefail

EXT_DIR="${HOME}/.config/chromium/extensions/youtube-nav"
BIN_FILE="${HOME}/.local/bin/omarchy-menu-youtube-keybindings"

echo "==> Uninstalling YouTube Keyboard Navigation — Omarchy Edition..."

# 1. Remove extension files (only the known, install.sh-owned directory — never a wildcard/parent path)
if [[ -d "${EXT_DIR}" ]]; then
  rm -rf -- "${EXT_DIR}"
  echo "  [✓] Removed extension files from: ${EXT_DIR}"
else
  echo "  [-] No extension files found at: ${EXT_DIR} (already removed)"
fi

# 2. Remove Omarchy menu script
if [[ -f "${BIN_FILE}" ]]; then
  rm -f -- "${BIN_FILE}"
  echo "  [✓] Removed menu script: ${BIN_FILE}"
else
  echo "  [-] No menu script found at: ${BIN_FILE} (already removed)"
fi

# 3. Manual cleanup reminders (nothing here is auto-editable safely)
echo ""
echo "Uninstall complete!"
echo ""
echo "Remaining manual steps:"
echo "1. In chrome://extensions, remove 'YouTube Keyboard Navigation — Omarchy Edition'"
echo "   (Developer mode 'Load unpacked' extensions are not removed by deleting their source folder.)"
echo ""
echo "2. If you added the Hyprland keybinding, remove this line from your config:"
echo '   - ~/.config/hypr/bindings.lua:  o.bind("SUPER + SHIFT + K", "YouTube Shortcuts", "omarchy-menu-youtube-keybindings")'
echo '   - or ~/.config/hyprland.conf:   bind = $mainMod SHIFT, K, exec, omarchy-menu-youtube-keybindings'
echo ""

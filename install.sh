#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXT_DIR="${HOME}/.config/chromium/extensions/youtube-nav"
BIN_DIR="${HOME}/.local/bin"

echo "==> Installing YouTube Keyboard Navigation..."

# 1. Install Extension files
mkdir -p "${EXT_DIR}"
cp -r "${SCRIPT_DIR}/manifest.json" "${SCRIPT_DIR}/content.js" "${SCRIPT_DIR}/styles.css" "${SCRIPT_DIR}/icons" "${EXT_DIR}/"
echo "  [✓] Extension files installed to: ${EXT_DIR}"

# 2. Install Menu script
mkdir -p "${BIN_DIR}"
cp "${SCRIPT_DIR}/bin/omarchy-menu-youtube-keybindings" "${BIN_DIR}/"
chmod +x "${BIN_DIR}/omarchy-menu-youtube-keybindings"
echo "  [✓] Interactive menu script installed to: ${BIN_DIR}/omarchy-menu-youtube-keybindings"

# 3. Setup instructions
echo ""
echo "Installation complete!"
echo ""
echo "Quick Setup:"
echo "1. In Chromium / Chrome / Brave / Edge:"
echo "   - Open chrome://extensions"
echo "   - Enable 'Developer mode'"
echo "   - Click 'Load unpacked' and select: ${EXT_DIR}"
echo ""
echo "2. Hyprland Keybinding (Optional - binds menu to SUPER + SHIFT + K):"
echo "   Add the following line to your ~/.config/hypr/bindings.lua or hyprland.conf:"
echo '   bind = $mainMod SHIFT, K, exec, omarchy-menu-youtube-keybindings'
echo ""

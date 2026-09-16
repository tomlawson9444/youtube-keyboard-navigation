#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXT_DIR="${HOME}/.config/chromium/extensions/youtube-nav"
BIN_DIR="${HOME}/.local/bin"

echo "==> Installing YouTube Keyboard Navigation — Omarchy Edition..."

# 0. Verify all required source files exist before touching anything (fail closed, not partway through)
for required in manifest.json content.js styles.css icons bin/omarchy-menu-youtube-keybindings; do
  if [[ ! -e "${SCRIPT_DIR}/${required}" ]]; then
    echo "  [x] Missing required source file: ${SCRIPT_DIR}/${required}" >&2
    echo "      Re-clone the repository and try again." >&2
    exit 1
  fi
done

# 1. Install Extension files (re-running this is safe: it only ever writes into EXT_DIR)
mkdir -p "${EXT_DIR}"
cp -r "${SCRIPT_DIR}/manifest.json" "${SCRIPT_DIR}/content.js" "${SCRIPT_DIR}/styles.css" "${SCRIPT_DIR}/icons" "${EXT_DIR}/"
echo "  [✓] Extension files installed to: ${EXT_DIR}"

# 2. Install Omarchy menu script
mkdir -p "${BIN_DIR}"
cp "${SCRIPT_DIR}/bin/omarchy-menu-youtube-keybindings" "${BIN_DIR}/"
chmod +x "${BIN_DIR}/omarchy-menu-youtube-keybindings"
echo "  [✓] Interactive menu script installed to: ${BIN_DIR}/omarchy-menu-youtube-keybindings"

# 3. Setup instructions
echo ""
echo "Installation complete!"
echo ""
echo "Quick Setup for Omarchy:"
echo "1. In Chromium / Google Chrome / Brave / Edge:"
echo "   - Open chrome://extensions"
echo "   - Enable 'Developer mode'"
echo "   - Click 'Load unpacked' and select: ${EXT_DIR}"
echo ""
echo "2. Omarchy / Hyprland Keybinding (Optional):"
echo "   Add this line to your ~/.config/hypr/bindings.lua:"
echo '   o.bind("SUPER + SHIFT + K", "YouTube Shortcuts", "omarchy-menu-youtube-keybindings")'
echo ""
echo "   (Or in standard hyprland.conf):"
echo '   bind = $mainMod SHIFT, K, exec, omarchy-menu-youtube-keybindings'
echo ""
echo "To remove everything this installer added, run: ./uninstall.sh"
echo ""

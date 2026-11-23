#!/usr/bin/env bash
# Renders flyer.html to an A3 PDF (print-ready) and a PNG preview.
# Needs Google Chrome or Chromium; pdftoppm (poppler) is optional for the preview.
set -euo pipefail
cd "$(dirname "$0")"

CHROME="$(command -v google-chrome || command -v google-chrome-stable || command -v chromium-browser || command -v chromium)"

"$CHROME" --headless=new --disable-gpu --no-pdf-header-footer \
  --virtual-time-budget=3000 --allow-file-access-from-files \
  --print-to-pdf=MusicVoting_Flyer_TDOT-2026.pdf "file://$PWD/flyer.html"

if command -v pdftoppm >/dev/null; then
  pdftoppm -png -r 60 -singlefile MusicVoting_Flyer_TDOT-2026.pdf flyer-preview
fi
echo "OK: MusicVoting_Flyer_TDOT-2026.pdf"

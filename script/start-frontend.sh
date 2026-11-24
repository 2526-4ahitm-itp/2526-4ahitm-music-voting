#!/usr/bin/env sh
set -eu

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/musicvoting/frontend"

# Angular 22 needs Node >= 24.15 (or 26). A terminal opened before the nvm default changed keeps
# its old Node on PATH, and ng only fails after npm has started. So check first and, if Node is
# too old, switch to the version in musicvoting/frontend/.nvmrc via nvm.
node_ok() {
  command -v node >/dev/null 2>&1 &&
    node -e 'const [a,b]=process.versions.node.split(".").map(Number); process.exit(a>=26||(a===24&&b>=15)||(a===22&&b>=22)?0:1)'
}

cd "$FRONTEND_DIR"
if ! node_ok; then
  NVM_SH="${NVM_DIR:-$HOME/.nvm}/nvm.sh"
  if [ -s "$NVM_SH" ]; then
    echo "Node $(node -v 2>/dev/null || echo 'not found') is too old for Angular, switching via nvm to $(cat .nvmrc)"
    # nvm.sh is written for bash/zsh; run the start in bash so `nvm use` can change PATH.
    exec bash -c '. "$1" && nvm use >/dev/null && echo "Starting frontend (Angular, Node $(node -v))..." && exec npm start' _ "$NVM_SH"
  fi
  echo "Node >= 24.15 is required (found $(node -v 2>/dev/null || echo none)). Install Node $(cat .nvmrc), e.g. with nvm." >&2
  exit 1
fi

echo "Starting frontend (Angular, Node $(node -v))..."
exec npm start

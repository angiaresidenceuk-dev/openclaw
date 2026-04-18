#!/usr/bin/env bash
# Downloads and installs the Multica CLI for use with OpenClaw.
set -euo pipefail

VERSION="0.2.6"
INSTALL_DIR="/usr/local/bin"

OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"

case "$ARCH" in
  x86_64) ARCH="amd64" ;;
  arm64|aarch64) ARCH="arm64" ;;
  *) echo "Unsupported architecture: $ARCH" >&2; exit 1 ;;
esac

case "$OS" in
  linux|darwin) ;;
  *) echo "Unsupported OS: $OS" >&2; exit 1 ;;
esac

URL="https://github.com/multica-ai/multica/releases/download/v${VERSION}/multica_${OS}_${ARCH}.tar.gz"

echo "Downloading multica v${VERSION} (${OS}/${ARCH})..."
curl -fsSL "$URL" | tar -xz -C "$INSTALL_DIR" multica
chmod +x "$INSTALL_DIR/multica"

echo "Installed: $("$INSTALL_DIR/multica" --version)"
echo ""
echo "Run 'multica setup' to authenticate and start the daemon."
echo "OpenClaw will be auto-detected as an agent provider."

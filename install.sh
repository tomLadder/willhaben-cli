#!/bin/sh
set -e

REPO="tomLadder/willhaben-cli"
INSTALL_DIR="/usr/local/bin"
BINARY_NAME="willhaben"

# Detect OS
OS="$(uname -s)"
case "$OS" in
  Darwin)  OS="darwin" ;;
  Linux)   OS="linux" ;;
  MINGW*|MSYS*|CYGWIN*) OS="windows" ;;
  *) echo "Unsupported OS: $OS" && exit 1 ;;
esac

# Detect architecture
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64|amd64)  ARCH="x64" ;;
  arm64|aarch64)  ARCH="arm64" ;;
  *) echo "Unsupported architecture: $ARCH" && exit 1 ;;
esac

TARGET="${OS}-${ARCH}"

# Windows not supported via this script
if [ "$OS" = "windows" ]; then
  echo "Windows is not supported by this installer."
  echo "Download the binary manually from: https://github.com/$REPO/releases"
  exit 1
fi

# Get latest release tag
echo "Fetching latest release..."
TAG="$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" | grep '"tag_name"' | sed 's/.*"tag_name": *"//;s/".*//')"

if [ -z "$TAG" ]; then
  echo "Failed to fetch latest release. Check https://github.com/$REPO/releases"
  exit 1
fi

DOWNLOAD_URL="https://github.com/$REPO/releases/download/$TAG/willhaben-$TARGET"

echo "Downloading willhaben $TAG for $TARGET..."
TMPFILE="$(mktemp)"
curl -fsSL "$DOWNLOAD_URL" -o "$TMPFILE"
chmod +x "$TMPFILE"

echo "Installing to $INSTALL_DIR/$BINARY_NAME (may require sudo)..."
if [ -w "$INSTALL_DIR" ]; then
  mv "$TMPFILE" "$INSTALL_DIR/$BINARY_NAME"
else
  sudo mv "$TMPFILE" "$INSTALL_DIR/$BINARY_NAME"
fi

echo "willhaben $TAG installed successfully! Run 'willhaben --help' to get started."

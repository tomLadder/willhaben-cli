# Installation

## Quick Install (macOS / Linux)

```bash
curl -fsSL https://raw.githubusercontent.com/tomLadder/willhaben-cli/main/install.sh | sh
```

This will automatically detect your OS and architecture, download the latest release binary, and install it to `/usr/local/bin`.

## GitHub Releases

Pre-built binaries for macOS, Linux, and Windows are available on the [Releases page](https://github.com/tomLadder/willhaben-cli/releases).

Download the binary for your platform, make it executable (`chmod +x`), and move it to a directory in your `PATH`.

## From Source

```bash
# Clone the repository
git clone https://github.com/tomLadder/willhaben-cli.git
cd willhaben-cli

# Install dependencies
bun install

# Build the standalone executable
bun run build

# Move to your PATH (optional)
mv willhaben /usr/local/bin/
```

## Development Mode

If you want to run without building:

```bash
bun run dev -- --help
bun run dev login
bun run dev list
```

## Verify Installation

```bash
willhaben --version
# Output: 1.0.0

willhaben --help
```

## Updating

```bash
cd willhaben-cli
git pull
bun install
bun run build
mv willhaben /usr/local/bin/
```

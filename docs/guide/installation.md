# Installation

## Prerequisites

- [Bun](https://bun.sh) v1.0 or higher

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

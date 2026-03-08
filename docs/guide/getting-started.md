# Getting Started

willhaben-cli is an unofficial command-line interface for managing your willhaben.at marketplace listings.

## Quick Start

### 1. Install

```bash
# Clone and build
git clone https://github.com/tomLadder/willhaben-cli.git
cd willhaben-cli
bun install
bun run build

# Move to PATH
mv willhaben /usr/local/bin/
```

### 2. Login

```bash
willhaben login
```

A browser window will open for authentication.

### 3. Explore

```bash
# View your profile
willhaben whoami

# List your active listings
willhaben list

# Get listing details
willhaben get 123456789

# Create a new listing
willhaben publish my-item.json
```

## What's Next?

- [Installation](/guide/installation) - Detailed installation instructions
- [Configuration](/guide/configuration) - Configure the CLI
- [Commands](/commands/) - Full command reference

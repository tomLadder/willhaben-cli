<h1 align="center">🛍️ willhaben-cli</h1>

<p align="center">
  <strong>The unofficial command-line interface for willhaben.at</strong>
</p>

<p align="center">
  Manage your marketplace listings directly from the terminal. Built with TypeScript, powered by Bun.
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#commands">Commands</a> •
  <a href="#configuration">Configuration</a> •
  <a href="#contributing">Contributing</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License">
  <img src="https://img.shields.io/badge/bun-%3E%3D1.0-black.svg" alt="Bun">
  <img src="https://img.shields.io/badge/TypeScript-5.4-blue.svg" alt="TypeScript">
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-lightgrey.svg" alt="Platform">
</p>

---

> [!CAUTION]
> **Legal Disclaimer / Rechtlicher Hinweis**
>
> This is an **unofficial** tool and is **not affiliated** with willhaben.at. Using this program may violate willhaben's terms of service. You are solely responsible for ensuring your use complies with applicable terms and laws. The developers accept no liability for any damages or legal consequences arising from its use. **Use at your own risk.**
>
> Dies ist ein **inoffizielles** Tool und steht in **keiner Verbindung** zu willhaben.at. Die Verwendung dieses Programms kann gegen die Nutzungsbedingungen von willhaben verstoßen. Sie sind selbst dafür verantwortlich, die Rechtmäßigkeit Ihrer Nutzung sicherzustellen. Die Entwickler übernehmen keine Haftung für Schäden oder rechtliche Konsequenzen. **Die Nutzung erfolgt auf eigenes Risiko.**

---

## Features

**Listing Management**
- Create listings from JSON templates
- Update prices, titles, and descriptions
- Reserve, unreserve, and mark items as sold
- Republish expired listings
- Bulk operations support

**Image Support**
- Upload single or multiple images
- View listing images
- Delete individual or all images
- Automatic image ordering

**Authentication**
- Secure OAuth 2.0 PKCE flow
- Automatic token refresh
- Persistent sessions

**Developer Experience**
- JSON output for scripting
- Caching for faster responses
- Beautiful terminal UI with spinners
- Cross-platform compatibility

---

## Installation

### Prerequisites

- [Bun](https://bun.sh) v1.0 or higher

### From Source

```bash
# Clone the repository
git clone https://github.com/willhaben/willhaben-cli.git
cd willhaben-cli

# Install dependencies
bun install

# Build the standalone executable
bun run build

# Move to your PATH (optional)
mv willhaben /usr/local/bin/
```

### Development Mode

```bash
# Run directly without building
bun run dev -- --help
```

---

## Quick Start

### 1. Login to your account

```bash
willhaben login
```

A browser window will open for authentication.

### 2. Check your identity

```bash
willhaben whoami
```

### 3. List your active listings

```bash
willhaben list
```

### 4. Create a new listing

Create a template file `my-item.json`:

```json
{
  "title": "iPhone 14 Pro - Excellent Condition",
  "description": "Selling my iPhone 14 Pro 256GB in excellent condition...",
  "price": 799,
  "postCode": "1010",
  "locationId": 900,
  "location": "Wien",
  "categoryPath": ["MOBILE_ELECTRONICS", "MOBILE_PHONES", "IPHONE"],
  "condition": "gebraucht",
  "delivery": ["PICKUP", "Versand"]
}
```

Then publish:

```bash
willhaben publish my-item.json
```

---

## Commands

### Authentication

| Command | Description |
|---------|-------------|
| `willhaben login` | Authenticate with willhaben |
| `willhaben logout` | Clear stored credentials |
| `willhaben whoami` | Display current user info |

### Listings

| Command | Description |
|---------|-------------|
| `willhaben list` | List all your listings |
| `willhaben get <id>` | Get details of a listing |
| `willhaben publish <file>` | Create a new listing from JSON |
| `willhaben update <id>` | Update listing properties |
| `willhaben delete <id>` | Delete a listing |
| `willhaben republish <id>` | Republish an expired listing |
| `willhaben deactivate <id>` | Take a listing offline |
| `willhaben reserve <id>` | Mark as reserved |
| `willhaben unreserve <id>` | Remove reservation |
| `willhaben sold <id>` | Mark as sold |

### Images

| Command | Description |
|---------|-------------|
| `willhaben images <id>` | List images for a listing |
| `willhaben upload-image <id> <file...>` | Upload one or more images |
| `willhaben delete-image <id> <imageId>` | Delete a specific image |
| `willhaben clear-images <id>` | Delete all images |

### Configuration

| Command | Description |
|---------|-------------|
| `willhaben config get` | Show all settings |
| `willhaben config set <key> <value>` | Set a configuration value |
| `willhaben config reset` | Reset to defaults |
| `willhaben config path` | Show config file location |

---

## Command Details

### List Listings

```bash
# Basic listing
willhaben list

# With pagination
willhaben list --page 2 --size 50

# Output as JSON (for scripting)
willhaben list --json
```

### Get Listing Details

```bash
# Fetch from API
willhaben get 123456789

# Use cached data if available
willhaben get 123456789 --cached

# Output as JSON
willhaben get 123456789 --json
```

### Update Listing

```bash
# Update price
willhaben update 123456789 --price 99.99

# Update title
willhaben update 123456789 --title "New Title"

# Update multiple fields
willhaben update 123456789 --title "New Title" --price 149
```

### Delete Listing

```bash
# With confirmation prompt
willhaben delete 123456789

# Skip confirmation
willhaben delete 123456789 --force
```

### Upload Images

```bash
# Upload single image
willhaben upload-image 123456789 photo.jpg

# Upload multiple images
willhaben upload-image 123456789 photo1.jpg photo2.jpg photo3.jpg
```

---

## Listing Template Format

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Listing title (max 100 chars) |
| `description` | string | Detailed description |
| `price` | number | Price in EUR |
| `postCode` | string | Postal code (e.g., "8010") |
| `locationId` | number | Willhaben location ID |
| `location` | string | District/city name |
| `categoryPath` | string[] | Category path from root to leaf |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `street` | string | Street address |
| `condition` | string | `"neu"`, `"gebraucht"`, or `"defekt"` |
| `delivery` | string[] | `["PICKUP"]`, `["Versand"]`, or both |
| `attributes` | object | Category-specific attributes |
| `contactInfo` | object | Contact information override |
| `skipValidation` | boolean | Skip attribute validation |

### Example Templates

<details>
<summary><strong>Electronics - Printer</strong></summary>

```json
{
  "title": "HP LaserJet Pro - wie neu",
  "description": "Verkaufe meinen HP LaserJet Pro Drucker...",
  "price": 120,
  "postCode": "8010",
  "locationId": 117458,
  "location": "Jakomini",
  "categoryPath": [
    "COMPUTER_SOFTWARE",
    "PRINTER_MONITORS_SPEAKER",
    "PRINTER",
    "LASER_PRINTER"
  ],
  "condition": "gebraucht",
  "delivery": ["PICKUP", "Versand"],
  "attributes": {
    "BRAND_PRINTER": "HP"
  }
}
```
</details>

<details>
<summary><strong>Hobby - Drone</strong></summary>

```json
{
  "title": "DJI Mini 3 Pro - Fly More Combo",
  "description": "DJI Mini 3 Pro mit allem Zubehör...",
  "price": 750,
  "postCode": "1010",
  "locationId": 900,
  "location": "Wien",
  "categoryPath": [
    "LEISURE_INSTRUMENTS_CULINARY",
    "MODEL_MAKING",
    "RC_MODEL_MAKING",
    "DRONES_MULTICOPTER",
    "OUTDOOR"
  ],
  "condition": "gebraucht",
  "delivery": ["PICKUP", "Versand"],
  "attributes": {
    "ENGINE_TYPE": "ELECTRIC_DRIVE"
  }
}
```
</details>

<details>
<summary><strong>Books</strong></summary>

```json
{
  "title": "Clean Code - Robert C. Martin",
  "description": "Buch in sehr gutem Zustand...",
  "price": 15,
  "postCode": "5020",
  "locationId": 30501,
  "location": "Salzburg",
  "categoryPath": [
    "BOOKSFILMANDMUSIC",
    "NON_FICTION_BOOKS"
  ],
  "condition": "gebraucht",
  "delivery": ["Versand"]
}
```
</details>

### Finding Category Codes

Category codes follow the willhaben category tree structure:

| Top-Level Code | Category |
|----------------|----------|
| `LIVING_HOUSEHOLD_GASTRONOMY` | Wohnen / Haushalt |
| `BOOKSFILMANDMUSIC` | Bücher / Filme / Musik |
| `COMPUTER_SOFTWARE` | Computer / Software |
| `MOBILE_ELECTRONICS` | Handy / Telefon |
| `LEISURE_INSTRUMENTS_CULINARY` | Freizeit / Instrumente |
| `SPORTS_LEISURE` | Sport / Freizeit |
| `FASHION_ACCESSORIES` | Mode / Accessoires |

Use `willhaben categories` to explore the full category tree.

---

## Configuration

Configuration is stored in `~/.willhaben/`:

| File | Description |
|------|-------------|
| `config.json` | Settings and authentication tokens |
| `listings.json` | Local listing cache |

### Available Settings

| Key | Values | Default | Description |
|-----|--------|---------|-------------|
| `outputFormat` | `text`, `json` | `text` | Default output format |

---

## Scripting & Automation

### JSON Output

All commands support `--json` for machine-readable output:

```bash
# Get listing IDs
willhaben list --json | jq '.[].id'

# Check if listing exists
willhaben get 123456789 --json 2>/dev/null && echo "exists"
```

### Batch Operations

```bash
# Reserve all listings
for id in $(willhaben list --json | jq -r '.[].id'); do
  willhaben reserve "$id"
done

# Bulk price update
willhaben list --json | jq -r '.[] | select(.price < 10) | .id' | \
  xargs -I {} willhaben update {} --price 10
```

---

## Architecture

```
src/
├── index.ts           # CLI entry point
├── api/
│   ├── client.ts      # HTTP client with auth
│   ├── listings.ts    # Listing operations
│   ├── categories.ts  # Category tree
│   └── auth.ts        # OAuth 2.0 PKCE flow
├── cli/
│   └── commands/      # Command implementations
├── store/
│   ├── config.ts      # Configuration management
│   └── listings.ts    # Listing cache
└── types/
    └── index.ts       # TypeScript interfaces
```

---

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting a PR.

### Development Setup

```bash
# Clone and install
git clone https://github.com/willhaben/willhaben-cli.git
cd willhaben-cli
bun install

# Run in development mode
bun run dev -- --help

# Type checking
bun run typecheck
```

### API Discovery

The API was reverse-engineered from the willhaben mobile app using [mitmproxy](https://mitmproxy.org/). If you find new endpoints or changes:

1. Capture traffic with mitmproxy
2. Document the endpoint in an issue
3. Submit a PR with the implementation

### Code Style

- Use TypeScript strict mode
- Follow existing patterns
- Keep functions small and focused
- Add types for all API responses

---

## Roadmap

- [ ] Categories browser command
- [ ] Bulk import from CSV
- [ ] Watch mode for listing changes
- [ ] Message inbox support
- [ ] Statistics and analytics
- [ ] Multiple account support

---

## FAQ

<details>
<summary><strong>How do I find my locationId?</strong></summary>

Location IDs can be found in the category tree response or by inspecting the willhaben app traffic. Common IDs:
- Vienna (Wien): 900
- Graz: 117458
- Salzburg: 30501
- Linz: 40101
</details>

<details>
<summary><strong>Why do I get "validation error" when publishing?</strong></summary>

Some categories require specific attributes. Check the category's `attributeReferences` in the category tree, or use `"skipValidation": true` in your template to bypass validation (not recommended).
</details>

<details>
<summary><strong>Can I use this for commercial purposes?</strong></summary>

This tool is provided for personal use. Commercial use may have additional legal implications regarding willhaben's terms of service. Consult legal advice if needed.
</details>

---

## Acknowledgments

- Built with [Bun](https://bun.sh) - The fast JavaScript runtime
- CLI powered by [Commander.js](https://github.com/tj/commander.js)
- Beautiful output with [Chalk](https://github.com/chalk/chalk) and [Ora](https://github.com/sindresorhus/ora)

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  <sub>Made with ❤️ in Austria</sub>
</p>

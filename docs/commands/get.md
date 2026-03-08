# get

Get detailed information about a specific listing.

## Usage

```bash
willhaben get <id> [options]
```

## Arguments

| Argument | Description |
|----------|-------------|
| `<id>` | Listing ID |

## Options

| Option | Description |
|--------|-------------|
| `--cached` | Use cached data if available |
| `--json` | Output as JSON |

## Example

```bash
willhaben get 123456789

# Listing Details
# ────────────────────────────────────────
# ID: 123456789
# Title: iPhone 14 Pro - Excellent Condition
# Price: €799
# Status: Active
# Views: 42
# Created: 2026-01-15
#
# Description:
# Selling my iPhone 14 Pro 256GB in excellent condition...
#
# Location: 1010 Wien
# Category: Handy / Telefon > iPhone
```

## Using Cache

```bash
# Fetch fresh data
willhaben get 123456789

# Use cached data (faster)
willhaben get 123456789 --cached
```

## JSON Output

```bash
willhaben get 123456789 --json
```

```json
{
  "id": 123456789,
  "title": "iPhone 14 Pro - Excellent Condition",
  "description": "Selling my iPhone 14 Pro 256GB...",
  "price": 799,
  "status": "active",
  "views": 42,
  "location": {
    "postCode": "1010",
    "city": "Wien"
  },
  "category": ["MOBILE_ELECTRONICS", "MOBILE_PHONES", "IPHONE"],
  "images": [
    { "id": "img1", "url": "https://..." }
  ]
}
```

## Requires Authentication

You must be logged in to use this command.

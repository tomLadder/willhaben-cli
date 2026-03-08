# publish

Create a new listing from a JSON template file.

## Usage

```bash
willhaben publish <file> [options]
```

## Arguments

| Argument | Description |
|----------|-------------|
| `<file>` | Path to JSON template file |

## Options

| Option | Description |
|--------|-------------|
| `--json` | Output as JSON |

## Template Format

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Listing title (max 100 chars) |
| `description` | string | Detailed description |
| `price` | number | Price in EUR |
| `postCode` | string | Postal code (e.g., "1010") |
| `locationId` | number | Willhaben location ID |
| `location` | string | District/city name |
| `categoryPath` | string[] | Category path from root to leaf |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `condition` | string | `"neu"`, `"gebraucht"`, or `"defekt"` |
| `delivery` | string[] | `["PICKUP"]`, `["Versand"]`, or both |
| `attributes` | object | Category-specific attributes |

## Example Template

Create `my-item.json`:

```json
{
  "title": "iPhone 14 Pro - Excellent Condition",
  "description": "Selling my iPhone 14 Pro 256GB in excellent condition. Always used with a case and screen protector.",
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
# Listing created successfully!
# ID: 123456789
# URL: https://willhaben.at/iad/object?adId=123456789
```

## Category Examples

<details>
<summary><strong>Electronics - Printer</strong></summary>

```json
{
  "title": "HP LaserJet Pro - wie neu",
  "description": "Verkaufe meinen HP LaserJet Pro Drucker...",
  "price": 120,
  "postCode": "8010",
  "locationId": 117458,
  "location": "Graz",
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

## Common Location IDs

| City | Location ID |
|------|-------------|
| Wien | 900 |
| Graz | 117458 |
| Salzburg | 30501 |
| Linz | 40101 |
| Innsbruck | 70101 |

## Requires Authentication

You must be logged in to use this command.

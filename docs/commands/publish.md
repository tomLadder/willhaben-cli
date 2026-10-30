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
| `--draft` | Save as a draft without putting it live. Publish it later with `willhaben activate <id>` |
| `--json` | Output as JSON |

## How publishing works

1. The listing is saved as a draft.
2. The images from `images` are uploaded.
3. The draft is put live, unless `--draft` is set.

If an image upload fails, the listing stays a draft and never goes live without its photos. The error message contains the draft ID.

## Template Format

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Listing title (max 100 chars) |
| `description` | string | Detailed description |
| `price` | number | Price in EUR |
| `postCode` | string | Postal code (e.g., "1010") |
| `categoryPath` | string[] | Category path from root to leaf |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `location` | string | Location name from [`locations`](/commands/locations). Needed if the postcode has several locations |
| `locationId` | number | Location id. Looked up from `postCode` and `location` if omitted |
| `condition` | string | `"neu"`, `"gebraucht"`, or `"defekt"` |
| `delivery` | string[] | `["PICKUP"]`, `["Versand"]`, or both |
| `images` | string[] | Image files (jpg, png, gif, webp), relative to the template file. The first one is the cover image |
| `attributes` | object | Category-specific attributes |

## Example Template

Create `my-item.json`:

```json
{
  "title": "iPhone 14 Pro - Excellent Condition",
  "description": "Selling my iPhone 14 Pro 256GB in excellent condition. Always used with a case and screen protector.",
  "price": 799,
  "postCode": "1010",
  "categoryPath": ["MOBILE_ELECTRONICS", "MOBILE_PHONES", "IPHONE"],
  "condition": "gebraucht",
  "delivery": ["PICKUP", "Versand"],
  "images": ["front.jpg", "back.jpg"]
}
```

Then publish:

```bash
willhaben publish my-item.json
# ✔ Listing published successfully!
#   ID: 123456789
#   Title: iPhone 14 Pro - Excellent Condition
#   Price: € 799
#   Images: 2
```

Or save it as a draft first, check it in the willhaben app, and put it live afterwards:

```bash
willhaben publish my-item.json --draft
willhaben activate 123456789
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

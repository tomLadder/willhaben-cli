# willhaben-cli LLM Guide

This guide helps AI assistants understand how to use the willhaben-cli for managing willhaben.at marketplace listings.

## Overview

willhaben-cli is a command-line tool for creating and managing listings on willhaben.at (Austrian marketplace). It uses the mobile app API.

## Prerequisites

1. User must have a willhaben.at account
2. User must be logged in: `willhaben login`

## Installation

```bash
curl -fsSL https://raw.githubusercontent.com/tomLadder/willhaben-cli/main/install.sh | sh
```

Pre-built binaries are also available on the [Releases page](https://github.com/tomLadder/willhaben-cli/releases).

## Authentication

```bash
# Login (opens browser for OAuth)
willhaben login

# Check login status
willhaben whoami

# Logout
willhaben logout
```

## Creating a Listing (Step-by-Step)

### Step 1: Find the Right Category

Categories are hierarchical. Use these commands to explore:

```bash
# List top-level categories
willhaben categories list

# Browse subcategories (provide path as separate arguments)
willhaben categories list BOOKSFILMANDMUSIC
willhaben categories list BOOKSFILMANDMUSIC NON_FICTION_BOOKS

# Search categories by keyword
willhaben categories search "smartphone"
willhaben categories search "fahrrad"

# Get category details and required attributes
willhaben categories info BOOKSFILMANDMUSIC NON_FICTION_BOOKS
```

Common category paths:
- Electronics: `ELECTRONICSENTERTAINMENT`
- Clothing: `CLOTHINGANDACCESSORIES`
- Books: `BOOKSFILMANDMUSIC`
- Sports: `SPORTSEQUIPMENT`
- Home: `HOUSEANDGARDEN`

### Step 2: Create a Listing Template (JSON file)

Create a JSON file with the listing details:

```json
{
  "title": "Item title (max 50 chars recommended)",
  "description": "Detailed description of the item...",
  "price": 25,
  "categoryPath": ["BOOKSFILMANDMUSIC", "NON_FICTION_BOOKS"],
  "postCode": "8010",
  "locationId": 117458,
  "location": "Jakomini",
  "condition": "gebraucht",
  "delivery": ["PICKUP", "Versand"]
}
```

#### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Listing title |
| `description` | string | Full description |
| `price` | number | Price in EUR (use 0 for "Zu verschenken") |
| `categoryPath` | string[] | Category path codes from `categories list` |
| `postCode` | string | Austrian postal code (e.g., "8010") |
| `locationId` | number | District ID (see Location IDs below) |
| `location` | string | District name |

#### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `condition` | string | `"neu"`, `"gebraucht"`, or `"defekt"` |
| `delivery` | string[] | `["PICKUP"]`, `["Versand"]`, or both |
| `street` | string | Street address |
| `attributes` | object | Category-specific attributes |
| `contactInfo.name` | string | Contact name override |
| `skipValidation` | boolean | Skip client-side validation |

#### Common Location IDs (Graz)

| District | locationId | postCode |
|----------|------------|----------|
| Innere Stadt | 117451 | 8010 |
| St. Leonhard | 117452 | 8010 |
| Geidorf | 117453 | 8010 |
| Lend | 117454 | 8020 |
| Gries | 117455 | 8020 |
| Jakomini | 117458 | 8010 |
| Liebenau | 117459 | 8041 |
| St. Peter | 117460 | 8042 |
| Waltendorf | 117461 | 8010 |
| Ries | 117462 | 8010 |
| Mariatrost | 117463 | 8043 |
| Andritz | 117464 | 8045 |
| Gösting | 117465 | 8051 |
| Eggenberg | 117466 | 8020 |
| Wetzelsdorf | 117467 | 8052 |
| Straßgang | 117468 | 8053 |
| Puntigam | 117469 | 8055 |

For other cities, use the postCode and a general locationId for the area.

### Step 3: Publish the Listing

```bash
# Publish from template file
willhaben publish listing.json

# Output as JSON (for programmatic use)
willhaben publish listing.json --json
```

### Step 4: Upload Images

```bash
# Upload single image
willhaben upload-image <listing-id> photo.jpg

# Upload multiple images
willhaben upload-image <listing-id> photo1.jpg photo2.jpg photo3.jpg

# List images
willhaben images <listing-id>

# Delete specific image
willhaben delete-image <listing-id> <image-id>

# Delete all images
willhaben clear-images <listing-id>
```

## Managing Listings

```bash
# List all your listings
willhaben list
willhaben list --json

# Get specific listing details
willhaben get <listing-id>
willhaben get <listing-id> --json

# Update listing
willhaben update <listing-id> --title "New Title"
willhaben update <listing-id> --price 30
willhaben update <listing-id> --description "Updated description"

# Delete listing
willhaben delete <listing-id>
willhaben delete <listing-id> --force  # Skip confirmation

# Deactivate (take offline temporarily)
willhaben deactivate <listing-id>

# Republish expired listing
willhaben republish <listing-id>

# Mark as reserved
willhaben reserve <listing-id>
willhaben unreserve <listing-id>

# Mark as sold
willhaben sold <listing-id>
```

## Example: Complete Listing Creation Flow

```bash
# 1. Login (if not already)
willhaben whoami || willhaben login

# 2. Find category
willhaben categories search "buch"
# Output shows: BOOKSFILMANDMUSIC > NON_FICTION_BOOKS

# 3. Check category attributes
willhaben categories info BOOKSFILMANDMUSIC NON_FICTION_BOOKS

# 4. Create template file (listing.json)
cat > listing.json << 'EOF'
{
  "title": "Kochbuch Italienische Küche",
  "description": "Tolles Kochbuch mit 200 Rezepten. Sehr guter Zustand, keine Gebrauchsspuren.",
  "price": 15,
  "categoryPath": ["BOOKSFILMANDMUSIC", "NON_FICTION_BOOKS"],
  "postCode": "8010",
  "locationId": 117458,
  "location": "Jakomini",
  "condition": "gebraucht",
  "delivery": ["PICKUP", "Versand"]
}
EOF

# 5. Publish
willhaben publish listing.json

# 6. Upload images (use listing ID from publish output)
willhaben upload-image <listing-id> buch_cover.jpg buch_rueckseite.jpg
```

## JSON Output Mode

All commands support `--json` flag for machine-readable output:

```bash
willhaben list --json
willhaben get <id> --json
willhaben publish listing.json --json
willhaben categories list --json
willhaben categories search "phone" --json
```

## Error Handling

Common errors and solutions:

| Error | Solution |
|-------|----------|
| "You must be logged in" | Run `willhaben login` |
| "Category path not found" | Use `willhaben categories search` to find correct path |
| "Template missing required fields" | Check required fields in template |
| "Failed to publish" | Check category-specific required attributes |

## Tips for LLMs

1. **Always use `--json`** for programmatic parsing
2. **Search categories first** before creating listings - category codes are not guessable
3. **Check `categories info`** to see required attributes for specific categories
4. **Location IDs are required** - use the table above or ask the user for their district
5. **Images are uploaded separately** after the listing is created
6. **Price 0** means "Zu verschenken" (free/giveaway)

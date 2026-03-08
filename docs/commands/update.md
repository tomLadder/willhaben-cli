# update

Update properties of an existing listing.

## Usage

```bash
willhaben update <id> [options]
```

## Arguments

| Argument | Description |
|----------|-------------|
| `<id>` | Listing ID |

## Options

| Option | Description |
|--------|-------------|
| `--price <amount>` | New price in EUR |
| `--title <text>` | New title |
| `--description <text>` | New description |
| `--json` | Output as JSON |

## Examples

### Update Price

```bash
willhaben update 123456789 --price 99.99
# Listing updated successfully
```

### Update Title

```bash
willhaben update 123456789 --title "iPhone 14 Pro - PRICE DROP!"
# Listing updated successfully
```

### Update Multiple Fields

```bash
willhaben update 123456789 --title "New Title" --price 149
# Listing updated successfully
```

## JSON Output

```bash
willhaben update 123456789 --price 99 --json
```

```json
{
  "success": true,
  "id": 123456789,
  "updated": {
    "price": 99
  }
}
```

## Requires Authentication

You must be logged in to use this command.

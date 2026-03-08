# list

List all your active listings.

## Usage

```bash
willhaben list [options]
```

## Options

| Option | Description |
|--------|-------------|
| `--page <n>` | Page number (default: 1) |
| `--size <n>` | Items per page (default: 25) |
| `--json` | Output as JSON |

## Example

```bash
willhaben list

# Your Listings (25 total)
# ──────────────────────────────────────────────────────────────────────
# ID          Title                              Price      Status
# ──────────────────────────────────────────────────────────────────────
# 123456789   iPhone 14 Pro - Excellent          €799       Active
# 123456790   MacBook Air M2                     €1.199     Reserved
# 123456791   Sony WH-1000XM4                    €199       Active
```

## Pagination

```bash
# Get second page with 50 items
willhaben list --page 2 --size 50
```

## JSON Output

```bash
willhaben list --json
```

```json
[
  {
    "id": 123456789,
    "title": "iPhone 14 Pro - Excellent",
    "price": 799,
    "status": "active",
    "views": 42,
    "createdAt": "2026-01-15T10:30:00Z"
  }
]
```

## Requires Authentication

You must be logged in to use this command.

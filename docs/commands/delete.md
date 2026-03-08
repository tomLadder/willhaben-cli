# delete

Delete a listing permanently.

## Usage

```bash
willhaben delete <id> [options]
```

## Arguments

| Argument | Description |
|----------|-------------|
| `<id>` | Listing ID |

## Options

| Option | Description |
|--------|-------------|
| `--force` | Skip confirmation prompt |
| `--json` | Output as JSON |

## Example

### With Confirmation

```bash
willhaben delete 123456789
# Are you sure you want to delete listing 123456789? (y/N) y
# Listing deleted successfully
```

### Skip Confirmation

```bash
willhaben delete 123456789 --force
# Listing deleted successfully
```

## JSON Output

```bash
willhaben delete 123456789 --force --json
```

```json
{
  "success": true,
  "id": 123456789,
  "message": "Listing deleted successfully"
}
```

::: danger
This action is permanent and cannot be undone. The listing and all its images will be removed.
:::

## Requires Authentication

You must be logged in to use this command.

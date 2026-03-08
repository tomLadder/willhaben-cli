# whoami

Show current user information.

## Usage

```bash
willhaben whoami [options]
```

## Options

| Option | Description |
|--------|-------------|
| `--json` | Output as JSON |

## Example

```bash
willhaben whoami

# User Information
# ────────────────────────────────────────
# Username: maxmustermann
# Email: max@example.com
# User ID: 12345678
```

## JSON Output

```bash
willhaben whoami --json
```

```json
{
  "username": "maxmustermann",
  "email": "max@example.com",
  "userId": 12345678
}
```

## Requires Authentication

You must be logged in to use this command:

```bash
willhaben whoami
# Not logged in. Run: willhaben login
```

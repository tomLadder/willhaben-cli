# Configuration

Configuration is stored in `~/.willhaben/`.

## Files

| File | Description |
|------|-------------|
| `config.json` | Settings and authentication tokens |
| `listings.json` | Local listing cache |

## Settings

| Key | Values | Default | Description |
|-----|--------|---------|-------------|
| `outputFormat` | `text`, `json` | `text` | Default output format |

## Commands

### View Configuration

```bash
willhaben config get
```

### Set a Value

```bash
# Set default output to JSON
willhaben config set outputFormat json

# Set default output to text
willhaben config set outputFormat text
```

### Reset to Defaults

```bash
willhaben config reset
```

### Show Config File Path

```bash
willhaben config path
# Output: /Users/username/.willhaben/config.json
```

::: warning
The config file contains your authentication tokens. It's created with secure permissions and should not be shared.
:::

# config

Manage CLI configuration settings.

## Subcommands

| Command | Description |
|---------|-------------|
| `get` | Show current configuration |
| `set` | Set a configuration value |
| `reset` | Reset to defaults |
| `path` | Show config file path |

---

## get

Show current configuration.

### Usage

```bash
willhaben config get [options]
```

### Options

| Option | Description |
|--------|-------------|
| `--json` | Output as JSON |

### Example

```bash
willhaben config get

# Configuration
# ────────────────────────────────────────
# Output format: text
# Logged in: Yes
#
# Config file: /Users/you/.willhaben/config.json
```

---

## set

Set a configuration value.

### Usage

```bash
willhaben config set <key> <value>
```

### Available Keys

| Key | Values | Description |
|-----|--------|-------------|
| `outputFormat` | `text`, `json` | Default output format |

### Examples

```bash
# Set default output to JSON
willhaben config set outputFormat json

# Set default output to text
willhaben config set outputFormat text
```

---

## reset

Reset configuration to defaults.

### Usage

```bash
willhaben config reset
```

### Example

```bash
willhaben config reset
# Configuration reset to defaults
```

::: warning
This removes your authentication tokens. You'll need to login again.
:::

---

## path

Show configuration file path.

### Usage

```bash
willhaben config path
```

### Example

```bash
willhaben config path
# /Users/you/.willhaben/config.json
```

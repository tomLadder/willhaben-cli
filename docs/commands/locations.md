# locations

Look up the locations for an Austrian postcode. No login required.

[`publish`](/commands/publish) does this automatically: it resolves `locationId` from `postCode`, and uses `location` to pick one when a postcode has several locations.

## Usage

```bash
willhaben locations <postcode> [options]
```

## Options

| Option | Description |
|--------|-------------|
| `--json` | Output as JSON |

## Example

```bash
willhaben locations 8010

# Locations for postcode 8010:
#
#   117464   Andritz
#   114906   Edelsbach bei Graz
#   117455   Geidorf
#   118001   Graz
#   ...
```

Use the name in your template:

```json
{
  "postCode": "8010",
  "location": "Geidorf"
}
```

Postcodes with a single location (e.g. `1010`) only need `postCode`.

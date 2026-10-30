# search

Search marketplace listings. No login required.

## Usage

```bash
willhaben search [keyword...] [options]
```

## Options

| Option | Description |
|--------|-------------|
| `-c, --category <id>` | Search category id (from `--facets`) |
| `--min <price>` | Minimum price |
| `--max <price>` | Maximum price |
| `--state <state>` | `burgenland`, `kaernten`, `niederoesterreich`, `oberoesterreich`, `salzburg`, `steiermark`, `tirol`, `vorarlberg`, `wien` |
| `--private` | Only private sellers |
| `--dealer` | Only dealers |
| `--paylivery` | Only listings with PayLivery (buyer protection and shipping) |
| `--days <n>` | Only listings published in the last n days |
| `--sort <order>` | `newest`, `nearest`, `price-asc`, `price-desc`, `relevance` |
| `-p, --page <number>` | Page number (default: 1) |
| `-n, --rows <number>` | Results per page (default: 30) |
| `-f, --filter <param=value>` | Raw search filter, repeatable (see `--facets`) |
| `--facets` | Show available filters with their hit counts |
| `--json` | Output as JSON |

## Examples

```bash
willhaben search nintendo switch --max 150 --state steiermark --private --sort price-desc

# 1774 listings found (page 1 of 60):
#
# € 150      Nintendo Switch Konsole
#            123456789 · 8010 Graz · 10/25/2026
#            https://www.willhaben.at/iad/kaufen-und-verkaufen/d/nintendo-switch-konsole-123456789/
```

## Filters

`--facets` lists every filter the search offers for the current query, with hit counts and the parameter to use:

```bash
willhaben search fahrrad --facets

# Kategorie (category)
#   Sport / Sportgeräte (77090)  --filter ATTRIBUTE_TREE=4390
#   ...
# Zustand (Zustand)
#   Neu (13144)  --filter treeAttributes=22
```

Pass them back with `--filter` (repeatable). Combine with `--facets` to drill down into subcategories:

```bash
willhaben search fahrrad --category 4390 --facets
willhaben search fahrrad --filter ATTRIBUTE_TREE=4525 --filter treeAttributes=22
```

::: tip
Search category ids are not the `categoryPath` codes used for [`publish`](/commands/publish). Use [`categories`](/commands/) to find those.
:::

## JSON Output

```bash
willhaben search fahrrad --rows 1 --json
```

```json
{
  "total": 93220,
  "page": 1,
  "rows": 1,
  "ads": [
    {
      "id": "123456789",
      "title": "Kinderfahrrad 20 Zoll",
      "price": 120,
      "priceDisplay": "€ 120",
      "location": "Jakomini",
      "postCode": "8010",
      "state": "Steiermark",
      "isPrivate": true,
      "paylivery": false,
      "publishedAt": "2026-10-30T11:00:00Z",
      "description": "Gut erhaltenes Kinderfahrrad ...",
      "imageUrl": "https://cache.willhaben.at/mmo/...",
      "url": "https://www.willhaben.at/iad/kaufen-und-verkaufen/d/..."
    }
  ]
}
```

With `--facets --json` the output also contains a `facets` array.

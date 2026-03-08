# images

Manage images for your listings.

## Commands

| Command | Description |
|---------|-------------|
| `images <id>` | List images for a listing |
| `upload-image <id> <file...>` | Upload one or more images |
| `delete-image <id> <imageId>` | Delete a specific image |
| `clear-images <id>` | Delete all images |

---

## List Images

Show all images for a listing.

### Usage

```bash
willhaben images <id> [options]
```

### Options

| Option | Description |
|--------|-------------|
| `--json` | Output as JSON |

### Example

```bash
willhaben images 123456789

# Images for listing 123456789
# ────────────────────────────────────────
# 1. img_abc123 (primary)
# 2. img_def456
# 3. img_ghi789
```

---

## Upload Images

Upload one or more images to a listing.

### Usage

```bash
willhaben upload-image <id> <file...>
```

### Examples

```bash
# Upload single image
willhaben upload-image 123456789 photo.jpg
# Image uploaded successfully

# Upload multiple images
willhaben upload-image 123456789 photo1.jpg photo2.jpg photo3.jpg
# 3 images uploaded successfully
```

### Supported Formats

- JPEG (.jpg, .jpeg)
- PNG (.png)
- WebP (.webp)

::: tip
The first uploaded image becomes the primary/cover image for your listing.
:::

---

## Delete Image

Delete a specific image from a listing.

### Usage

```bash
willhaben delete-image <id> <imageId>
```

### Example

```bash
# First, list images to get the image ID
willhaben images 123456789

# Then delete the specific image
willhaben delete-image 123456789 img_def456
# Image deleted successfully
```

---

## Clear All Images

Delete all images from a listing.

### Usage

```bash
willhaben clear-images <id> [options]
```

### Options

| Option | Description |
|--------|-------------|
| `--force` | Skip confirmation prompt |

### Example

```bash
willhaben clear-images 123456789
# Are you sure you want to delete all images? (y/N) y
# All images deleted successfully
```

::: warning
This removes all images from the listing. You'll need to upload new images.
:::

## Requires Authentication

All image commands require authentication.

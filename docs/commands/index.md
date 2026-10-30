# Commands

Quick reference for all willhaben-cli commands.

## Authentication

| Command | Description |
|---------|-------------|
| [`login`](/commands/login) | Authenticate with willhaben |
| [`logout`](/commands/logout) | Clear stored credentials |
| [`whoami`](/commands/whoami) | Show current user info |

## Listings

| Command | Description |
|---------|-------------|
| [`list`](/commands/list) | List all your listings |
| [`get`](/commands/get) | Get listing details (yours or any public one) |
| [`publish`](/commands/publish) | Create a new listing |
| [`update`](/commands/update) | Update listing properties |
| [`delete`](/commands/delete) | Delete a listing |

## Search

| Command | Description |
|---------|-------------|
| [`search`](/commands/search) | Search marketplace listings (no login required) |
| [`locations`](/commands/locations) | Look up location ids for a postcode |

## Listing Actions

| Command | Description |
|---------|-------------|
| `activate <id>` | Put a draft live |
| `republish <id>` | Republish an expired listing |
| `deactivate <id>` | Take a listing offline |
| `reserve <id>` | Mark as reserved |
| `unreserve <id>` | Remove reservation |
| `sold <id>` | Mark as sold |

## Images

| Command | Description |
|---------|-------------|
| [`images`](/commands/images) | Manage listing images |

## Configuration

| Command | Description |
|---------|-------------|
| [`config get`](/commands/config#get) | Show current configuration |
| [`config set`](/commands/config#set) | Set a configuration value |
| [`config reset`](/commands/config#reset) | Reset to defaults |
| [`config path`](/commands/config#path) | Show config file path |

## Global Options

All commands support:

| Option | Description |
|--------|-------------|
| `--json` | Output as JSON (for scripting) |
| `--help` | Show command help |
| `--version` | Show version |

# login

Authenticate with willhaben using OAuth 2.0 PKCE flow.

## Usage

```bash
willhaben login
```

## How It Works

1. A browser window opens to the willhaben login page
2. You authenticate with your willhaben credentials
3. The CLI receives the authorization code
4. Tokens are exchanged and stored securely

## Example

```bash
willhaben login
# Opening browser for authentication...
# Waiting for authorization...
# Login successful!
# Welcome, username
```

## Token Storage

Tokens are stored in `~/.willhaben/config.json`:
- **Access Token**: Used for API requests, expires in ~1 hour
- **Refresh Token**: Used to obtain new access tokens automatically

::: info
The CLI automatically refreshes tokens when they expire. You only need to login again if the refresh token expires or is revoked.
:::

## Errors

| Error | Solution |
|-------|----------|
| Browser didn't open | Open the URL manually from the terminal output |
| Authorization timeout | Try again, ensure you complete login within 2 minutes |
| Invalid credentials | Check your willhaben username and password |

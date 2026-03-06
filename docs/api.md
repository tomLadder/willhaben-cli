# Willhaben API Documentation

Discovered via mitmproxy traffic capture from the iOS app.

## Base URLs

- **SSO**: `https://sso.willhaben.at`
- **Public API**: `https://publicapi.willhaben.at`
- **REST API**: `https://api.willhaben.at/restapi/v2`

## Common Headers

```
Authorization: Bearer <access_token>
x-wh-client: api@tailored-apps.com;willhabenapp;ios;8.33.0;responsive_app
x-wh-date: 2026-03-06T12:50:35+0100
x-wh-visitor-id: <UUID>
x-wh-security-version: 20130527022532
x-wh-application-token: <encrypted_token>
x-wh-request-signature: <signature>
applicationprovider: api@tailored-apps.com
User-Agent: willhaben/6201787 CFNetwork/3860.400.51 Darwin/25.3.0
Accept: application/json
```

**Note**: `x-wh-application-token` and `x-wh-request-signature` appear to be request signing - need to investigate how they're generated.

## Authentication

### OAuth 2.0 PKCE Flow (Keycloak)

The app uses OAuth 2.0 with PKCE for authentication via Keycloak.

#### 1. Authorization Request

```
GET https://sso.willhaben.at/auth/realms/willhaben/protocol/openid-connect/auth
```

Query parameters:
- `wh-theme`: dark
- `code_challenge`: BASE64URL(SHA256(code_verifier))
- `code_challenge_method`: S256
- `response_type`: code
- `client_id`: apps
- `scope`: openid wh-login-token
- `redirect_uri`: willhaben-app://willhaben.at/token

#### 2. Token Exchange

```
POST https://sso.willhaben.at/auth/realms/willhaben/protocol/openid-connect/token
Content-Type: application/x-www-form-urlencoded
```

Body:
- `client_id`: apps
- `redirect_uri`: willhaben-app://willhaben.at/token
- `code`: <authorization_code>
- `scope`: openid wh-login-token
- `grant_type`: authorization_code
- `code_verifier`: <original_verifier>

Response:
```json
{
  "access_token": "eyJ...",
  "expires_in": 300,
  "refresh_expires_in": 15552000,
  "refresh_token": "eyJ...",
  "token_type": "Bearer",
  "id_token": "eyJ...",
  "session_state": "...",
  "scope": "openid wh-userdata profile email wh-login-token"
}
```

**Note**: Access token expires in 5 minutes (300s), refresh token in 180 days.

#### 3. Token Refresh

```
POST https://sso.willhaben.at/auth/realms/willhaben/protocol/openid-connect/token
Content-Type: application/x-www-form-urlencoded
```

Body:
- `client_id`: apps
- `grant_type`: refresh_token
- `refresh_token`: <refresh_token>

#### JWT Claims (Access Token)

The access token is a JWT containing user info:

```json
{
  "wh:userId": 26244973,
  "wh:userUUID": "f1e6d336-260f-4d7f-9f16-c82a3667e9e5",
  "wh:username": "u:email@example.com",
  "email": "email@example.com",
  "given_name": "Name",
  "whu:gender": "MALE",
  "wh:createdAt": 1470221220000,
  "iad:loginId": 26244973
}
```

---

## Listings API

### List My Ads

```
GET https://publicapi.willhaben.at/myatz/v1/atverz/showpagedadsfromuser
```

Query parameters:
- `page`: Page number (default: 1)
- `rows`: Items per page (default: 50)
- `sort`: CHANGED_DATE, CREATED_DATE, END_DATE, HEADING
- `sortOrder`: ASC, DESC
- `statusFilters`: ALL, ACTIVE, DRAFT, RESERVED, EXPIRED, INACTIVE, REJECTED, AWAITING_CONTROL, SOLD
- `keyword`: Search term

Response structure:
```json
{
  "verticalList": [
    {
      "verticalId": 5,
      "verticalName": "Marktplatz",
      "advertDetails": [
        {
          "id": "1188748044",
          "uuid": "50d08418-1dd7-440f-be69-b34e9d305250",
          "description": "Title of the ad",
          "adTypeId": 67,
          "productId": 67,
          "startDate": "2026-03-04T22:19:00+01:00",
          "endDate": "2026-04-18T22:19:00+02:00",
          "advertStatus": {
            "description": "Aktiv",
            "id": "active",
            "statusId": 50
          },
          "advertImageList": {
            "advertImage": [
              {
                "mainImageUrl": "https://cache.willhaben.at/mmo/...",
                "thumbnailImageUrl": "https://cache.willhaben.at/mmo/..._thumb.jpg"
              }
            ]
          },
          "attributes": {
            "attribute": [
              { "name": "PRICE", "values": ["2"] },
              { "name": "PRICE_FOR_DISPLAY", "values": ["€ 2"] },
              { "name": "PAGEVIEWS", "values": ["3"] }
            ]
          },
          "categoryXmlCode": "AIR_CONDITIONING",
          "isP2PDeliveryActivated": true
        }
      ]
    }
  ],
  "totalNumberOfAdvertDetails": 157
}
```

### Status IDs
- `50`: Active (Aktiv)
- `60`: Expired/Passive (Abgelaufen)
- `120`: Sold (Verkauft)

### Get Ad Details

```
GET https://publicapi.willhaben.at/atdetail/v1/{adId}
```

### Edit Ad (Get form data)

```
GET https://api.willhaben.at/restapi/v2/bap/{adId}
```

For commercial/business ads:
```
GET https://api.willhaben.at/restapi/v2/bapcom/{adId}
```

### Deactivate Ad

```
POST https://publicapi.willhaben.at/myatz/v1/bap/deactivate/{adId}
```

For commercial ads:
```
POST https://publicapi.willhaben.at/myatz/v1/bapcom/deactivate/{adId}
```

### Mark as Reserved

```
POST https://publicapi.willhaben.at/myatz/v1/bap/updatesalesinfo/{adId}/5
```

### Mark as Sold

```
POST https://publicapi.willhaben.at/myatz/v1/bap/sold/{adId}
```

### Delete Ad

```
DELETE https://publicapi.willhaben.at/myatz/v1/bap/{adId}
```

### Republish (Copy) Ad

```
GET https://api.willhaben.at/restapi/v2/bap/copy/{adId}
```

### Bulk Operations

**Bulk Delete:**
```
POST https://publicapi.willhaben.at/myatz/v1/bulkchange
```

**Bulk Activate:**
```
POST https://publicapi.willhaben.at/myatz/v1/bulkchange/activate
```

**Bulk Deactivate:**
```
POST https://publicapi.willhaben.at/myatz/v1/bulkchange/deactivate
```

---

## Category Tree

### Basic Category Tree

```
GET https://api.willhaben.at/restapi/v2/categorytree/{adTypeId}?adStatus={statusId}
```

### Category Tree with Attributes

Returns the full category hierarchy including all attributes (required fields, options, etc.) for each category.

```
GET https://api.willhaben.at/restapi/v2/categorytree/withattributes/{adTypeId}
```

Example: `https://api.willhaben.at/restapi/v2/categorytree/withattributes/67`

Response structure:
```json
{
  "adTypeId": 67,
  "root": {
    "code": "ROOT",
    "label": "Marktplatz",
    "children": [
      {
        "code": "BOOKSFILMANDMUSIC",
        "label": "Bücher, Filme & Musik",
        "children": [
          {
            "code": "NON_FICTION_BOOKS",
            "label": "Sachbücher",
            "attributes": [
              {
                "code": "Zustand",
                "label": "Zustand",
                "required": true,
                "multiSelect": false,
                "type": "SELECT",
                "values": [
                  { "code": "neu", "label": "Neu" },
                  { "code": "gebraucht", "label": "Gebraucht" },
                  { "code": "defekt", "label": "Defekt" }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
}
```

---

## Images

Image URLs follow this pattern:
- Main: `https://cache.willhaben.at/mmo/{path}_hoved.jpg`
- Thumbnail: `https://cache.willhaben.at/mmo/{path}_thumb.jpg`
- Reference: `https://cache.willhaben.at/mmo/{path}.jpg`

Image management:
```
https://api.willhaben.at/restapi/v2/atimage/{adId}/{imageId}
```

---

## Verticals (Categories)

| ID | Name |
|----|------|
| 0 | Frontpage |
| 1 | Jobs |
| 2 | Immobilien |
| 3 | Auto & Motor |
| 5 | Marktplatz |

---

## Ad Types

| adTypeId | Description |
|----------|-------------|
| 67 | Standard marketplace ad (BAP) |
| 69 | Commercial/business ad (BAPCOM) |

---

---

## Application Token Authentication

The API requires an `x-wh-application-token` header for all requests. This token is obtained by sending a signed request to the application-data endpoint.

### Token Request Flow

1. **Generate salt**: 12 random bytes, Base64-encoded
2. **Format timestamp**: `yyyy-MM-dd'T'HH:mm:ss+HHMM` (e.g., `2026-03-06T14:57:18+0100`)
3. **Create HMAC-SHA1 signature**:
   ```
   Secret: $2a$10$qTwigHZ2rRjCjRKwP.S6W.
   Data: {salt};{timestamp};api@tailored-apps.com
   ```
4. **POST to**: `https://api.willhaben.at/restapi/v2/application-data`

### Request Body

```json
{
  "applicationTokenRequest": {
    "timestamp": "2026-03-06T14:57:18+0100",
    "salt": "zdKHynUmI8VnPdRw",
    "signature": "yJ23MgtrLd3nYaMBST6xXHRie3s=",
    "organization": "api@tailored-apps.com"
  }
}
```

### Response

```json
{
  "applicationToken": {
    "value": "vUbhu3l/YLBUYicWNFRac/...",
    "expireDate": "2026-04-05T13:57:18.666+00:00",
    "expireInSeconds": 2592000
  }
}
```

The token is valid for **30 days** (2,592,000 seconds).

### Usage

Include the token in all API requests:
```
x-wh-application-token: {token_value}
```

**Note**: The `x-wh-request-signature` header seen in iOS mitmproxy captures is iOS-specific and not required when using the application token flow.

---

## TODO: Still need to capture

- [ ] Create new ad (POST)
- [ ] Update ad (PUT/PATCH)
- [ ] Image upload

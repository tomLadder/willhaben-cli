import { createHmac, randomBytes } from "crypto";
import { loadConfig, saveConfig } from "../store/config.js";
import { formatTimestamp, getClientHeaders, ORGANIZATION } from "./headers.js";
import type { ApplicationToken } from "../types/index.js";

// Secret used to sign application token requests
const HMAC_SECRET = "$2a$10$qTwigHZ2rRjCjRKwP.S6W.";
// Listed in https://app-aggregator.willhaben.at/service-registry.json
const APPLICATION_DATA_URL =
  "https://app-aggregator.willhaben.at/api/v1/application-data";

// Generate HMAC-SHA1 signature
function generateSignature(salt: string, timestamp: string): string {
  const dataToSign = `${salt};${timestamp};${ORGANIZATION}`;
  return createHmac("sha1", HMAC_SECRET).update(dataToSign).digest("base64");
}

// Request body for application token
interface ApplicationTokenRequest {
  applicationTokenRequest: {
    timestamp: string;
    salt: string;
    signature: string;
    organization: string;
  };
}

// Response from application-data endpoint
interface ApplicationDataResponse {
  applicationToken?: {
    value: string;
    expireDate: string;
    expireInSeconds: number;
  };
}

// Fetch a new application token from the API
async function fetchApplicationToken(): Promise<ApplicationToken> {
  const salt = randomBytes(12).toString("base64url");
  const timestamp = formatTimestamp();
  const signature = generateSignature(salt, timestamp);

  const requestBody: ApplicationTokenRequest = {
    applicationTokenRequest: {
      timestamp,
      salt,
      signature,
      organization: ORGANIZATION,
    },
  };

  const response = await fetch(
    // root-links is the smallest config item; the token is returned regardless
    `${APPLICATION_DATA_URL}?config_item=root-links`,
    {
      method: "POST",
      headers: {
        ...getClientHeaders(),
        "Content-Type": "application/json",
        "X-WH-Date": timestamp,
      },
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch application token: ${response.status} ${response.statusText}`
    );
  }

  const data: ApplicationDataResponse = await response.json();

  if (!data.applicationToken?.value) {
    throw new Error("No application token in response");
  }

  return {
    value: data.applicationToken.value,
    expiresAt: Date.now() + data.applicationToken.expireInSeconds * 1000,
  };
}

// Get cached token or fetch a new one
export async function getApplicationToken(): Promise<string> {
  const config = await loadConfig();

  // Check if we have a valid cached token (with 1 hour buffer)
  if (
    config.applicationToken &&
    config.applicationToken.expiresAt > Date.now() + 3600000
  ) {
    return config.applicationToken.value;
  }

  // Fetch new token
  const token = await fetchApplicationToken();

  // Cache it
  config.applicationToken = token;
  await saveConfig(config);

  return token.value;
}

// Force refresh the application token
export async function refreshApplicationToken(): Promise<string> {
  const config = await loadConfig();
  const token = await fetchApplicationToken();
  config.applicationToken = token;
  await saveConfig(config);
  return token.value;
}

// Clear cached application token
export async function clearApplicationToken(): Promise<void> {
  const config = await loadConfig();
  delete config.applicationToken;
  await saveConfig(config);
}

import { createHmac, randomBytes } from "crypto";
import { loadConfig, saveConfig } from "../store/config.js";
import type { ApplicationToken } from "../types/index.js";

// Secret key from decompiled Android app
const HMAC_SECRET = "$2a$10$qTwigHZ2rRjCjRKwP.S6W.";
const ORGANIZATION = "api@tailored-apps.com";
const APPLICATION_DATA_URL =
  "https://api.willhaben.at/restapi/v2/application-data";

// Generate timestamp in format: yyyy-MM-dd'T'HH:mm:ss+HHMM
function formatTimestamp(date: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const offsetHrs = pad(Math.floor(Math.abs(offset) / 60));
  const offsetMins = pad(Math.abs(offset) % 60);

  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
    `${sign}${offsetHrs}${offsetMins}`
  );
}

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
  const salt = randomBytes(12).toString("base64");
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
    `${APPLICATION_DATA_URL}?config_item=search-config`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "willhaben/6201787 CFNetwork/3860.400.51 Darwin/25.3.0",
        "x-wh-client":
          "api@tailored-apps.com;willhabenapp;ios;8.33.0;responsive_app",
        "x-wh-date": timestamp,
        "x-wh-security-version": "20130527022532",
        "x-wh-visitor-id": crypto.randomUUID().toUpperCase(),
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

// Export timestamp formatter for use in headers
export { formatTimestamp };

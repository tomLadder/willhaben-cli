import { getAuthTokens, setAuthTokens, isTokenExpired } from "../store/config.js";
import { getApplicationToken } from "./application-token.js";
import { getClientHeaders } from "./headers.js";
import type { ApiError, ApiResponse } from "../types/index.js";

// API base URLs
const SSO_URL = "https://sso.willhaben.at";
const PUBLIC_API_URL = "https://publicapi.willhaben.at";
const REST_API_URL = "https://api.willhaben.at/restapi/v2";
const SEARCH_API_URL = "https://ad-search.willhaben.at/restapi/v2";

const TOKEN_URL = `${SSO_URL}/auth/realms/willhaben/protocol/openid-connect/token`;

export const SESSION_EXPIRED_ERROR: ApiError = {
  code: "SESSION_EXPIRED",
  message: "Your session has expired. Run `willhaben login` to log in again.",
};

/**
 * Refresh the access token. Keycloak rotates refresh tokens, so the new
 * refresh token must be stored too, otherwise the session dies once the
 * original refresh token expires.
 * Returns the new access token, or null if the session can't be refreshed.
 */
export async function refreshAccessToken(): Promise<string | null> {
  const tokens = await getAuthTokens();
  if (!tokens) return null;

  try {
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: "apps",
        grant_type: "refresh_token",
        refresh_token: tokens.refreshToken,
        scope: "openid",
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    await setAuthTokens({
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? tokens.refreshToken,
      expiresAt: Date.now() + data.expires_in * 1000,
      refreshExpiresAt: data.refresh_expires_in
        ? Date.now() + data.refresh_expires_in * 1000
        : tokens.refreshExpiresAt,
    });
    return data.access_token;
  } catch {
    return null;
  }
}

/**
 * Get a valid access token, refreshing it if needed.
 * Returns null if not logged in or the session has expired.
 */
export async function getValidAccessToken(): Promise<string | null> {
  const tokens = await getAuthTokens();
  if (!tokens) return null;
  if (await isTokenExpired()) return refreshAccessToken();
  return tokens.accessToken;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  authenticated?: boolean;
  contentType?: string;
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = PUBLIC_API_URL) {
    this.baseUrl = baseUrl;
  }

  async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = "GET",
      body,
      headers = {},
      authenticated = true,
      contentType,
    } = options;

    try {
      // Get application token (required for all API requests)
      const applicationToken = await getApplicationToken();

      // Without a stored session the request goes out anonymously, as before
      const authHeaders: Record<string, string> = {};
      if (authenticated && (await getAuthTokens())) {
        const accessToken = await getValidAccessToken();
        if (!accessToken) {
          return { success: false, error: SESSION_EXPIRED_ERROR };
        }
        authHeaders.Authorization = `Bearer ${accessToken}`;
      }
      const defaultHeaders: Record<string, string> = {
        ...getClientHeaders(),
        "Content-Type": contentType ?? "application/json",
      };

      const url = endpoint.startsWith("http")
        ? endpoint
        : `${this.baseUrl}${endpoint}`;

      const response = await fetch(url, {
        method,
        headers: {
          ...defaultHeaders,
          "X-WH-Application-Token": applicationToken,
          ...authHeaders,
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const text = await response.text();
      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: response.status.toString(),
            message:
              typeof data === "object" && data && "message" in data
                ? String((data as { message: string }).message)
                : response.statusText,
            details: typeof data === "object" ? (data as Record<string, unknown>) : undefined,
          },
        };
      }

      return {
        success: true,
        data: data as T,
      };
    } catch (err) {
      return {
        success: false,
        error: {
          code: "NETWORK_ERROR",
          message: err instanceof Error ? err.message : "Unknown error",
        },
      };
    }
  }

  async get<T>(
    endpoint: string,
    options: Omit<RequestOptions, "method" | "body"> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  async post<T>(
    endpoint: string,
    body?: unknown,
    options: Omit<RequestOptions, "method" | "body"> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: "POST", body });
  }

  async put<T>(
    endpoint: string,
    body?: unknown,
    options: Omit<RequestOptions, "method" | "body"> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: "PUT", body });
  }

  async patch<T>(
    endpoint: string,
    body?: unknown,
    options: Omit<RequestOptions, "method" | "body"> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: "PATCH", body });
  }

  async delete<T>(
    endpoint: string,
    options: Omit<RequestOptions, "method" | "body"> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }
}

export const apiClient = new ApiClient(PUBLIC_API_URL);
export { SSO_URL, PUBLIC_API_URL, REST_API_URL, SEARCH_API_URL };

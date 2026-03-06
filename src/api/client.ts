import { getAuthTokens, setAuthTokens, isTokenExpired } from "../store/config.js";
import { getApplicationToken, formatTimestamp } from "./application-token.js";
import type { ApiResponse, RefreshTokenResponse } from "../types/index.js";

// Real API base URLs discovered via mitmproxy
const SSO_URL = "https://sso.willhaben.at";
const PUBLIC_API_URL = "https://publicapi.willhaben.at";
const REST_API_URL = "https://api.willhaben.at/restapi/v2";

// Common headers for mobile app API
const getDefaultHeaders = (): Record<string, string> => ({
  "Content-Type": "application/json",
  Accept: "application/json",
  "User-Agent": "willhaben/6201787 CFNetwork/3860.400.51 Darwin/25.3.0",
  "x-wh-client": "api@tailored-apps.com;willhabenapp;ios;8.33.0;responsive_app",
  "x-wh-date": formatTimestamp(),
  "x-wh-security-version": "20130527022532",
  "x-wh-visitor-id": crypto.randomUUID().toUpperCase(),
  applicationprovider: "api@tailored-apps.com",
});

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

  private async getAuthHeader(): Promise<Record<string, string>> {
    const tokens = await getAuthTokens();
    if (!tokens) return {};

    // Check if token needs refresh
    if (await isTokenExpired()) {
      const refreshed = await this.refreshToken(tokens.refreshToken);
      if (refreshed) {
        return { Authorization: `Bearer ${refreshed.accessToken}` };
      }
      return {};
    }

    return { Authorization: `Bearer ${tokens.accessToken}` };
  }

  private async refreshToken(
    refreshToken: string
  ): Promise<RefreshTokenResponse | null> {
    try {
      const response = await fetch(
        `${SSO_URL}/auth/realms/willhaben/protocol/openid-connect/token`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            client_id: "apps",
            grant_type: "refresh_token",
            refresh_token: refreshToken,
          }),
        }
      );

      if (!response.ok) return null;

      const data = await response.json();

      // Update stored tokens
      const tokens = await getAuthTokens();
      if (tokens) {
        await setAuthTokens({
          ...tokens,
          accessToken: data.access_token,
          expiresAt: Date.now() + data.expires_in * 1000,
        });
      }

      return {
        accessToken: data.access_token,
        expiresIn: data.expires_in,
      };
    } catch {
      return null;
    }
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

      const authHeaders = authenticated ? await this.getAuthHeader() : {};
      const defaultHeaders = getDefaultHeaders();

      if (contentType) {
        defaultHeaders["Content-Type"] = contentType;
      }

      const url = endpoint.startsWith("http")
        ? endpoint
        : `${this.baseUrl}${endpoint}`;

      const response = await fetch(url, {
        method,
        headers: {
          ...defaultHeaders,
          "x-wh-application-token": applicationToken,
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
export { SSO_URL, PUBLIC_API_URL, REST_API_URL };

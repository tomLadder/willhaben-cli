import { exec } from "child_process";
import { promisify } from "util";
import * as http from "http";
import { SSO_URL } from "./client.js";
import {
  setAuthTokens,
  setUserInfo,
  clearAuth,
  getUserInfo,
  getAuthTokens,
} from "../store/config.js";
import {
  registerUrlScheme,
  isUrlSchemeRegistered,
} from "../utils/url-scheme.js";
import type { UserInfo, ApiResponse } from "../types/index.js";

const execAsync = promisify(exec);

// Local callback server port
const CALLBACK_PORT = 8377;

// The app's official redirect URI
const APP_REDIRECT_URI = "willhaben-app://willhaben.at/token";

// OAuth PKCE helpers
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(new Uint8Array(hash));
}

function base64UrlEncode(buffer: Uint8Array): string {
  let binary = "";
  for (const byte of buffer) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function parseJwt(token: string): Record<string, unknown> {
  const base64Url = token.split(".")[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split("")
      .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join("")
  );
  return JSON.parse(jsonPayload);
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in: number;
  token_type: string;
  id_token: string;
}

// Start a local server to receive the callback
function startCallbackServer(useAutoMode: boolean): Promise<{
  server: http.Server;
  codePromise: Promise<string | null>;
}> {
  let resolveCode: (code: string | null) => void;
  const codePromise = new Promise<string | null>((resolve) => {
    resolveCode = resolve;
  });

  const server = http.createServer((req, res) => {
    const url = new URL(req.url || "", `http://127.0.0.1:${CALLBACK_PORT}`);

    if (url.pathname === "/submit") {
      // Callback from URL handler or manual submission
      const code = url.searchParams.get("code");
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("OK");
      if (code) {
        resolveCode!(code);
      }
    } else if (url.pathname === "/" && !useAutoMode) {
      // Manual fallback page - only shown when URL scheme not registered
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(getManualLoginPage());
    } else if (url.pathname === "/") {
      // Auto mode - show waiting page
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(getWaitingPage());
    } else {
      res.writeHead(404);
      res.end("Not found");
    }
  });

  server.listen(CALLBACK_PORT, "127.0.0.1");

  // Track connections so we can close them
  const connections = new Set<import("net").Socket>();
  server.on("connection", (conn) => {
    connections.add(conn);
    conn.on("close", () => connections.delete(conn));
  });

  // Timeout after 5 minutes
  const timeout = setTimeout(() => {
    resolveCode!(null);
  }, 300000);

  // Add method to force close all connections
  (server as any).closeAll = () => {
    clearTimeout(timeout);
    server.close();
    for (const conn of connections) {
      conn.destroy();
    }
  };

  return Promise.resolve({ server, codePromise });
}

function getWaitingPage(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Willhaben Login</title>
  <style>
    body { font-family: system-ui; max-width: 500px; margin: 50px auto; padding: 20px; text-align: center; }
    h1 { color: #e5322e; }
    .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #e5322e; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 30px auto; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    .success { display: none; }
    .success h2 { color: #28a745; }
  </style>
</head>
<body>
  <h1>Willhaben CLI Login</h1>
  <div id="waiting">
    <div class="spinner"></div>
    <p>Waiting for login to complete...</p>
    <p style="color: #666; font-size: 14px;">Complete the login in the other browser tab.</p>
  </div>
  <div id="success" class="success">
    <h2>Login successful!</h2>
    <p>You can close this window and return to the terminal.</p>
  </div>
  <script>
    // Poll to check if login completed
    setInterval(async () => {
      try {
        const res = await fetch('/status');
        if (res.status === 404) {
          // Server closed = login done
          document.getElementById('waiting').style.display = 'none';
          document.getElementById('success').style.display = 'block';
        }
      } catch {
        document.getElementById('waiting').style.display = 'none';
        document.getElementById('success').style.display = 'block';
      }
    }, 1000);
  </script>
</body>
</html>`;
}

function getManualLoginPage(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Willhaben Login</title>
  <style>
    body { font-family: system-ui; max-width: 500px; margin: 50px auto; padding: 20px; }
    h1 { color: #e5322e; }
    .code-input { width: 100%; padding: 10px; font-size: 16px; margin: 10px 0; box-sizing: border-box; }
    button { background: #e5322e; color: white; border: none; padding: 12px 24px; font-size: 16px; cursor: pointer; }
    button:hover { background: #c52a27; }
    .instructions { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .success { color: green; display: none; }
  </style>
</head>
<body>
  <h1>Willhaben CLI Login</h1>

  <div class="instructions">
    <p><strong>After logging in:</strong></p>
    <ol>
      <li>The browser will redirect to <code>willhaben-app://...</code></li>
      <li>Copy the <strong>code</strong> from the URL (after <code>code=</code>)</li>
      <li>Paste it below</li>
    </ol>
    <p style="font-size: 14px; color: #666; margin-top: 10px;">
      Tip: Run <code>willhaben setup</code> to enable automatic login handling.
    </p>
  </div>

  <div id="form">
    <input type="text" id="code" class="code-input" placeholder="Paste the code or full callback URL here..." autofocus>
    <br>
    <button onclick="submitCode()">Complete Login</button>
  </div>

  <div id="success" class="success">
    <h2>Login successful!</h2>
    <p>You can close this window.</p>
  </div>

  <script>
    function submitCode() {
      let input = document.getElementById('code').value.trim();

      // Extract code if full URL was pasted
      if (input.includes('code=')) {
        const match = input.match(/code=([^&]+)/);
        if (match) input = match[1];
      }

      if (!input) {
        alert('Please enter the code');
        return;
      }

      fetch('/submit?code=' + encodeURIComponent(input))
        .then(() => {
          document.getElementById('form').style.display = 'none';
          document.getElementById('success').style.display = 'block';
        });
    }

    document.getElementById('code').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') submitCode();
    });
  </script>
</body>
</html>`;
}

export async function login(): Promise<ApiResponse<{ user: UserInfo }>> {
  // Check if URL scheme is registered
  const isRegistered = await isUrlSchemeRegistered();

  // If not registered, try to register it
  if (!isRegistered) {
    try {
      console.log("Setting up automatic login handling...");
      await registerUrlScheme();
      console.log("URL handler registered successfully.\n");
    } catch (err) {
      console.log("Note: Could not register URL handler. Using manual mode.\n");
    }
  }

  const useAutoMode = await isUrlSchemeRegistered();

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  // Start local callback server
  const { server, codePromise } = await startCallbackServer(useAutoMode);

  const authUrl = new URL(
    `${SSO_URL}/auth/realms/willhaben/protocol/openid-connect/auth`
  );
  authUrl.searchParams.set("wh-theme", "dark");
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", "apps");
  authUrl.searchParams.set("scope", "openid wh-login-token");
  authUrl.searchParams.set("redirect_uri", APP_REDIRECT_URI);

  const platform = process.platform;
  const openCmd =
    platform === "darwin"
      ? "open"
      : platform === "win32"
        ? "start"
        : "xdg-open";

  if (useAutoMode) {
    console.log("Opening browser for login...");
    console.log("You will be redirected back automatically after login.\n");
  } else {
    console.log("Opening browser for login...");
    console.log("After logging in, copy the code from the callback URL.\n");
  }

  try {
    // Open the SSO login page
    await execAsync(`${openCmd} "${authUrl.toString()}"`);

    // In manual mode, also open the helper page
    if (!useAutoMode) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await execAsync(`${openCmd} "http://127.0.0.1:${CALLBACK_PORT}/"`);
    }
  } catch {
    console.log("Could not open browser automatically.");
    console.log(`Please open: ${authUrl.toString()}\n`);
  }

  // Wait for code
  const code = await codePromise;
  (server as any).closeAll();

  if (!code) {
    return {
      success: false,
      error: { code: "TIMEOUT", message: "Login timed out or cancelled" },
    };
  }

  // Exchange code for tokens
  try {
    const tokenResponse = await fetch(
      `${SSO_URL}/auth/realms/willhaben/protocol/openid-connect/token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: "apps",
          redirect_uri: APP_REDIRECT_URI,
          code,
          scope: "openid wh-login-token",
          grant_type: "authorization_code",
          code_verifier: codeVerifier,
        }),
      }
    );

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      return {
        success: false,
        error: { code: "TOKEN_ERROR", message: `Token exchange failed: ${error}` },
      };
    }

    const tokens: TokenResponse = await tokenResponse.json();

    // Parse user info from JWT
    const claims = parseJwt(tokens.access_token);
    const user: UserInfo = {
      id: String(claims["wh:userId"]),
      email: String(claims.email),
      name: String(claims.given_name || claims.name || ""),
    };

    // Store tokens
    await setAuthTokens({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
    });
    await setUserInfo(user);

    return { success: true, data: { user } };
  } catch (err) {
    return {
      success: false,
      error: {
        code: "ERROR",
        message: err instanceof Error ? err.message : String(err),
      },
    };
  }
}

export async function logout(): Promise<ApiResponse<void>> {
  await clearAuth();
  return { success: true };
}

export async function whoami(): Promise<ApiResponse<UserInfo>> {
  // First try to get from cache
  const cachedUser = await getUserInfo();
  if (cachedUser) {
    return { success: true, data: cachedUser };
  }

  // Try to parse from token
  const tokens = await getAuthTokens();
  if (tokens) {
    try {
      const claims = parseJwt(tokens.accessToken);
      const user: UserInfo = {
        id: String(claims["wh:userId"]),
        email: String(claims.email),
        name: String(claims.given_name || claims.name || ""),
      };
      await setUserInfo(user);
      return { success: true, data: user };
    } catch {
      // Token parse failed
    }
  }

  return {
    success: false,
    error: { code: "NOT_LOGGED_IN", message: "Not logged in" },
  };
}

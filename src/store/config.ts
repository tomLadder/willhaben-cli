import { homedir } from "os";
import { join } from "path";
import { mkdir, readFile, writeFile, chmod } from "fs/promises";
import type { Config, AuthTokens, UserInfo } from "../types/index.js";

const CONFIG_DIR = join(homedir(), ".willhaben");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

const DEFAULT_CONFIG: Config = {
  settings: {
    outputFormat: "pretty",
  },
};

async function ensureConfigDir(): Promise<void> {
  try {
    await mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "EEXIST") {
      throw err;
    }
  }
}

export async function loadConfig(): Promise<Config> {
  try {
    await ensureConfigDir();
    const data = await readFile(CONFIG_FILE, "utf-8");
    return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return DEFAULT_CONFIG;
    }
    throw err;
  }
}

export async function saveConfig(config: Config): Promise<void> {
  await ensureConfigDir();
  await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), {
    mode: 0o600,
  });
  await chmod(CONFIG_FILE, 0o600);
}

export async function getAuthTokens(): Promise<AuthTokens | undefined> {
  const config = await loadConfig();
  return config.auth;
}

export async function setAuthTokens(tokens: AuthTokens): Promise<void> {
  const config = await loadConfig();
  config.auth = tokens;
  await saveConfig(config);
}

export async function clearAuth(): Promise<void> {
  const config = await loadConfig();
  delete config.auth;
  delete config.user;
  await saveConfig(config);
}

export async function getUserInfo(): Promise<UserInfo | undefined> {
  const config = await loadConfig();
  return config.user;
}

export async function setUserInfo(user: UserInfo): Promise<void> {
  const config = await loadConfig();
  config.user = user;
  await saveConfig(config);
}

export async function getConfigValue<K extends keyof Config["settings"]>(
  key: K
): Promise<Config["settings"][K]> {
  const config = await loadConfig();
  return config.settings[key];
}

export async function setConfigValue<K extends keyof Config["settings"]>(
  key: K,
  value: Config["settings"][K]
): Promise<void> {
  const config = await loadConfig();
  config.settings[key] = value;
  await saveConfig(config);
}

export async function isAuthenticated(): Promise<boolean> {
  const tokens = await getAuthTokens();
  return tokens !== undefined;
}

export async function isTokenExpired(): Promise<boolean> {
  const tokens = await getAuthTokens();
  if (!tokens) return true;
  // Add 60 second buffer
  return Date.now() >= tokens.expiresAt - 60000;
}

// Extract user details from JWT token for API requests
export interface JwtUserInfo {
  userId: number;
  email: string;
  firstName: string;
}

export async function getJwtUserInfo(): Promise<JwtUserInfo | null> {
  const tokens = await getAuthTokens();
  if (!tokens) return null;

  try {
    // JWT structure: header.payload.signature
    const parts = tokens.accessToken.split(".");
    if (parts.length !== 3) return null;

    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf-8")
    );

    return {
      userId: payload["wh:userId"] || payload["iad:loginId"],
      email: payload.email,
      firstName: payload.given_name || payload.name?.split(" ")[0] || "User",
    };
  } catch {
    return null;
  }
}

export { CONFIG_DIR, CONFIG_FILE };

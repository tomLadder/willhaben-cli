import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

const execAsync = promisify(exec);

const SCHEME = "willhaben-app";
const APP_NAME = "Willhaben CLI";

/**
 * Get the path to the CLI executable
 */
function getExecutablePath(): string {
  // When compiled with bun, this gives the binary path
  // When running with bun, this gives the bun path
  return process.execPath;
}

/**
 * Get the full command to run the CLI
 * Handles both compiled binary and bun script scenarios
 */
function getCliCommand(): string {
  const execPath = getExecutablePath();

  // If running via bun (not compiled), we need to include the script
  if (execPath.includes("bun")) {
    const scriptPath = path.resolve(process.argv[1]);
    return `"${execPath}" "${scriptPath}"`;
  }

  // Compiled binary
  return `"${execPath}"`;
}

// ============ macOS ============

async function registerMacOS(): Promise<void> {
  const appDir = path.join(os.homedir(), "Applications", "WillhabenURLHandler.app");
  const tempScript = "/tmp/willhaben-handler.applescript";

  // Create AppleScript that handles URL scheme callbacks
  const appleScript = `on open location theURL
    -- Extract code from URL and forward to local server
    set theCode to do shell script "echo " & quoted form of theURL & " | sed -n 's/.*code=\\\\([^&]*\\\\).*/\\\\1/p'"

    if theCode is not "" then
        do shell script "curl -s 'http://127.0.0.1:8377/submit?code=" & theCode & "'"
    end if
end open location
`;

  // Write AppleScript source
  await fs.writeFile(tempScript, appleScript);

  // Compile as applet
  await execAsync(`rm -rf "${appDir}"`);
  await execAsync(`osacompile -o "${appDir}" "${tempScript}"`);

  // Add URL scheme to Info.plist
  const plistPath = path.join(appDir, "Contents", "Info.plist");
  const plistCommands = [
    `Add :CFBundleURLTypes array`,
    `Add :CFBundleURLTypes:0 dict`,
    `Add :CFBundleURLTypes:0:CFBundleURLName string 'Willhaben OAuth Callback'`,
    `Add :CFBundleURLTypes:0:CFBundleURLSchemes array`,
    `Add :CFBundleURLTypes:0:CFBundleURLSchemes:0 string '${SCHEME}'`,
    `Add :CFBundleIdentifier string at.willhaben.cli.urlhandler`,
    `Add :LSBackgroundOnly bool true`,
  ];

  for (const cmd of plistCommands) {
    try {
      await execAsync(`/usr/libexec/PlistBuddy -c "${cmd}" "${plistPath}"`);
    } catch {
      // Ignore errors for existing keys
    }
  }

  // Register with Launch Services
  await execAsync(`/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -f "${appDir}"`);

  // Cleanup temp file
  await fs.unlink(tempScript).catch(() => {});
}

async function unregisterMacOS(): Promise<void> {
  const appDir = path.join(os.homedir(), "Applications", "WillhabenURLHandler.app");

  try {
    // Unregister from Launch Services
    await execAsync(`/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -u "${appDir}"`);
  } catch {
    // Ignore if not registered
  }

  try {
    await fs.rm(appDir, { recursive: true });
  } catch {
    // Ignore if doesn't exist
  }
}

async function isRegisteredMacOS(): Promise<boolean> {
  const appDir = path.join(os.homedir(), "Applications", "WillhabenURLHandler.app");
  try {
    await fs.access(appDir);
    return true;
  } catch {
    return false;
  }
}

// ============ Windows ============

async function registerWindows(): Promise<void> {
  const cliCommand = getCliCommand();

  // Register URL scheme in user's registry
  const commands = [
    `reg add "HKCU\\Software\\Classes\\${SCHEME}" /ve /d "URL:Willhaben Protocol" /f`,
    `reg add "HKCU\\Software\\Classes\\${SCHEME}" /v "URL Protocol" /d "" /f`,
    `reg add "HKCU\\Software\\Classes\\${SCHEME}\\shell\\open\\command" /ve /d "${cliCommand.replace(/"/g, '\\"')} --url-callback \\"%1\\"" /f`,
  ];

  for (const cmd of commands) {
    await execAsync(cmd);
  }
}

async function unregisterWindows(): Promise<void> {
  try {
    await execAsync(`reg delete "HKCU\\Software\\Classes\\${SCHEME}" /f`);
  } catch {
    // Ignore if doesn't exist
  }
}

async function isRegisteredWindows(): Promise<boolean> {
  try {
    await execAsync(`reg query "HKCU\\Software\\Classes\\${SCHEME}"`);
    return true;
  } catch {
    return false;
  }
}

// ============ Linux ============

async function registerLinux(): Promise<void> {
  const applicationsDir = path.join(os.homedir(), ".local", "share", "applications");
  await fs.mkdir(applicationsDir, { recursive: true });

  const cliCommand = getCliCommand();

  // Create .desktop file
  const desktopEntry = `[Desktop Entry]
Name=${APP_NAME} URL Handler
Exec=${cliCommand} --url-callback %u
Type=Application
NoDisplay=true
MimeType=x-scheme-handler/${SCHEME};
`;

  const desktopFile = path.join(applicationsDir, "willhaben-url-handler.desktop");
  await fs.writeFile(desktopFile, desktopEntry);

  // Register as default handler
  await execAsync(`xdg-mime default willhaben-url-handler.desktop x-scheme-handler/${SCHEME}`);

  // Update desktop database
  try {
    await execAsync(`update-desktop-database "${applicationsDir}"`);
  } catch {
    // May not be available on all systems
  }
}

async function unregisterLinux(): Promise<void> {
  const desktopFile = path.join(
    os.homedir(),
    ".local",
    "share",
    "applications",
    "willhaben-url-handler.desktop"
  );

  try {
    await fs.unlink(desktopFile);
  } catch {
    // Ignore if doesn't exist
  }
}

async function isRegisteredLinux(): Promise<boolean> {
  const desktopFile = path.join(
    os.homedir(),
    ".local",
    "share",
    "applications",
    "willhaben-url-handler.desktop"
  );

  try {
    await fs.access(desktopFile);
    return true;
  } catch {
    return false;
  }
}

// ============ Public API ============

export async function registerUrlScheme(): Promise<void> {
  const platform = process.platform;

  if (platform === "darwin") {
    await registerMacOS();
  } else if (platform === "win32") {
    await registerWindows();
  } else {
    await registerLinux();
  }
}

export async function unregisterUrlScheme(): Promise<void> {
  const platform = process.platform;

  if (platform === "darwin") {
    await unregisterMacOS();
  } else if (platform === "win32") {
    await unregisterWindows();
  } else {
    await unregisterLinux();
  }
}

export async function isUrlSchemeRegistered(): Promise<boolean> {
  const platform = process.platform;

  if (platform === "darwin") {
    return isRegisteredMacOS();
  } else if (platform === "win32") {
    return isRegisteredWindows();
  } else {
    return isRegisteredLinux();
  }
}

/**
 * Parse a callback URL and extract the authorization code
 */
export function parseCallbackUrl(url: string): string | null {
  try {
    // URL format: willhaben-app://willhaben.at/token?code=XXX&...
    const parsed = new URL(url);
    return parsed.searchParams.get("code");
  } catch {
    // Try to extract code directly if URL parsing fails
    const match = url.match(/[?&]code=([^&]+)/);
    return match ? match[1] : null;
  }
}

/**
 * Forward the callback code to the local auth server
 */
export async function forwardCallback(code: string, port: number = 8377): Promise<boolean> {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/submit?code=${encodeURIComponent(code)}`);
    return response.ok;
  } catch {
    return false;
  }
}

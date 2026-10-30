// Client identity sent with every request (willhaben Android app 8.67.0)
const APP_VERSION = "8.67.0";
const APP_VERSION_CODE = "615389";
const ORGANIZATION = "api@tailored-apps.com";

export const CLIENT_ID_HEADER = `${ORGANIZATION};willhabenapp;android;${APP_VERSION};responsive_app`;
export const USER_AGENT = `willhaben/${APP_VERSION_CODE} okhttp/5.5.0 Android/14`;
export const SECURITY_VERSION = "20130527022532";

// The app keeps one visitor id per install; we keep one per process
const VISITOR_ID = crypto.randomUUID();

// Generate timestamp in format: yyyy-MM-dd'T'HH:mm:ss+HHMM
export function formatTimestamp(date: Date = new Date()): string {
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

// Headers sent with every request (auth and application token are added by the caller)
export function getClientHeaders(): Record<string, string> {
  return {
    Accept: "application/json",
    "User-Agent": USER_AGENT,
    "X-WH-Client": CLIENT_ID_HEADER,
    "X-WH-Date": formatTimestamp(),
    "X-WH-Security-Version": SECURITY_VERSION,
    "X-WH-Visitor-Id": VISITOR_ID,
    applicationprovider: ORGANIZATION,
  };
}

export { ORGANIZATION };

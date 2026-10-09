import { afterAll, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { Command } from "commander";
import type { Listing } from "../src/types/index.js";

// Synthetic credentials and in-memory cache only; never read the user's config.
const userInfo = { userId: 123, email: "test@example.invalid", firstName: "Test" };
mock.module("../src/store/config.js", () => ({
  isAuthenticated: async () => true,
  getJwtUserInfo: async () => userInfo,
  getConfigValue: async () => "pretty",
  getAuthTokens: async () => ({ accessToken: "synthetic", refreshToken: "synthetic", expiresAt: Infinity }),
  isTokenExpired: async () => false,
  setAuthTokens: async () => { throw new Error("Unexpected token refresh"); },
  loadConfig: async () => ({ applicationToken: { value: "synthetic", expiresAt: Infinity } }),
  saveConfig: async () => { throw new Error("Unexpected config write"); },
}));
const cached: Listing[] = [];
mock.module("../src/store/listings.js", () => ({
  updateCachedListing: async (listing: Listing) => { cached.push(structuredClone(listing)); },
  updateCachedListings: async () => { throw new Error("Unexpected bulk cache update"); },
  removeCachedListing: async () => { throw new Error("Unexpected cache removal"); },
  getCachedListing: async (id: string) => cached.find((listing) => listing.id === id),
}));

// Exercise the real HTTP client; intercept every fetch, including unexpected URLs.
const requests: Array<{ method: string; path: string; body: unknown }> = [];
let saveStatus = 200;
let activateStatus = 200;
let saveData: unknown;
const fetchSpy = spyOn(globalThis, "fetch").mockImplementation(Object.assign(async (input: RequestInfo | URL, init?: RequestInit) => {
  const path = new URL(String(input)).pathname;
  const method = init?.method || "GET";
  requests.push({ method, path, body: init?.body ? JSON.parse(String(init.body)) : undefined });
  if (method === "POST" && path === "/restapi/v2/bap/save") {
    return Response.json(saveStatus === 200 ? saveData : { message: "Save rejected" }, { status: saveStatus });
  }
  if (method === "PUT" && path === "/restapi/v2/bap/activate/456") {
    return Response.json(activateStatus === 200 ? {} : { message: "Activation rejected" }, { status: activateStatus });
  }
  throw new Error(`Unexpected network request: ${method} ${path}`);
}, { preconnect: () => {} }));
const { createListing } = await import("../src/api/listings.js");
const { registerListingCommands } = await import("../src/cli/commands/listings.js");
const directory = await mkdtemp(join(tmpdir(), "willhaben-draft-test-"));
const templatePath = join(directory, "template.json");
const options = {
  title: "Synthetic test listing", description: "Not a real ad", price: 10,
  postCode: "1010", locationId: 900, location: "Wien",
  categoryPath: ["BOOKSFILMANDMUSIC", "NON_FICTION_BOOKS"], skipValidation: true,
};
await writeFile(templatePath, JSON.stringify(options));

beforeEach(() => {
  requests.length = 0;
  cached.length = 0;
  saveStatus = 200;
  activateStatus = 200;
  saveData = { adId: 456 };
});
afterAll(async () => {
  fetchSpy.mockRestore();
  await rm(directory, { recursive: true, force: true });
});

async function runPublish(...args: string[]) {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const log = spyOn(console, "log").mockImplementation((...args) => { stdout.push(args.join(" ") + "\n"); });
  const errorLog = spyOn(console, "error").mockImplementation((...args) => { stderr.push(args.join(" ") + "\n"); });
  const out = spyOn(process.stdout, "write").mockImplementation((chunk: unknown) => { stdout.push(String(chunk)); return true; });
  const err = spyOn(process.stderr, "write").mockImplementation((chunk: unknown) => { stderr.push(String(chunk)); return true; });
  const exit = spyOn(process, "exit").mockImplementation((code) => { throw new Error(`exit:${code}`); });
  let failure: unknown;
  try {
    const program = new Command();
    registerListingCommands(program);
    await program.parseAsync(["publish", templatePath, ...args], { from: "user" });
  } catch (error) {
    failure = error;
  } finally {
    log.mockRestore();
    errorLog.mockRestore();
    out.mockRestore();
    err.mockRestore();
    exit.mockRestore();
  }
  return { stdout: stdout.join(""), stderr: stderr.join(""), failure };
}
const saveRequest = { method: "POST", path: "/restapi/v2/bap/save" };
const activationRequest = { method: "PUT", path: "/restapi/v2/bap/activate/456" };
function expectRequests(expected: typeof saveRequest[]) {
  expect(requests.map(({ method, path }) => ({ method, path }))).toEqual(expected);
}

describe("createListing", () => {
  test("draft saves once without activation and caches draft status", async () => {
    const result = await createListing({ ...options, draft: true }, userInfo);
    expectRequests([saveRequest]);
    expect(result.success).toBe(true);
    expect(result.data?.status).toBe("draft");
    expect(cached).toEqual([result.data!]);
    expect(requests[0].body).toMatchObject({ heading: options.title, userId: userInfo.userId, adId: 0 });
    expect(requests[0].body).not.toHaveProperty("draft");
  });
  for (const draft of [undefined, false]) {
    test(`draft=${draft} preserves default publication`, async () => {
      const result = await createListing({ ...options, draft }, userInfo);
      expectRequests([saveRequest, activationRequest]);
      expect(result.success).toBe(true);
      expect(result.data?.status).toBe("active");
      expect(cached).toEqual([result.data!]);
    });
  }
  for (const draft of [true, false]) {
    test(`save failure never activates (draft=${draft})`, async () => {
      saveStatus = 400;
      const result = await createListing({ ...options, draft }, userInfo);
      expectRequests([saveRequest]);
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Save rejected");
      expect(cached).toEqual([]);
    });
  }
  test("missing save data never activates", async () => {
    saveData = null;
    const result = await createListing(options, userInfo);
    expectRequests([saveRequest]);
    expect(result.error?.code).toBe("SAVE_FAILED");
    expect(cached).toEqual([]);
  });
  test("activation failure is not successful publication or an active cache entry", async () => {
    activateStatus = 400;
    const result = await createListing(options, userInfo);
    expectRequests([saveRequest, activationRequest]);
    expect(result.success).toBe(false);
    expect(result.error?.message).toBe("Activation rejected");
    expect(cached).toEqual([]);
  });
});

describe("real publish CLI action", () => {
  test("--draft propagates through the real API and emits draft JSON", async () => {
    const result = await runPublish("--draft", "--json");
    expect(result.failure).toBeUndefined();
    expectRequests([saveRequest]);
    expect(JSON.parse(result.stdout).status).toBe("draft");
    expect(cached[0].status).toBe("draft");
    expect(result.stderr).toContain("Draft saved successfully!");
    expect(result.stderr).not.toMatch(/publishing|published/i);
  });
  test("--draft human output reports saving, not publishing", async () => {
    const result = await runPublish("--draft");
    expect(result.failure).toBeUndefined();
    expectRequests([saveRequest]);
    expect(result.stdout).toContain("ID: 456");
    expect(result.stderr).toContain("Saving draft...");
    expect(result.stderr).toContain("Draft saved successfully!");
    expect(result.stderr).not.toMatch(/publishing|published/i);
  });
  test("without --draft still publishes and returns active JSON", async () => {
    const result = await runPublish("--json");
    expect(result.failure).toBeUndefined();
    expectRequests([saveRequest, activationRequest]);
    expect(JSON.parse(result.stdout).status).toBe("active");
    expect(result.stderr).toContain("Listing published successfully!");
  });
  test("draft save failure reports failure and never activates", async () => {
    saveStatus = 400;
    const result = await runPublish("--draft");
    expect(result.failure).toEqual(new Error("exit:1"));
    expectRequests([saveRequest]);
    expect(result.stderr).toContain("Failed to save draft");
    expect(result.stderr).toContain("Save rejected");
    expect(result.stderr).not.toMatch(/successfully|publish/i);
    expect(cached).toEqual([]);
  });
  test("publish save failure never activates or reports success", async () => {
    saveStatus = 400;
    const result = await runPublish();
    expect(result.failure).toEqual(new Error("exit:1"));
    expectRequests([saveRequest]);
    expect(result.stderr).toContain("Failed to publish listing");
    expect(result.stderr).not.toContain("successfully");
    expect(cached).toEqual([]);
  });
  test("publish activation failure reports failure, not publication", async () => {
    activateStatus = 400;
    const result = await runPublish();
    expect(result.failure).toEqual(new Error("exit:1"));
    expectRequests([saveRequest, activationRequest]);
    expect(result.stderr).toContain("Failed to publish listing");
    expect(result.stderr).toContain("Activation rejected");
    expect(result.stderr).not.toContain("successfully");
    expect(cached).toEqual([]);
  });
});

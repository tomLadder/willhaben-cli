import { join } from "path";
import { readFile, writeFile } from "fs/promises";
import type { Listing, ListingsCache } from "../types/index.js";
import { CONFIG_DIR } from "./config.js";

const LISTINGS_FILE = join(CONFIG_DIR, "listings.json");

const EMPTY_CACHE: ListingsCache = {
  listings: [],
  lastUpdated: new Date().toISOString(),
};

export async function loadListingsCache(): Promise<ListingsCache> {
  try {
    const data = await readFile(LISTINGS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return EMPTY_CACHE;
    }
    throw err;
  }
}

export async function saveListingsCache(cache: ListingsCache): Promise<void> {
  await writeFile(LISTINGS_FILE, JSON.stringify(cache, null, 2));
}

export async function getCachedListings(): Promise<Listing[]> {
  const cache = await loadListingsCache();
  return cache.listings;
}

export async function updateCachedListings(listings: Listing[]): Promise<void> {
  const cache: ListingsCache = {
    listings,
    lastUpdated: new Date().toISOString(),
  };
  await saveListingsCache(cache);
}

export async function getCachedListing(id: string): Promise<Listing | undefined> {
  const cache = await loadListingsCache();
  return cache.listings.find((l) => l.id === id);
}

export async function updateCachedListing(listing: Listing): Promise<void> {
  const cache = await loadListingsCache();
  const index = cache.listings.findIndex((l) => l.id === listing.id);
  if (index >= 0) {
    cache.listings[index] = listing;
  } else {
    cache.listings.push(listing);
  }
  cache.lastUpdated = new Date().toISOString();
  await saveListingsCache(cache);
}

export async function removeCachedListing(id: string): Promise<void> {
  const cache = await loadListingsCache();
  cache.listings = cache.listings.filter((l) => l.id !== id);
  cache.lastUpdated = new Date().toISOString();
  await saveListingsCache(cache);
}

export async function clearListingsCache(): Promise<void> {
  await saveListingsCache(EMPTY_CACHE);
}

export async function getCacheAge(): Promise<number> {
  const cache = await loadListingsCache();
  return Date.now() - new Date(cache.lastUpdated).getTime();
}

export { LISTINGS_FILE };

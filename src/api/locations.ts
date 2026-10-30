import { apiClient, REST_API_URL } from "./client.js";
import type { ApiResponse } from "../types/index.js";

// Postcode to location lookup, as used when creating a listing
const ENDPOINTS = {
  locationsForPostCode: (postCode: string) =>
    `${REST_API_URL}/locations/${encodeURIComponent(postCode)}`,
};

export interface Location {
  id: number;
  description: string;
}

interface LocationsResponse {
  locations?: Location[];
}

export async function getLocationsForPostCode(
  postCode: string
): Promise<ApiResponse<Location[]>> {
  const response = await apiClient.get<LocationsResponse>(
    ENDPOINTS.locationsForPostCode(postCode),
    { authenticated: false }
  );

  if (!response.success) {
    return { success: false, error: response.error };
  }

  return { success: true, data: response.data?.locations ?? [] };
}

/**
 * Resolve a location for a postcode, picking the one matching `id` or `name`
 * (case-insensitive), or the only location for that postcode.
 */
export async function resolveLocation(
  postCode: string,
  name?: string,
  id?: number
): Promise<ApiResponse<Location>> {
  const result = await getLocationsForPostCode(postCode);
  if (!result.success || !result.data) {
    return { success: false, error: result.error };
  }

  const locations = result.data;
  if (locations.length === 0) {
    return {
      success: false,
      error: { code: "LOCATION_NOT_FOUND", message: `No locations found for postcode ${postCode}` },
    };
  }

  const match = id !== undefined
    ? locations.find((l) => l.id === id)
    : name
    ? locations.find((l) => l.description.toLowerCase() === name.toLowerCase())
    : locations.length === 1
      ? locations[0]
      : undefined;

  if (!match) {
    const options = locations.map((l) => `${l.description} (${l.id})`).join(", ");
    return {
      success: false,
      error: {
        code: "LOCATION_AMBIGUOUS",
        message: id !== undefined
          ? `Location id ${id} does not belong to postcode ${postCode}. Options: ${options}`
          : name
          ? `"${name}" is not a location for postcode ${postCode}. Options: ${options}`
          : `Postcode ${postCode} has several locations, set "location" to one of: ${options}`,
      },
    };
  }

  return { success: true, data: match };
}

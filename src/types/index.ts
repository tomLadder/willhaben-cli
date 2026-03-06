// Authentication types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp
}

// Application token for API access (valid 30 days)
export interface ApplicationToken {
  value: string;
  expiresAt: number; // Unix timestamp
}

export interface UserInfo {
  id: string;
  email: string;
  name?: string;
}

// Config types
export interface Config {
  auth?: AuthTokens;
  user?: UserInfo;
  applicationToken?: ApplicationToken;
  settings: {
    defaultCategory?: string;
    outputFormat: "pretty" | "json";
  };
}

// Listing types
export interface ListingImage {
  url: string;
  id?: string;
}

export interface ListingAttribute {
  name: string;
  values: string[];
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  categoryId: number;
  status: "active" | "inactive" | "expired" | "deleted";
  images: ListingImage[];
  attributes: ListingAttribute[];
  location?: {
    address?: string;
    zipCode?: string;
    city?: string;
  };
  contactInfo?: {
    name?: string;
    phone?: string;
  };
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

export interface ListingTemplate {
  title: string;
  description: string;
  price: number;
  currency?: string;
  // Category path codes, e.g., ["BOOKSFILMANDMUSIC", "NON_FICTION_BOOKS"]
  categoryPath: string[];
  // Location settings
  postCode: string;
  locationId: number; // District ID, e.g., 117458 for Jakomini/Graz
  location: string; // District name, e.g., "Jakomini"
  street?: string; // Street address (any text)
  // Optional attributes
  condition?: "neu" | "gebraucht" | "defekt";
  delivery?: ("PICKUP" | "Versand")[];
  // Legacy fields (kept for compatibility)
  categoryId?: number;
  images?: string[]; // File paths or URLs
  attributes?: Record<string, string | string[]>;
  contactInfo?: {
    name?: string;
    phone?: string;
  };
  // Skip client-side validation
  skipValidation?: boolean;
}

// Local listings cache
export interface ListingsCache {
  listings: Listing[];
  lastUpdated: string;
}

// API response types
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: UserInfo;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  expiresIn: number;
}

export interface ListingsResponse {
  listings: Listing[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateListingRequest {
  title: string;
  description: string;
  price: number;
  currency: string;
  categoryId: number;
  attributes?: ListingAttribute[];
  location?: Listing["location"];
  contactInfo?: Listing["contactInfo"];
}

export interface UpdateListingRequest {
  title?: string;
  description?: string;
  price?: number;
  attributes?: ListingAttribute[];
  location?: Listing["location"];
  contactInfo?: Listing["contactInfo"];
}

// Category types (re-exported from api/categories.ts for convenience)
export type {
  CategoryNode,
  AttributeReference,
  CategoryTreeResponse,
  ValidationResult,
  ValidationError,
} from "../api/categories.js";

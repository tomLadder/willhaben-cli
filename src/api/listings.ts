import { apiClient, REST_API_URL } from "./client.js";
import {
  updateCachedListings,
  updateCachedListing,
  removeCachedListing,
} from "../store/listings.js";
import {
  getCategoryTree,
  validateAttributes,
  getRequiredAttributesForPath,
  COMMON_ATTRIBUTES,
  type CategoryNode,
  type ValidationResult,
} from "./categories.js";
import type {
  Listing,
  ApiResponse,
} from "../types/index.js";

// Real endpoints discovered via mitmproxy
const ENDPOINTS = {
  // Read endpoints (Public API)
  listMyAds: "/myatz/v1/atverz/showpagedadsfromuser",
  adDetail: (id: string) => `/atdetail/v1/${id}`,

  // Status change endpoints (Public API)
  deactivate: (id: string) => `/myatz/v1/bap/deactivate/${id}`,
  markSold: (id: string) => `/myatz/v1/bap/sold/${id}`,
  markReserved: (id: string) => `/myatz/v1/bap/updatesalesinfo/${id}/5`,
  unreserve: (id: string) => `/myatz/v1/bap/updatesalesinfo/${id}/0`,
  delete: (id: string) => `/myatz/v1/bap/${id}`,
  republish: (id: string) => `${REST_API_URL}/bap/copy/${id}`,

  // Create/Edit endpoints (REST API)
  saveDraft: `${REST_API_URL}/bap/save`,
  publish: (id: string) => `${REST_API_URL}/bap/activate/${id}`,
  getForEdit: (id: string) => `${REST_API_URL}/bap/${id}`,
  saveEdit: `${REST_API_URL}/bap/edit`,

  // Image endpoints (REST API)
  uploadImage: (adId: string) => `${REST_API_URL}/atimage/${adId}`,
  orderImages: (adId: string) => `${REST_API_URL}/atimage/${adId}/order`,
  deleteImage: (adId: string, imageId: number) => `${REST_API_URL}/atimage/${adId}/${imageId}`,
  getImages: (adId: string) => `${REST_API_URL}/atimage/${adId}`,
};

// Response types from the real API - used by /myatz/v1/ endpoints
interface WillhabenAdvert {
  id: string;
  uuid: string;
  description: string;
  adTypeId: number;
  productId: number;
  startDate: string;
  endDate: string;
  advertStatus: {
    description: string;
    id: string;
    statusId: number;
    rejectReason: string | null;
  };
  advertImageList?: {
    advertImage: Array<{
      mainImageUrl: string | null;
      thumbnailImageUrl: string | null;
    }>;
  };
  attributes?: {
    attribute: Array<{
      name: string;
      values: string[];
    }>;
  };
  categoryXmlCode: string;
  verticalId: number;
  isP2PDeliveryActivated: boolean;
}

// Response type from /atdetail/v1/ endpoint - widget-based structure
interface AdDetailWidget {
  type: string;
  title: string;
  listIndex: number;
  // PICTURE_SLIDER widget
  advertImageList?: Array<{
    mainImageUrl: string;
    thumbnailImageUrl: string;
    referenceImageUrl: string;
  }>;
  // TITLE_WITH_PRICE widget
  formattedPrice?: string;
  // KEY_VALUE_PAIRS_LIST widget
  keyValuePairsList?: Array<{
    name: string;
    value: string;
  }>;
  // PARAGRAPHED_TEXT widget (description)
  teaser?: string;
  remainingText?: string;
  fontColor?: string;
  // CATEGORIES widget
  categoryPath?: {
    categoryEntryList: Array<{
      categoryName: string;
      url: string;
    }>;
  };
  // SELLER_DETAILS widget
  address?: string;
  contextLinkList?: Array<{
    id: string;
    description: string;
    uri: string;
  }>;
}

interface AdDetailResponse {
  adId: string;
  description: string;
  widgets: AdDetailWidget[];
  status: {
    id: number;
    name: string;
  };
  verticalId: number;
  adTypeId: number;
  payliveryEnabled: boolean;
}

interface WillhabenVertical {
  verticalId: number;
  verticalName: string;
  advertDetails: WillhabenAdvert[];
}

interface WillhabenListingsResponse {
  verticalList: WillhabenVertical[];
  totalNumberOfAdvertDetails: number;
}

// Convert API response to our Listing type (for /myatz/v1/ endpoints)
function convertToListing(ad: WillhabenAdvert, verticalName: string): Listing {
  const priceAttr = ad.attributes?.attribute.find((a) => a.name === "PRICE");
  const price = priceAttr ? parseFloat(priceAttr.values[0]) : 0;

  const statusMap: Record<string, Listing["status"]> = {
    active: "active",
    passive: "expired",
    sold: "inactive",
    inactive: "inactive",
  };

  return {
    id: ad.id,
    title: ad.description,
    description: ad.description,
    price,
    currency: "EUR",
    category: verticalName,
    categoryId: ad.adTypeId,
    status: statusMap[ad.advertStatus.id] || "active",
    images:
      ad.advertImageList?.advertImage
        .filter((img) => img.mainImageUrl)
        .map((img) => ({
          url: img.mainImageUrl!,
          id: img.mainImageUrl!,
        })) || [],
    attributes:
      ad.attributes?.attribute.map((attr) => ({
        name: attr.name,
        values: attr.values,
      })) || [],
    createdAt: ad.startDate,
    updatedAt: ad.startDate,
    expiresAt: ad.endDate,
  };
}

// Convert ad detail response to our Listing type (for /atdetail/v1/ endpoint)
function convertAdDetailToListing(detail: AdDetailResponse): Listing {
  // Extract price from TITLE_WITH_PRICE widget
  const priceWidget = detail.widgets.find((w) => w.type === "TITLE_WITH_PRICE");
  const priceStr = priceWidget?.formattedPrice?.replace(/[€\s]/g, "") || "0";
  const price = parseFloat(priceStr) || 0;

  // Extract images from PICTURE_SLIDER widget
  const imageWidget = detail.widgets.find((w) => w.type === "PICTURE_SLIDER");
  const images = imageWidget?.advertImageList?.map((img) => ({
    url: img.mainImageUrl,
    id: img.mainImageUrl,
  })) || [];

  // Extract description from PARAGRAPHED_TEXT widget
  const descWidget = detail.widgets.find(
    (w) => w.type === "PARAGRAPHED_TEXT" && w.teaser && !w.fontColor
  );
  const fullDescription = descWidget
    ? `${descWidget.teaser || ""}${descWidget.remainingText || ""}`
    : detail.description;

  // Extract category from CATEGORIES widget
  const categoryWidget = detail.widgets.find((w) => w.type === "CATEGORIES");
  const categoryPath = categoryWidget?.categoryPath?.categoryEntryList || [];
  const category = categoryPath.length > 0
    ? categoryPath[categoryPath.length - 1].categoryName
    : "Unknown";

  // Extract attributes from KEY_VALUE_PAIRS_LIST widget
  const kvWidget = detail.widgets.find((w) => w.type === "KEY_VALUE_PAIRS_LIST");
  const attributes = kvWidget?.keyValuePairsList?.map((kv) => ({
    name: kv.name,
    values: [kv.value],
  })) || [];

  // Map status
  const statusMap: Record<number, Listing["status"]> = {
    50: "active",
    60: "inactive",
    70: "expired",
  };

  return {
    id: detail.adId,
    title: detail.description,
    description: fullDescription,
    price,
    currency: "EUR",
    category,
    categoryId: detail.adTypeId,
    status: statusMap[detail.status.id] || "active",
    images,
    attributes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export interface ListingsResponse {
  listings: Listing[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listMyListings(
  page = 1,
  pageSize = 50,
  statusFilter = "ALL"
): Promise<ApiResponse<ListingsResponse>> {
  const response = await apiClient.get<WillhabenListingsResponse>(
    `${ENDPOINTS.listMyAds}?page=${page}&rows=${pageSize}&statusFilters=${statusFilter}`
  );

  if (response.success && response.data) {
    const listings: Listing[] = [];

    for (const vertical of response.data.verticalList) {
      for (const ad of vertical.advertDetails) {
        listings.push(convertToListing(ad, vertical.verticalName));
      }
    }

    await updateCachedListings(listings);

    return {
      success: true,
      data: {
        listings,
        total: response.data.totalNumberOfAdvertDetails,
        page,
        pageSize,
      },
    };
  }

  return {
    success: false,
    error: response.error,
  };
}

export async function getListing(id: string): Promise<ApiResponse<Listing>> {
  const response = await apiClient.get<AdDetailResponse>(
    ENDPOINTS.adDetail(id)
  );

  if (response.success && response.data) {
    const listing = convertAdDetailToListing(response.data);
    await updateCachedListing(listing);
    return { success: true, data: listing };
  }

  return { success: false, error: response.error };
}

export async function deactivateListing(id: string): Promise<ApiResponse<void>> {
  return apiClient.post<void>(ENDPOINTS.deactivate(id));
}

export async function markListingSold(id: string): Promise<ApiResponse<void>> {
  const response = await apiClient.put<void>(ENDPOINTS.markSold(id));
  if (response.success) {
    await removeCachedListing(id);
  }
  return response;
}

export async function markListingReserved(id: string): Promise<ApiResponse<void>> {
  return apiClient.put<void>(ENDPOINTS.markReserved(id));
}

export async function unreserveListing(id: string): Promise<ApiResponse<void>> {
  return apiClient.put<void>(ENDPOINTS.unreserve(id));
}

export async function deleteListing(id: string): Promise<ApiResponse<void>> {
  const response = await apiClient.delete<void>(ENDPOINTS.delete(id));
  if (response.success) {
    await removeCachedListing(id);
  }
  return response;
}

export async function republishListing(id: string): Promise<ApiResponse<Listing>> {
  const response = await apiClient.get<WillhabenAdvert>(ENDPOINTS.republish(id));

  if (response.success && response.data) {
    const listing = convertToListing(response.data, "Unknown");
    await updateCachedListing(listing);
    return { success: true, data: listing };
  }

  return { success: false, error: response.error };
}

// Types for create/edit API
interface TreeAttribute {
  attributeNode: { code: string };
  selectedAttributeValueNodes: Array<{ code: string; treeAttributeValueId?: number }>;
}

interface CategoryPathItem {
  code: string;
}

interface CreateAdRequest {
  userId: number;
  heading: string;
  description: string;
  price: number;
  postCode: string;
  street?: string;
  adTypeId: number;
  productId: number;
  emailAddress: string;
  adId: number;
  countryId: number;
  locationId: number;
  location: string;
  verticalId: number;
  categoryTreeId: number;
  categoryPath: { path: CategoryPathItem[] };
  treeAttributes: TreeAttribute[];
  firstName: string;
}

interface CreateAdResponse {
  adId: number;
  heading: string;
  description: string;
  price: number;
  categoryTreeId: number;
  verticalId: number;
  adTypeId: number;
  location: string;
  adUuid: string;
}

export interface PublishListingOptions {
  title: string;
  description: string;
  price: number;
  postCode: string;
  locationId: number;
  location: string; // District name, e.g., "Jakomini"
  street?: string; // Street address (can be any text)
  categoryPath: string[]; // e.g., ["BOOKSFILMANDMUSIC", "NON_FICTION_BOOKS", "MARIAGE_RELATIONSHIP"]
  condition?: "neu" | "gebraucht" | "defekt";
  delivery?: ("PICKUP" | "Versand")[];
  firstName?: string;
  email?: string;
  // Additional category-specific attributes (code -> value or values)
  attributes?: Record<string, string | string[]>;
  // Skip attribute validation (not recommended)
  skipValidation?: boolean;
}

// Cached category tree for validation
let cachedCategoryTree: CategoryNode | null = null;
let categoryTreeExpiry = 0;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

async function getCachedCategoryTree(): Promise<CategoryNode | null> {
  if (cachedCategoryTree && Date.now() < categoryTreeExpiry) {
    return cachedCategoryTree;
  }

  const response = await getCategoryTree(67); // Marketplace
  if (response.success && response.data) {
    cachedCategoryTree = response.data.categoryNode;
    categoryTreeExpiry = Date.now() + CACHE_TTL;
    return cachedCategoryTree;
  }

  return null;
}

/**
 * Validate listing options before creating a listing.
 * Checks that all required attributes for the category are provided.
 */
export async function validateListingOptions(
  options: PublishListingOptions
): Promise<ValidationResult> {
  const categoryTree = await getCachedCategoryTree();
  if (!categoryTree) {
    return {
      valid: false,
      errors: [{ attributeCode: "_category", message: "Failed to fetch category tree for validation" }],
      missingRequired: [],
      invalidValues: [],
    };
  }

  // Build provided attributes map including condition and delivery
  const providedAttributes: Record<string, string | string[]> = {
    ...options.attributes,
  };

  if (options.condition) {
    providedAttributes[COMMON_ATTRIBUTES.CONDITION] = options.condition;
  }

  if (options.delivery && options.delivery.length > 0) {
    providedAttributes[COMMON_ATTRIBUTES.DELIVERY] = options.delivery;
  }

  return validateAttributes(categoryTree, options.categoryPath, providedAttributes);
}

/**
 * Get required attributes for a category path.
 * Useful for building forms or prompts.
 */
export async function getRequiredAttributesForCategory(
  categoryPath: string[]
): Promise<ApiResponse<Array<{ code: string; selectionType: string }>>> {
  const categoryTree = await getCachedCategoryTree();
  if (!categoryTree) {
    return {
      success: false,
      error: { code: "CATEGORY_TREE_ERROR", message: "Failed to fetch category tree" },
    };
  }

  const attributes = getRequiredAttributesForPath(categoryTree, categoryPath);
  return {
    success: true,
    data: attributes.map((a) => ({ code: a.code, selectionType: a.selectionType })),
  };
}

export async function createListing(
  options: PublishListingOptions,
  userInfo: { userId: number; email: string; firstName: string }
): Promise<ApiResponse<Listing>> {
  // Validate attributes unless explicitly skipped
  if (!options.skipValidation) {
    const validation = await validateListingOptions(options);
    if (!validation.valid) {
      const missingList = validation.missingRequired.join(", ");
      return {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: `Missing required attributes: ${missingList}`,
          details: {
            missingRequired: validation.missingRequired,
            errors: validation.errors,
          },
        },
      };
    }
  }

  // Build tree attributes
  const treeAttributes: TreeAttribute[] = [];

  // Condition (Zustand)
  if (options.condition) {
    treeAttributes.push({
      attributeNode: { code: "Zustand" },
      selectedAttributeValueNodes: [{ code: options.condition }],
    });
  }

  // Delivery options (Übergabe)
  if (options.delivery && options.delivery.length > 0) {
    treeAttributes.push({
      attributeNode: { code: "Uebergabe" },
      selectedAttributeValueNodes: options.delivery.map((d) => ({ code: d })),
    });
  }

  // Additional category-specific attributes
  if (options.attributes) {
    for (const [code, value] of Object.entries(options.attributes)) {
      const values = Array.isArray(value) ? value : [value];
      treeAttributes.push({
        attributeNode: { code },
        selectedAttributeValueNodes: values.map((v) => ({ code: v })),
      });
    }
  }

  const requestBody: CreateAdRequest = {
    userId: userInfo.userId,
    heading: options.title,
    description: options.description,
    price: options.price,
    postCode: options.postCode,
    street: options.street,
    adTypeId: 67, // Marketplace
    productId: 67,
    emailAddress: options.email || userInfo.email,
    adId: 0, // New ad
    countryId: -141, // Austria
    locationId: options.locationId,
    location: options.location,
    verticalId: 5, // Marketplace
    categoryTreeId: 0,
    categoryPath: {
      path: options.categoryPath.map((code) => ({ code })),
    },
    treeAttributes,
    firstName: options.firstName || userInfo.firstName,
  };

  // Debug: log request body (can be removed later)
  if (process.env.DEBUG) {
    console.log("Request body:", JSON.stringify(requestBody, null, 2));
  }

  // Step 1: Save as draft
  const saveResponse = await apiClient.post<CreateAdResponse>(
    ENDPOINTS.saveDraft,
    requestBody
  );

  if (!saveResponse.success || !saveResponse.data) {
    // Debug: log full error response
    if (process.env.DEBUG) {
      console.log("Error response:", JSON.stringify(saveResponse.error, null, 2));
    }
    return {
      success: false,
      error: saveResponse.error || {
        code: "SAVE_FAILED",
        message: "Failed to save listing draft",
      },
    };
  }

  const adId = saveResponse.data.adId;

  // Step 2: Activate/publish the draft (uses PUT)
  const activateResponse = await apiClient.put<CreateAdResponse>(
    ENDPOINTS.publish(adId.toString())
  );

  if (!activateResponse.success) {
    return {
      success: false,
      error: activateResponse.error || {
        code: "ACTIVATE_FAILED",
        message: `Draft created (ID: ${adId}) but failed to publish`,
      },
    };
  }

  // Return the created listing
  const listing: Listing = {
    id: adId.toString(),
    title: options.title,
    description: options.description,
    price: options.price,
    currency: "EUR",
    category: options.categoryPath[options.categoryPath.length - 1] || "Unknown",
    categoryId: 67,
    status: "active",
    images: [],
    attributes: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await updateCachedListing(listing);
  return { success: true, data: listing };
}

// Response type from GET /bap/{id} for editing
interface EditAdResponse {
  heading: string;
  description: string;
  price: number;
  adTypeId: number;
  userId: number;
  productId: number;
  emailAddress: string;
  categoryTreeId: number;
  categoryPath: { path: Array<{ label?: string; code: string }> };
  postCode: string;
  locationId: number;
  street?: string;
  adId: number;
  verticalId: number;
  countryId: number;
  location: string;
  firstName: string;
  treeAttributes: Array<{
    attributeTreeId?: number;
    attributeNode: { label?: string; code: string };
    selectedValueTreeIds?: number[];
    selectedAttributeValueNodes: Array<{ label?: string; code: string }>;
  }>;
}

export async function updateListing(
  id: string,
  updates: Partial<{ title: string; description: string; price: number }>
): Promise<ApiResponse<Listing>> {
  // First, get the current ad data
  const getResponse = await apiClient.get<EditAdResponse>(
    ENDPOINTS.getForEdit(id)
  );

  if (!getResponse.success || !getResponse.data) {
    return {
      success: false,
      error: getResponse.error || {
        code: "GET_FAILED",
        message: "Failed to fetch listing for editing",
      },
    };
  }

  const currentData = getResponse.data;

  // Build the edit request body matching the API structure
  const requestBody = {
    categoryTreeId: 0,
    street: currentData.street,
    treeAttributes: currentData.treeAttributes.map((attr) => ({
      attributeNode: { code: attr.attributeNode.code },
      selectedAttributeValueNodes: attr.selectedAttributeValueNodes.map((v) => ({ code: v.code })),
    })),
    userId: currentData.userId,
    description: updates.description ?? currentData.description,
    firstName: currentData.firstName,
    verticalId: currentData.verticalId,
    price: updates.price ?? currentData.price,
    locationId: currentData.locationId,
    adTypeId: currentData.adTypeId,
    emailAddress: currentData.emailAddress,
    categoryPath: {
      path: currentData.categoryPath.path.map((p) => ({ code: p.code })),
    },
    heading: updates.title ?? currentData.heading,
    adId: currentData.adId,
    location: currentData.location,
    countryId: currentData.countryId,
    postCode: currentData.postCode,
    productId: currentData.productId,
  };

  // Save the updates using PUT
  const saveResponse = await apiClient.put<CreateAdResponse>(
    ENDPOINTS.saveEdit,
    requestBody
  );

  if (!saveResponse.success || !saveResponse.data) {
    return {
      success: false,
      error: saveResponse.error || {
        code: "UPDATE_FAILED",
        message: "Failed to update listing",
      },
    };
  }

  const listing: Listing = {
    id,
    title: requestBody.heading,
    description: requestBody.description,
    price: requestBody.price,
    currency: "EUR",
    category: "Unknown",
    categoryId: currentData.adTypeId,
    status: "active",
    images: [],
    attributes: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await updateCachedListing(listing);
  return { success: true, data: listing };
}

// Image types
export interface AdvertImage {
  id: number;
  name?: string;
  selfLink?: string;
  description?: string | null;
  mainImageUrl: string;
  thumbnailImageUrl: string;
  referenceImageUrl: string;
  reference: string;
}

export interface ImageListResponse {
  advertImage: AdvertImage[];
  floorPlans: unknown[];
}

/**
 * Upload an image to a listing.
 * @param adId - The listing ID
 * @param imagePath - Path to the image file
 */
export async function uploadImage(
  adId: string,
  imagePath: string
): Promise<ApiResponse<ImageListResponse>> {
  const { readFile } = await import("fs/promises");
  const { basename } = await import("path");
  const { getApplicationToken, formatTimestamp } = await import("./application-token.js");
  const { getAuthTokens, isTokenExpired, setAuthTokens } = await import("../store/config.js");

  try {
    const imageBuffer = await readFile(imagePath);
    const fileName = basename(imagePath);

    // Determine content type
    const ext = fileName.toLowerCase().split('.').pop();
    const contentTypes: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
    };
    const contentType = contentTypes[ext || "jpg"] || "image/jpeg";

    // Create form data
    const formData = new FormData();
    const blob = new Blob([imageBuffer], { type: contentType });
    formData.append("file", blob, fileName);

    // Get tokens and refresh if needed
    const applicationToken = await getApplicationToken();
    let tokens = await getAuthTokens();

    if (!tokens) {
      return {
        success: false,
        error: { code: "AUTH_ERROR", message: "Not logged in" },
      };
    }

    // Refresh token if expired
    if (await isTokenExpired()) {
      const refreshResponse = await fetch(
        "https://sso.willhaben.at/auth/realms/willhaben/protocol/openid-connect/token",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: "apps",
            grant_type: "refresh_token",
            refresh_token: tokens.refreshToken,
          }),
        }
      );
      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        tokens = {
          ...tokens,
          accessToken: refreshData.access_token,
          expiresAt: Date.now() + refreshData.expires_in * 1000,
        };
        await setAuthTokens(tokens);
      }
    }

    const response = await fetch(ENDPOINTS.uploadImage(adId), {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${tokens.accessToken}`,
        "x-wh-application-token": applicationToken,
        "x-wh-client": "api@tailored-apps.com;willhabenapp;ios;8.33.0;responsive_app",
        "x-wh-date": formatTimestamp(),
        "Accept": "application/json",
      },
      body: formData,
    });

    const text = await response.text();
    if (process.env.DEBUG) {
      console.log("Upload response status:", response.status);
      console.log("Upload response:", text);
    }

    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      return {
        success: false,
        error: {
          code: response.status.toString(),
          message: text || "Failed to parse response",
        },
      };
    }

    if (!response.ok) {
      return {
        success: false,
        error: {
          code: response.status.toString(),
          message: (data as { message?: string }).message || "Failed to upload image",
        },
      };
    }

    return { success: true, data: data as ImageListResponse };
  } catch (err) {
    return {
      success: false,
      error: {
        code: "UPLOAD_ERROR",
        message: err instanceof Error ? err.message : "Failed to upload image",
      },
    };
  }
}

/**
 * Set the order of images for a listing.
 * @param adId - The listing ID
 * @param images - Array of image references in desired order
 */
export async function setImageOrder(
  adId: string,
  images: Array<{ id: number; reference: string; referenceImageUrl: string }>
): Promise<ApiResponse<void>> {
  const requestBody = {
    floorPlans: [],
    advertImage: images.map((img) => ({
      id: img.id,
      referenceImageUrl: img.referenceImageUrl,
      reference: img.reference,
    })),
  };

  return apiClient.put<void>(ENDPOINTS.orderImages(adId), requestBody);
}

/**
 * Get all images for a listing.
 * @param adId - The listing ID
 */
export async function getImages(adId: string): Promise<ApiResponse<ImageListResponse>> {
  return apiClient.get<ImageListResponse>(ENDPOINTS.getImages(adId));
}

/**
 * Delete an image from a listing by updating the order without that image.
 * @param adId - The listing ID
 * @param imageId - The image ID to delete
 */
export async function deleteImage(adId: string, imageId: number): Promise<ApiResponse<void>> {
  // Get current images
  const imagesResult = await getImages(adId);
  if (!imagesResult.success || !imagesResult.data) {
    return {
      success: false,
      error: imagesResult.error || { code: "GET_FAILED", message: "Failed to get images" },
    };
  }

  // Filter out the image to delete
  const remainingImages = imagesResult.data.advertImage.filter((img) => img.id !== imageId);

  // Update order with remaining images
  return setImageOrder(
    adId,
    remainingImages.map((img) => ({
      id: img.id,
      reference: img.reference,
      referenceImageUrl: img.referenceImageUrl,
    }))
  );
}

/**
 * Delete all images from a listing.
 * @param adId - The listing ID
 */
export async function deleteAllImages(adId: string): Promise<ApiResponse<void>> {
  const requestBody = {
    floorPlans: [],
    advertImage: [],
  };
  return apiClient.put<void>(ENDPOINTS.orderImages(adId), requestBody);
}

/**
 * Upload multiple images to a listing.
 * @param adId - The listing ID
 * @param imagePaths - Array of image file paths
 */
export async function uploadImages(
  adId: string,
  imagePaths: string[]
): Promise<ApiResponse<ImageListResponse>> {
  const uploadedImages: AdvertImage[] = [];

  for (const imagePath of imagePaths) {
    const result = await uploadImage(adId, imagePath);
    if (!result.success) {
      return result;
    }
    if (result.data?.advertImage) {
      uploadedImages.push(...result.data.advertImage);
    }
  }

  // Set image order after all uploads
  if (uploadedImages.length > 0) {
    await setImageOrder(
      adId,
      uploadedImages.map((img) => ({
        id: img.id,
        reference: img.reference,
        referenceImageUrl: img.referenceImageUrl,
      }))
    );
  }

  return {
    success: true,
    data: { advertImage: uploadedImages, floorPlans: [] },
  };
}

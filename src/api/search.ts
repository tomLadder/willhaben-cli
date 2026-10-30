import { apiClient, SEARCH_API_URL } from "./client.js";
import type { ApiResponse } from "../types/index.js";

// Marketplace search across all categories
const MARKETPLACE_SEARCH_URL = `${SEARCH_API_URL}/search/atz/seo/kaufen-und-verkaufen/marktplatz`;
const WEB_AD_BASE_URL = "https://www.willhaben.at/iad/";

// areaId values from the search "Bundesland" navigator
export const STATES: Record<string, number> = {
  burgenland: 1,
  kaernten: 2,
  niederoesterreich: 3,
  oberoesterreich: 4,
  salzburg: 5,
  steiermark: 6,
  tirol: 7,
  vorarlberg: 8,
  wien: 900,
};

// sort ids from the search sortOrderList
export const SORT_ORDERS: Record<string, number> = {
  newest: 1,
  nearest: 2,
  "price-asc": 3,
  "price-desc": 4,
  relevance: 7,
};

export interface SearchOptions {
  keyword?: string;
  categoryId?: string; // ATTRIBUTE_TREE id, see the "category" facet
  priceFrom?: number;
  priceTo?: number;
  state?: string; // key of STATES
  seller?: "private" | "dealer";
  paylivery?: boolean;
  periodDays?: number;
  sort?: string; // key of SORT_ORDERS
  page?: number;
  rows?: number;
  // Raw url parameters, e.g. ["treeAttributes", "22"] from a facet
  params?: Array<[string, string]>;
}

export interface SearchResultAd {
  id: string;
  title: string;
  price: number | null;
  priceDisplay: string | null;
  location: string | null;
  postCode: string | null;
  state: string | null;
  isPrivate: boolean;
  paylivery: boolean;
  publishedAt: string | null;
  description: string | null;
  imageUrl: string | null;
  url: string | null;
}

export interface SearchFacetValue {
  label: string;
  hits: number;
  params: Array<[string, string]>;
}

export interface SearchFacet {
  id: string;
  label: string;
  values: SearchFacetValue[];
}

export interface SearchResult {
  total: number;
  page: number;
  rows: number;
  ads: SearchResultAd[];
  facets: SearchFacet[];
}

interface RawAttribute {
  name: string;
  values: string[];
}

interface RawAdvertSummary {
  id: string;
  description: string;
  attributes: { attribute: RawAttribute[] };
  advertImageList?: { advertImage: Array<{ mainImageUrl: string }> };
}

interface RawUrlParam {
  urlParameterName: string;
  value: string;
}

interface RawNavigator {
  id: string;
  label: string;
  groupedPossibleValues?: Array<{
    possibleValues?: Array<{
      label: string;
      hits: number;
      urlParamRepresentationForValue?: RawUrlParam[];
    }>;
  }>;
}

interface RawSearchResponse {
  rowsFound: number;
  rowsRequested: number;
  pageRequested: number;
  advertSummaryList?: { advertSummary: RawAdvertSummary[] };
  navigatorGroups?: Array<{ navigatorList: RawNavigator[] }>;
}

export function buildSearchUrl(options: SearchOptions): string {
  const params = new URLSearchParams();
  if (options.keyword) params.set("keyword", options.keyword);
  if (options.categoryId) params.set("ATTRIBUTE_TREE", options.categoryId);
  if (options.priceFrom !== undefined) params.set("PRICE_FROM", String(options.priceFrom));
  if (options.priceTo !== undefined) params.set("PRICE_TO", String(options.priceTo));
  if (options.state) params.set("areaId", String(STATES[options.state]));
  if (options.seller) params.set("ISPRIVATE", options.seller === "private" ? "1" : "0");
  if (options.paylivery) params.set("paylivery", "true");
  if (options.periodDays) params.set("periode", String(options.periodDays));
  if (options.sort) params.set("sort", String(SORT_ORDERS[options.sort]));
  for (const [name, value] of options.params ?? []) params.append(name, value);
  params.set("page", String(options.page ?? 1));
  params.set("rows", String(options.rows ?? 30));
  return `${MARKETPLACE_SEARCH_URL}?${params}`;
}

function convertAd(ad: RawAdvertSummary): SearchResultAd {
  const attr = (name: string) =>
    ad.attributes.attribute.find((a) => a.name === name)?.values[0] ?? null;
  const price = attr("PRICE");
  const seoUrl = attr("SEO_URL");

  return {
    id: ad.id,
    title: attr("HEADING") ?? ad.description,
    price: price !== null ? parseFloat(price) : null,
    priceDisplay: attr("PRICE_FOR_DISPLAY"),
    location: attr("LOCATION"),
    postCode: attr("POSTCODE"),
    state: attr("STATE"),
    isPrivate: attr("ISPRIVATE") === "1",
    paylivery: attr("p2penabled") === "true",
    publishedAt: attr("PUBLISHED_String"),
    description: attr("BODY_DYN"),
    imageUrl: ad.advertImageList?.advertImage[0]?.mainImageUrl ?? null,
    url: seoUrl ? `${WEB_AD_BASE_URL}${seoUrl}` : null,
  };
}

function convertFacets(response: RawSearchResponse): SearchFacet[] {
  const navigators = (response.navigatorGroups ?? []).flatMap((g) => g.navigatorList);
  return navigators
    .map((nav) => ({
      id: nav.id,
      label: nav.label,
      values: (nav.groupedPossibleValues ?? [])
        .flatMap((g) => g.possibleValues ?? [])
        .map((v) => ({
          label: v.label,
          hits: v.hits,
          params: (v.urlParamRepresentationForValue ?? []).map(
            (p) => [p.urlParameterName, p.value] as [string, string]
          ),
        })),
    }))
    .filter((facet) => facet.values.length > 0);
}

export async function searchAds(
  options: SearchOptions
): Promise<ApiResponse<SearchResult>> {
  const response = await apiClient.get<RawSearchResponse>(buildSearchUrl(options), {
    authenticated: false,
  });

  if (!response.success || !response.data) {
    return { success: false, error: response.error };
  }

  const data = response.data;
  return {
    success: true,
    data: {
      total: data.rowsFound,
      page: data.pageRequested,
      rows: data.rowsRequested,
      ads: (data.advertSummaryList?.advertSummary ?? []).map(convertAd),
      facets: convertFacets(data),
    },
  };
}

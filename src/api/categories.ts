import { apiClient, REST_API_URL } from "./client.js";
import type { ApiResponse } from "../types/index.js";

// Category tree endpoint
const ENDPOINTS = {
  categoryTreeWithAttributes: (adTypeId: number) =>
    `${REST_API_URL}/categorytree/withattributes/${adTypeId}`,
};

// Types for category tree response (matches actual API structure)
export interface AttributeReference {
  required: boolean;
  treeAttributeId: number;
  code: string;
  selectionType: "SINGLE_SELECT" | "MULTI_SELECT";
}

export interface CategoryNode {
  treeId: number;
  code: string;
  label: string;
  children: CategoryNode[];
  attributeReferences: AttributeReference[];
  systemTags: string[];
}

export interface CategoryTreeResponse {
  categoryNode: CategoryNode;
}

// Attribute values response (for fetching valid values for an attribute)
export interface AttributeValue {
  code: string;
  label: string;
  treeAttributeValueId?: number;
}

export interface AttributeDefinition {
  treeAttributeId: number;
  code: string;
  label: string;
  selectionType: "SINGLE_SELECT" | "MULTI_SELECT";
  values: AttributeValue[];
}

// Validation types
export interface ValidationError {
  attributeCode: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  missingRequired: string[];
  invalidValues: Array<{ attribute: string; value: string; validValues?: string[] }>;
}

/**
 * Fetch the category tree with attributes for a given ad type.
 * @param adTypeId - The ad type ID (67 = Marketplace/BAP, 69 = Commercial/BAPCOM)
 */
export async function getCategoryTree(
  adTypeId: number = 67
): Promise<ApiResponse<CategoryTreeResponse>> {
  return apiClient.get<CategoryTreeResponse>(
    ENDPOINTS.categoryTreeWithAttributes(adTypeId)
  );
}

/**
 * Find a category node by its code path in the tree.
 * @param root - The root category node
 * @param path - Array of category codes, e.g., ["ANTIQUES_ART", "ANTIQUE_BOOKS_MAGAZINES", "COMICS_MANGAS"]
 */
export function findCategoryByPath(
  root: CategoryNode,
  path: string[]
): CategoryNode | null {
  if (path.length === 0) return root;

  let current: CategoryNode | undefined = root;

  for (const code of path) {
    if (!current?.children || current.children.length === 0) return null;
    current = current.children.find((c) => c.code === code);
    if (!current) return null;
  }

  return current;
}

/**
 * Get all required attributes for a category path (including parent attributes).
 * Attributes are accumulated from root to leaf.
 * @param root - The root category node
 * @param path - Array of category codes
 */
export function getRequiredAttributesForPath(
  root: CategoryNode,
  path: string[]
): AttributeReference[] {
  const attributes: AttributeReference[] = [];
  let current: CategoryNode | undefined = root;

  // Collect attributes from root
  if (current.attributeReferences) {
    attributes.push(...current.attributeReferences.filter((a) => a.required));
  }

  // Walk the path and collect required attributes
  for (const code of path) {
    if (!current?.children) break;
    current = current.children.find((c) => c.code === code);
    if (current?.attributeReferences) {
      attributes.push(...current.attributeReferences.filter((a) => a.required));
    }
  }

  // Deduplicate by code (in case same attribute appears at multiple levels)
  const seen = new Set<string>();
  return attributes.filter((attr) => {
    if (seen.has(attr.code)) return false;
    seen.add(attr.code);
    return true;
  });
}

/**
 * Get all attributes (required and optional) for a category path.
 * @param root - The root category node
 * @param path - Array of category codes
 */
export function getAllAttributesForPath(
  root: CategoryNode,
  path: string[]
): AttributeReference[] {
  const attributes: AttributeReference[] = [];
  let current: CategoryNode | undefined = root;

  // Collect attributes from root
  if (current.attributeReferences) {
    attributes.push(...current.attributeReferences);
  }

  // Walk the path and collect attributes
  for (const code of path) {
    if (!current?.children) break;
    current = current.children.find((c) => c.code === code);
    if (current?.attributeReferences) {
      attributes.push(...current.attributeReferences);
    }
  }

  // Deduplicate by code
  const seen = new Set<string>();
  return attributes.filter((attr) => {
    if (seen.has(attr.code)) return false;
    seen.add(attr.code);
    return true;
  });
}

/**
 * Validate that all required attributes are provided for a category.
 * @param root - The root category node
 * @param categoryPath - Array of category codes
 * @param providedAttributes - Map of attribute code to value(s)
 */
export function validateAttributes(
  root: CategoryNode,
  categoryPath: string[],
  providedAttributes: Record<string, string | string[]>
): ValidationResult {
  const requiredAttributes = getRequiredAttributesForPath(root, categoryPath);
  const errors: ValidationError[] = [];
  const missingRequired: string[] = [];
  const invalidValues: Array<{ attribute: string; value: string; validValues?: string[] }> = [];

  for (const attr of requiredAttributes) {
    const provided = providedAttributes[attr.code];

    if (provided === undefined || provided === null || provided === "") {
      missingRequired.push(attr.code);
      errors.push({
        attributeCode: attr.code,
        message: `Required attribute "${attr.code}" is missing`,
      });
      continue;
    }

    // Check if array is provided for single select
    if (attr.selectionType === "SINGLE_SELECT" && Array.isArray(provided) && provided.length > 1) {
      errors.push({
        attributeCode: attr.code,
        message: `Attribute "${attr.code}" is single-select but multiple values were provided`,
      });
    }

    // Check if array is empty
    if (Array.isArray(provided) && provided.length === 0) {
      missingRequired.push(attr.code);
      errors.push({
        attributeCode: attr.code,
        message: `Required attribute "${attr.code}" has no values`,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    missingRequired,
    invalidValues,
  };
}

/**
 * Get all leaf categories (categories without children) as flat paths.
 * Useful for listing all available categories.
 */
export function getAllLeafCategories(
  root: CategoryNode
): Array<{ path: string[]; labels: string[]; treeId: number }> {
  const results: Array<{ path: string[]; labels: string[]; treeId: number }> = [];

  function traverse(node: CategoryNode, pathCodes: string[], pathLabels: string[]) {
    const currentPath = [...pathCodes, node.code];
    const currentLabels = [...pathLabels, node.label];

    if (!node.children || node.children.length === 0) {
      results.push({ path: currentPath, labels: currentLabels, treeId: node.treeId });
    } else {
      for (const child of node.children) {
        traverse(child, currentPath, currentLabels);
      }
    }
  }

  // Start from root's children (skip root itself)
  if (root.children) {
    for (const child of root.children) {
      traverse(child, [], []);
    }
  }

  return results;
}

/**
 * Search categories by label (case-insensitive).
 */
export function searchCategories(
  root: CategoryNode,
  query: string
): Array<{ path: string[]; labels: string[]; treeId: number }> {
  const all = getAllLeafCategories(root);
  const lowerQuery = query.toLowerCase();

  return all.filter(({ labels }) =>
    labels.some((label) => label.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Get category path by treeId.
 */
export function findCategoryByTreeId(
  root: CategoryNode,
  targetTreeId: number
): { path: string[]; labels: string[] } | null {
  function traverse(
    node: CategoryNode,
    pathCodes: string[],
    pathLabels: string[]
  ): { path: string[]; labels: string[] } | null {
    const currentPath = [...pathCodes, node.code];
    const currentLabels = [...pathLabels, node.label];

    if (node.treeId === targetTreeId) {
      return { path: currentPath, labels: currentLabels };
    }

    if (node.children) {
      for (const child of node.children) {
        const result = traverse(child, currentPath, currentLabels);
        if (result) return result;
      }
    }

    return null;
  }

  // Check root first
  if (root.treeId === targetTreeId) {
    return { path: [root.code], labels: [root.label] };
  }

  // Search children
  if (root.children) {
    for (const child of root.children) {
      const result = traverse(child, [], []);
      if (result) return result;
    }
  }

  return null;
}

// Common attribute codes used across categories
export const COMMON_ATTRIBUTES = {
  CONDITION: "Zustand",
  DELIVERY: "Uebergabe",
  LANGUAGE: "LANGUAGE",
  YEAR: "YEAR",
} as const;

// Common condition values
export const CONDITION_VALUES = {
  NEW: "neu",
  USED: "gebraucht",
  DEFECT: "defekt",
} as const;

// Common delivery values
export const DELIVERY_VALUES = {
  PICKUP: "PICKUP",
  SHIPPING: "Versand",
} as const;

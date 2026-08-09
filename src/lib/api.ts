export const BACKEND_URL = 'https://happy-baby-seven.vercel.app';
const PRODUCTS_ENDPOINT = `${BACKEND_URL}/api/products`;

export type ProductVertical = 'kids' | 'men' | 'women';

export type SizeEntry = { size: string; quantity: number; available: boolean };

export type Product = {
  id: number;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  tag?: string;
  category: string;
  vertical: ProductVertical;
  emoji: string;
  color: string;
  image?: string;
  stock: number;
  // Only populated for products created/updated via the Excel catalog
  // import on the backend -- manually added products won't have these.
  sizes?: SizeEntry[];
  inStock?: boolean;
  // Variant grouping (Amazon-style color swatches under one listing).
  // Undefined for products that aren't part of a group.
  productGroupId?: number;
  // The product's actual color (e.g. "Blue Stripes") -- distinct from
  // `color` above, which is a card-theming class, not a real attribute.
  variantColor?: string;
};

// Only present on entries returned by GET /api/products (the shop-grid
// listing), which now collapses each ProductGroup down to one representative
// variant. Absent on a single product fetched via GET /api/products/:id.
export type ProductListItem = Product & { variantCount: number };

export type ProductGroup = {
  id: number;
  name: string;
  vertical: ProductVertical;
  category: string;
  description?: string;
};

export type ProductGroupDetail = {
  group: ProductGroup;
  variants: Product[];
};

export type FetchProductsParams = {
  /** Free-text match against product name, description, and category. */
  search?: string;
  category?: string;
  vertical?: ProductVertical;
};

/**
 * The backend only filters server-side by `vertical`; `search` and `category`
 * are accepted but currently ignored, so we also apply them client-side to
 * keep this function correct regardless of backend behavior. Returns one
 * entry per ProductGroup (a representative variant + `variantCount`) plus
 * one entry per ungrouped product -- not one row per color.
 */
export async function fetchProducts(params: FetchProductsParams = {}): Promise<ProductListItem[]> {
  const query = new URLSearchParams();
  if (params.vertical) query.set('vertical', params.vertical);
  if (params.category) query.set('category', params.category);
  if (params.search) query.set('search', params.search);

  const queryString = query.toString();
  const response = await fetch(`${PRODUCTS_ENDPOINT}${queryString ? `?${queryString}` : ''}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch products (${response.status})`);
  }

  const products: ProductListItem[] = await response.json();
  return products.filter((product) => matchesFilters(product, params));
}

function matchesFilters(product: Product, { search, category, vertical }: FetchProductsParams): boolean {
  if (vertical && product.vertical !== vertical) return false;
  if (category && product.category !== category) return false;

  const query = search?.trim().toLowerCase();
  if (query) {
    const haystack = `${product.name} ${product.description} ${product.category}`.toLowerCase();
    if (!haystack.includes(query)) return false;
  }

  return true;
}

export async function fetchProductById(id: number): Promise<Product | null> {
  const response = await fetch(`${PRODUCTS_ENDPOINT}/${id}`);

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Failed to fetch product (${response.status})`);
  }

  return response.json();
}

/** All color variants within a ProductGroup, for a product-detail page's swatch picker. */
export async function fetchProductGroup(groupId: number): Promise<ProductGroupDetail | null> {
  const response = await fetch(`${PRODUCTS_ENDPOINT}/group/${groupId}`);

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Failed to fetch product group (${response.status})`);
  }

  return response.json();
}

/** Resolves a product's `image` field (a relative path) to an absolute URL. */
export function getProductImageUrl(product: Pick<Product, 'image'>): string | undefined {
  if (!product.image) return undefined;
  return product.image.startsWith('http') ? product.image : `${BACKEND_URL}${product.image}`;
}

export const BACKEND_URL = 'https://happy-baby-seven.vercel.app';
const PRODUCTS_ENDPOINT = `${BACKEND_URL}/api/products`;

export type ProductVertical = 'kids' | 'men' | 'women';

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
 * keep this function correct regardless of backend behavior.
 */
export async function fetchProducts(params: FetchProductsParams = {}): Promise<Product[]> {
  const query = new URLSearchParams();
  if (params.vertical) query.set('vertical', params.vertical);
  if (params.category) query.set('category', params.category);
  if (params.search) query.set('search', params.search);

  const queryString = query.toString();
  const response = await fetch(`${PRODUCTS_ENDPOINT}${queryString ? `?${queryString}` : ''}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch products (${response.status})`);
  }

  const products: Product[] = await response.json();
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

/** Resolves a product's `image` field (a relative path) to an absolute URL. */
export function getProductImageUrl(product: Pick<Product, 'image'>): string | undefined {
  if (!product.image) return undefined;
  return product.image.startsWith('http') ? product.image : `${BACKEND_URL}${product.image}`;
}

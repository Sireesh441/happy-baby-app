import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { Product } from '@/lib/api';

const WISHLIST_STORAGE_KEY = 'happybaby.wishlist.v1';

export type WishlistItem = {
  productId: number;
  product: Product;
};

type WishlistContextValue = {
  items: WishlistItem[];
  isLoaded: boolean;
  isWishlisted: (productId: number) => boolean;
  toggleWishlist: (product: Product) => void;
  removeItem: (productId: number) => void;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(WISHLIST_STORAGE_KEY)
      .then((raw) => {
        if (raw) setItems(JSON.parse(raw));
      })
      .catch(() => {})
      .finally(() => setIsLoaded(true));
  }, []);

  useEffect(() => {
    // Skip the write until the initial load resolves, otherwise this fires with
    // the default empty state first and wipes out whatever was persisted.
    if (!isLoaded) return;
    AsyncStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(items)).catch(() => {});
  }, [items, isLoaded]);

  const wishlistedIds = useMemo(() => new Set(items.map((item) => item.productId)), [items]);

  function isWishlisted(productId: number) {
    return wishlistedIds.has(productId);
  }

  function toggleWishlist(product: Product) {
    setItems((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (existing) {
        return current.filter((item) => item.productId !== product.id);
      }
      return [...current, { productId: product.id, product }];
    });
  }

  function removeItem(productId: number) {
    setItems((current) => current.filter((item) => item.productId !== productId));
  }

  return (
    <WishlistContext.Provider value={{ items, isLoaded, isWishlisted, toggleWishlist, removeItem }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}

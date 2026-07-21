import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { Product } from '@/lib/api';

const CART_STORAGE_KEY = 'happybaby.cart.v1';

export type CartLine = {
  productId: number;
  quantity: number;
  product: Product;
};

type CartContextValue = {
  lines: CartLine[];
  itemCount: number;
  subtotal: number;
  isLoaded: boolean;
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(CART_STORAGE_KEY)
      .then((raw) => {
        if (raw) setLines(JSON.parse(raw));
      })
      .catch(() => {})
      .finally(() => setIsLoaded(true));
  }, []);

  useEffect(() => {
    // Skip the write until the initial load resolves, otherwise this fires with
    // the default empty state first and wipes out whatever was persisted.
    if (!isLoaded) return;
    AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines)).catch(() => {});
  }, [lines, isLoaded]);

  function addItem(product: Product, quantity = 1) {
    setLines((current) => {
      const existing = current.find((line) => line.productId === product.id);
      if (existing) {
        return current.map((line) =>
          line.productId === product.id ? { ...line, quantity: line.quantity + quantity } : line
        );
      }
      return [...current, { productId: product.id, quantity, product }];
    });
  }

  function removeItem(productId: number) {
    setLines((current) => current.filter((line) => line.productId !== productId));
  }

  function updateQuantity(productId: number, quantity: number) {
    setLines((current) =>
      quantity <= 0
        ? current.filter((line) => line.productId !== productId)
        : current.map((line) => (line.productId === productId ? { ...line, quantity } : line))
    );
  }

  function clearCart() {
    setLines([]);
  }

  const { itemCount, subtotal } = useMemo(
    () => ({
      itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
      subtotal: lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0),
    }),
    [lines]
  );

  return (
    <CartContext.Provider
      value={{ lines, itemCount, subtotal, isLoaded, addItem, removeItem, updateQuantity, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

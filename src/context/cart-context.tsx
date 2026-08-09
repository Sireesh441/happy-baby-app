import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { BulkBreakdownDisplayEntry, Product } from '@/lib/api';

const CART_STORAGE_KEY = 'happybaby.cart.v1';

export type SingleCartLine = {
  type: 'single';
  productId: number;
  quantity: number;
  product: Product;
};

// A wholesale bulk pack built via the product detail screen's pack picker.
// Purely a local/client-side concept until checkout -- there is no server
// cart on this app (see CartProvider below), so `id` is a locally-generated
// key just for React list identity and removal, not a database id.
// `pricePerUnit` here is a best-effort display price computed from the
// ProductGroup's bulkPricing at add-time; the actual charge is always
// re-resolved server-side at order-creation time from the group's current
// bulkPricing, same discipline as retail items never trusting a
// client-submitted price either.
export type BulkCartLine = {
  type: 'bulk';
  id: string;
  productGroupId: number;
  productGroupName: string;
  packSize: 5 | 10;
  quantity: number;
  pricePerUnit: number;
  breakdownDisplay: BulkBreakdownDisplayEntry[];
};

export type CartLine = SingleCartLine | BulkCartLine;

export type AddBulkPackInput = {
  productGroupId: number;
  productGroupName: string;
  packSize: 5 | 10;
  pricePerUnit: number;
  breakdownDisplay: BulkBreakdownDisplayEntry[];
};

type CartContextValue = {
  lines: CartLine[];
  itemCount: number;
  subtotal: number;
  isLoaded: boolean;
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  addBulkPack: (pack: AddBulkPackInput) => void;
  removeBulkLine: (id: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function makeBulkLineId(): string {
  return `bulk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

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
      const existing = current.find((line) => line.type === 'single' && line.productId === product.id);
      if (existing) {
        return current.map((line) =>
          line.type === 'single' && line.productId === product.id
            ? { ...line, quantity: line.quantity + quantity }
            : line
        );
      }
      return [...current, { type: 'single', productId: product.id, quantity, product }];
    });
  }

  function removeItem(productId: number) {
    setLines((current) => current.filter((line) => !(line.type === 'single' && line.productId === productId)));
  }

  function updateQuantity(productId: number, quantity: number) {
    setLines((current) =>
      quantity <= 0
        ? current.filter((line) => !(line.type === 'single' && line.productId === productId))
        : current.map((line) => (line.type === 'single' && line.productId === productId ? { ...line, quantity } : line))
    );
  }

  // Each call adds a new pack line (one pack) -- a wholesale buyer might add
  // several different custom mixes, so there's no natural key to merge on
  // the way single-product lines merge by productId.
  function addBulkPack(pack: AddBulkPackInput) {
    setLines((current) => [
      ...current,
      {
        type: 'bulk',
        id: makeBulkLineId(),
        productGroupId: pack.productGroupId,
        productGroupName: pack.productGroupName,
        packSize: pack.packSize,
        quantity: 1,
        pricePerUnit: pack.pricePerUnit,
        breakdownDisplay: pack.breakdownDisplay,
      },
    ]);
  }

  function removeBulkLine(id: string) {
    setLines((current) => current.filter((line) => !(line.type === 'bulk' && line.id === id)));
  }

  function clearCart() {
    setLines([]);
  }

  const { itemCount, subtotal } = useMemo(
    () => ({
      itemCount: lines.reduce((sum, line) => sum + (line.type === 'bulk' ? line.packSize * line.quantity : line.quantity), 0),
      subtotal: lines.reduce(
        (sum, line) =>
          sum + (line.type === 'bulk' ? line.pricePerUnit * line.packSize * line.quantity : line.product.price * line.quantity),
        0
      ),
    }),
    [lines]
  );

  return (
    <CartContext.Provider
      value={{
        lines,
        itemCount,
        subtotal,
        isLoaded,
        addItem,
        removeItem,
        updateQuantity,
        addBulkPack,
        removeBulkLine,
        clearCart,
      }}>
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

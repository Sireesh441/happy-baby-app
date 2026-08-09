import { BACKEND_URL } from '@/lib/api';
import type { BulkBreakdownDisplayEntry, BulkBreakdownEntry } from '@/lib/api';

export type ShippingAddress = {
  name: string;
  phone: string;
  line1: string;
  city: string;
  state: string;
  pincode: string;
};

export type RetailOrderItem = {
  type?: 'retail';
  id: number;
  name: string;
  quantity: number;
  price: number;
  image?: string;
  emoji: string;
  color: string;
};

// A wholesale bulk pack placed as one order line. `pricePerUnit` and
// `breakdownDisplay` are resolved and snapshotted server-side at
// order-creation time -- happy-baby's POST /api/orders never trusts
// whatever price this app might send, same as it never has for retail
// items either.
export type BulkOrderItem = {
  type: 'bulk';
  productGroupId: number;
  productGroupName: string;
  packSize: number;
  // Number of packs purchased (each pack itself contains `packSize` units).
  quantity: number;
  pricePerUnit: number;
  breakdownDisplay: BulkBreakdownDisplayEntry[];
};

export type OrderItem = RetailOrderItem | BulkOrderItem;

export type Order = {
  id: number;
  userId: number | null;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  total: number;
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  createdAt: string;
};

export type RazorpayOrderResponse = {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
};

async function parseJson<T>(response: Response, fallback: string): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error ?? fallback);
  }
  return data;
}

export async function createRazorpayOrder(token: string, amount: number): Promise<RazorpayOrderResponse> {
  const response = await fetch(`${BACKEND_URL}/api/razorpay/create-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ amount }),
  });
  return parseJson(response, 'Could not start payment. Please try again.');
}

export type RetailOrderItemInput = { productId: number; quantity: number };

// Matches happy-baby's POST /api/orders bulk-item shape exactly -- no price
// field, on purpose: the backend re-resolves pricePerUnit itself from the
// ProductGroup's current bulkPricing and ignores anything else sent here.
export type BulkOrderItemInput = {
  type: 'bulk';
  productGroupId: number;
  packSize: 5 | 10;
  breakdown: BulkBreakdownEntry[];
  packs?: number;
};

export type OrderItemInput = RetailOrderItemInput | BulkOrderItemInput;

export type PlaceOrderInput = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  items: OrderItemInput[];
  shippingAddress: ShippingAddress;
};

export async function placeOrder(token: string, input: PlaceOrderInput): Promise<Order> {
  const response = await fetch(`${BACKEND_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  return parseJson(response, 'Could not place your order. Please try again.');
}

export async function fetchOrderById(token: string, orderId: number): Promise<Order | null> {
  const response = await fetch(`${BACKEND_URL}/api/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.status === 404) return null;
  return parseJson(response, 'Could not load order details.');
}

export async function fetchOrders(token: string): Promise<Order[]> {
  const response = await fetch(`${BACKEND_URL}/api/orders`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJson(response, 'Could not load your orders.');
}

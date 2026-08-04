import { BACKEND_URL } from '@/lib/api';

export type ShippingAddress = {
  name: string;
  phone: string;
  line1: string;
  city: string;
  state: string;
  pincode: string;
};

export type OrderItem = {
  id: number;
  name: string;
  quantity: number;
  price: number;
  image?: string;
  emoji: string;
  color: string;
};

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

export type PlaceOrderInput = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  items: { productId: number; quantity: number }[];
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

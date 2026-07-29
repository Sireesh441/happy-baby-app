import { BACKEND_URL } from '@/lib/api';

export type Address = {
  id: number;
  userId: number;
  name: string;
  phone: string;
  line1: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
  createdAt: string;
};

export type NewAddressInput = {
  name: string;
  phone: string;
  line1: string;
  city: string;
  state: string;
  pincode: string;
};

async function parseJson<T>(response: Response, fallback: string): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error ?? fallback);
  }
  return data;
}

export async function fetchAddresses(token: string): Promise<Address[]> {
  const response = await fetch(`${BACKEND_URL}/api/addresses`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJson(response, 'Could not load saved addresses.');
}

export async function createAddress(token: string, input: NewAddressInput): Promise<Address> {
  const response = await fetch(`${BACKEND_URL}/api/addresses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  return parseJson(response, 'Could not save this address.');
}

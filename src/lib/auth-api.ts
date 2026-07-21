import { BACKEND_URL } from '@/lib/api';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

type AuthResponse = {
  token: string;
  user: AuthUser;
};

async function parseAuthResponse(response: Response): Promise<AuthResponse> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error ?? 'Something went wrong. Please try again.');
  }
  return data;
}

export async function loginRequest(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${BACKEND_URL}/api/mobile-auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return parseAuthResponse(response);
}

export async function signupRequest(name: string, email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${BACKEND_URL}/api/mobile-auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  return parseAuthResponse(response);
}

/** Verifies a stored token against the backend; returns null if it's missing, invalid, or expired. */
export async function fetchMe(token: string): Promise<AuthUser | null> {
  const response = await fetch(`${BACKEND_URL}/api/mobile-auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return null;
  const data = await response.json().catch(() => null);
  return data?.user ?? null;
}

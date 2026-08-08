import type { ImagePickerAsset } from 'expo-image-picker';
import { Platform } from 'react-native';

export const RETURNS_SERVICE_URL = 'https://happy-baby-returns-protection-production.up.railway.app';

export type ReturnCaseStatus = 'proof_pending' | 'proof_complete' | 'dispute_open' | 'resolved';

export type ProofRecord = {
  id: number;
  returnCaseId: number;
  type: 'packing' | 'unboxing';
  mediaUrl: string;
  uploadedBy: string;
  uploadedAt: string;
};

export type ReturnCase = {
  id: number;
  orderId: number;
  itemId: number;
  status: ReturnCaseStatus;
  createdAt: string;
  proofRecords: ProofRecord[];
};

async function parseJson<T>(response: Response, fallback: string): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error ?? fallback);
  }
  return data;
}

export async function createReturnCase(token: string, orderId: number, itemId: number): Promise<ReturnCase> {
  const response = await fetch(`${RETURNS_SERVICE_URL}/api/return-cases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ orderId, itemId }),
  });
  return parseJson(response, 'Could not start a return for this item.');
}

export async function fetchReturnCases(token: string, orderId: number): Promise<ReturnCase[]> {
  const response = await fetch(`${RETURNS_SERVICE_URL}/api/return-cases/${orderId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJson(response, 'Could not load return status.');
}

/** Only "unboxing" is ever used from the mobile app -- "packing" proof is admin-only. */
export async function uploadUnboxingProof(
  token: string,
  returnCaseId: number,
  file: ImagePickerAsset
): Promise<ProofRecord> {
  const formData = new FormData();
  formData.append('returnCaseId', String(returnCaseId));
  formData.append('type', 'unboxing');

  const isVideo = file.type === 'video';
  if (Platform.OS === 'web' && file.file) {
    formData.append('file', file.file, file.file.name || (isVideo ? 'proof.mp4' : 'proof.jpg'));
  } else {
    // On native, RN's fetch/FormData polyfill expects this {uri, name, type} shape.
    formData.append('file', {
      uri: file.uri,
      name: file.fileName ?? (isVideo ? 'proof.mp4' : 'proof.jpg'),
      type: file.mimeType ?? (isVideo ? 'video/mp4' : 'image/jpeg'),
    } as unknown as Blob);
  }

  const response = await fetch(`${RETURNS_SERVICE_URL}/api/proof`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  return parseJson(response, 'Could not upload return proof.');
}

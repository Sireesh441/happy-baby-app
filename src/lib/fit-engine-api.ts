import type { ImagePickerAsset } from 'expo-image-picker';
import { Platform } from 'react-native';

export const FIT_ENGINE_URL = 'https://happy-baby-fit-engine-production.up.railway.app';

export type PersonProfile = {
  id: number;
  userId: string;
  name: string;
  relation: string;
  dateOfBirth: string | null;
  age: number | null;
  heightCm: number | null;
  weightKg: number | null;
  chestCm: number | null;
  waistCm: number | null;
  hipCm: number | null;
  inseamCm: number | null;
  photoUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PersonProfileInput = {
  name: string;
  relation: string;
  dateOfBirth?: string;
  age?: number;
  heightCm?: number;
  weightKg?: number;
  chestCm?: number;
  waistCm?: number;
  hipCm?: number;
  inseamCm?: number;
};

export type SizeChartEntry = {
  size: string;
  heightCm?: [number, number];
  weightKg?: [number, number];
  chestCm?: [number, number];
  waistCm?: [number, number];
  hipCm?: [number, number];
  inseamCm?: [number, number];
};

export type FitScoreResult = {
  recommendedSize: string;
  matchScorePercent: number;
  scoresBySize: { size: string; matchScorePercent: number; measurementsUsed: string[] }[];
  measurementsUsed: string[];
  estimatedDimensions: string[];
};

async function parseJson<T>(response: Response, fallback: string): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error ?? fallback);
  }
  return data;
}

export async function fetchPersonProfiles(token: string): Promise<PersonProfile[]> {
  const response = await fetch(`${FIT_ENGINE_URL}/api/person-profiles`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJson(response, 'Could not load My People.');
}

export async function createPersonProfile(token: string, input: PersonProfileInput): Promise<PersonProfile> {
  const response = await fetch(`${FIT_ENGINE_URL}/api/person-profiles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  return parseJson(response, 'Could not add this person.');
}

export async function updatePersonProfile(
  token: string,
  id: number,
  input: Partial<PersonProfileInput>
): Promise<PersonProfile> {
  const response = await fetch(`${FIT_ENGINE_URL}/api/person-profiles/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  return parseJson(response, 'Could not update this person.');
}

export async function deletePersonProfile(token: string, id: number): Promise<void> {
  const response = await fetch(`${FIT_ENGINE_URL}/api/person-profiles/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error ?? 'Could not remove this person.');
  }
}

export async function uploadPersonPhoto(token: string, id: number, photo: ImagePickerAsset): Promise<PersonProfile> {
  const formData = new FormData();
  if (Platform.OS === 'web' && photo.file) {
    // On web, expo-image-picker returns the underlying File directly.
    formData.append('file', photo.file, photo.file.name || 'photo.jpg');
  } else {
    // On native, RN's fetch/FormData polyfill expects this {uri, name, type} shape.
    formData.append('file', {
      uri: photo.uri,
      name: photo.fileName ?? 'photo.jpg',
      type: photo.mimeType ?? 'image/jpeg',
    } as unknown as Blob);
  }

  const response = await fetch(`${FIT_ENGINE_URL}/api/person-profiles/${id}/photo`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  return parseJson(response, 'Could not save this photo.');
}

export async function fetchFitScore(
  token: string,
  input: { personProfileId: number; sizeChart: SizeChartEntry[] }
): Promise<FitScoreResult> {
  const response = await fetch(`${FIT_ENGINE_URL}/api/fit-score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  return parseJson(response, 'Could not calculate fit confidence.');
}

export const FIT_ENGINE_URL = 'https://happy-baby-fit-engine-production.up.railway.app';

export type FamilyProfile = {
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
  createdAt: string;
  updatedAt: string;
};

export type FamilyProfileInput = {
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

export async function fetchFamilyProfiles(token: string): Promise<FamilyProfile[]> {
  const response = await fetch(`${FIT_ENGINE_URL}/api/family-profiles`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJson(response, 'Could not load family members.');
}

export async function createFamilyProfile(token: string, input: FamilyProfileInput): Promise<FamilyProfile> {
  const response = await fetch(`${FIT_ENGINE_URL}/api/family-profiles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  return parseJson(response, 'Could not add this family member.');
}

export async function updateFamilyProfile(
  token: string,
  id: number,
  input: Partial<FamilyProfileInput>
): Promise<FamilyProfile> {
  const response = await fetch(`${FIT_ENGINE_URL}/api/family-profiles/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  return parseJson(response, 'Could not update this family member.');
}

export async function deleteFamilyProfile(token: string, id: number): Promise<void> {
  const response = await fetch(`${FIT_ENGINE_URL}/api/family-profiles/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error ?? 'Could not remove this family member.');
  }
}

export async function fetchFitScore(
  token: string,
  input: { familyProfileId: number; sizeChart: SizeChartEntry[] }
): Promise<FitScoreResult> {
  const response = await fetch(`${FIT_ENGINE_URL}/api/fit-score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  return parseJson(response, 'Could not calculate fit confidence.');
}

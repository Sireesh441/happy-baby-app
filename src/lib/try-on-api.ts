import type { ImagePickerAsset } from 'expo-image-picker';
import { Platform } from 'react-native';

import { BACKEND_URL } from '@/lib/api';

function appendPhoto(formData: FormData, photo: ImagePickerAsset) {
  if (Platform.OS === 'web' && photo.file) {
    // On web, expo-image-picker returns the underlying File directly.
    formData.append('photo', photo.file, photo.file.name || 'photo.jpg');
  } else {
    // On native, RN's fetch/FormData polyfill expects this {uri, name, type} shape.
    formData.append('photo', {
      uri: photo.uri,
      name: 'photo.jpg',
      type: photo.mimeType ?? 'image/jpeg',
    } as unknown as Blob);
  }
}

async function postTryOn(formData: FormData, token: string): Promise<{ imageUrl: string }> {
  const response = await fetch(`${BACKEND_URL}/api/try-on`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    // happy-baby's /api/try-on forwards tryon-service's own 422 message
    // verbatim when the photo itself couldn't be processed (e.g. its
    // self-hosted provider's NSFW-placeholder detection) -- that message
    // is already written for an end user ("This photo couldn't be
    // processed, please try a different photo."), so it's used as-is
    // rather than being replaced with a generic fallback.
    throw new Error(data.error ?? 'Something went wrong generating your try-on. Please try again.');
  }
  return data;
}

export async function requestTryOn(
  token: string,
  productId: number,
  photo: ImagePickerAsset
): Promise<{ imageUrl: string }> {
  const formData = new FormData();
  formData.append('productId', String(productId));
  appendPhoto(formData, photo);
  return postTryOn(formData, token);
}

/** Outfit try-on: a top and a bottom composited onto the person in one call. */
export async function requestOutfitTryOn(
  token: string,
  upperProductId: number,
  lowerProductId: number,
  photo: ImagePickerAsset
): Promise<{ imageUrl: string }> {
  const formData = new FormData();
  formData.append('upperProductId', String(upperProductId));
  formData.append('lowerProductId', String(lowerProductId));
  appendPhoto(formData, photo);
  return postTryOn(formData, token);
}

import type { ImagePickerAsset } from 'expo-image-picker';
import { Platform } from 'react-native';

import { BACKEND_URL } from '@/lib/api';

export async function requestTryOn(
  token: string,
  productId: number,
  photo: ImagePickerAsset
): Promise<{ imageUrl: string }> {
  const formData = new FormData();
  formData.append('productId', String(productId));

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

  const response = await fetch(`${BACKEND_URL}/api/try-on`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error ?? 'Something went wrong generating your try-on. Please try again.');
  }
  return data;
}

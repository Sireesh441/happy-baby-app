import { File, Paths } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { Platform } from 'react-native';

/**
 * expo-media-library has no web implementation (there's no OS "gallery" concept
 * in a browser), so on web this instead triggers a normal file download.
 */
export async function saveImageToGallery(imageUrl: string): Promise<void> {
  if (Platform.OS === 'web') {
    const blob = await (await fetch(imageUrl)).blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = 'try-on-result.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
    return;
  }

  const permission = await MediaLibrary.requestPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Permission to save photos was denied.');
  }

  const downloaded = await File.downloadFileAsync(imageUrl, Paths.cache);
  await MediaLibrary.saveToLibraryAsync(downloaded.uri);
}

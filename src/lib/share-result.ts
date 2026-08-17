import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export type ShareOutcome = 'shared' | 'downloaded';

/**
 * Shares an image URI (as produced by react-native-view-shot's captureRef)
 * through the OS share sheet.
 *
 * expo-sharing has no real web implementation of its own -- its web shim
 * only forwards a `url` string to `navigator.share`, which can't carry an
 * actual image file. So on web this instead uses the Web Share API's
 * file-sharing path directly (`navigator.canShare({ files })`), matching
 * how most mobile browsers let you share an image to WhatsApp/Instagram/etc,
 * and falls back to triggering a plain download (same pattern as
 * save-image.ts's web branch) when the browser has neither.
 */
export async function shareImageUri(uri: string, filename: string): Promise<ShareOutcome> {
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    const file = new File([blob], filename, { type: blob.type || 'image/png' });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Happy Shopping' });
      return 'shared';
    }

    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
    return 'downloaded';
  }

  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Sharing is not available on this device.');
  }
  await Sharing.shareAsync(uri);
  return 'shared';
}

import type { RefObject } from 'react';
import { Platform, type View } from 'react-native';
import { captureRef, type CaptureOptions } from 'react-native-view-shot';

/**
 * react-native-view-shot's own captureRef() unconditionally calls React
 * Native's findNodeHandle() after resolving ref.current -- and
 * react-native-web's findNodeHandle() always throws
 * ("findNodeHandle is not supported on web. Use the ref property on the
 * component instead."), even though the library ships its own working web
 * implementation (RNViewShot.web.js, backed by html2canvas). That web
 * implementation is unreachable through the public captureRef() export
 * because of this -- confirmed live via a real Share tap on web, not just
 * inferred from reading the source. Worked around by calling html2canvas
 * directly on web (the same thing RNViewShot.web.js does internally,
 * bypassing the broken findNodeHandle call) and only using the library's
 * own captureRef on native, where this bug doesn't apply.
 */
export async function captureViewAsUri(ref: RefObject<View | null>, options: CaptureOptions): Promise<string> {
  if (Platform.OS === 'web') {
    const node = ref.current as unknown as HTMLElement | null;
    if (!node) throw new Error('Nothing to capture.');
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(node);
    return canvas.toDataURL(`image/${options.format ?? 'png'}`, options.quality);
  }
  return captureRef(ref, options);
}

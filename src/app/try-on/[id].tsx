import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProductThumbnail } from '@/components/product-thumbnail';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { fetchProductById, type Product } from '@/lib/api';
import { saveImageToGallery } from '@/lib/save-image';
import { requestTryOn } from '@/lib/try-on-api';
import { useTheme } from '@/hooks/use-theme';

type TryOnStatus = 'picking' | 'uploading' | 'result' | 'error';

export default function TryOnScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { user, token, isLoading: isAuthLoading } = useAuth();

  const productId = rawId ? Number(rawId) : NaN;

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoadingProduct, setIsLoadingProduct] = useState(true);
  const [status, setStatus] = useState<TryOnStatus>('picking');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Defensive guard for direct deep links to this screen while logged out —
  // the normal entry point (product detail) already redirects guests to login.
  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace({ pathname: '/login', params: { redirectTo: `/try-on/${rawId}` } });
    }
  }, [isAuthLoading, user, router, rawId]);

  useEffect(() => {
    // Reset everything from a previous product's attempt — otherwise a stale
    // result/error from product A can still be showing after navigating
    // straight to product B's try-on screen.
    setProduct(null);
    setStatus('picking');
    setErrorMessage(null);
    setResultImageUrl(null);
    setSaveMessage(null);

    if (!Number.isFinite(productId)) {
      setIsLoadingProduct(false);
      return;
    }
    let cancelled = false;
    setIsLoadingProduct(true);
    fetchProductById(productId)
      .then((result) => {
        if (!cancelled) setProduct(result);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingProduct(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  async function handlePhotoSelected(asset: ImagePicker.ImagePickerAsset) {
    if (!token || !product) return;
    setStatus('uploading');
    setErrorMessage(null);
    try {
      const { imageUrl } = await requestTryOn(token, product.id, asset);
      setResultImageUrl(imageUrl);
      setStatus('result');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong.');
      setStatus('error');
    }
  }

  async function handleTakePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setErrorMessage('Camera permission is required to take a photo.');
      setStatus('error');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets?.[0]) {
      await handlePhotoSelected(result.assets[0]);
    }
  }

  async function handleChooseFromGallery() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setErrorMessage('Photo library permission is required.');
      setStatus('error');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets?.[0]) {
      await handlePhotoSelected(result.assets[0]);
    }
  }

  async function handleSave() {
    if (!resultImageUrl) return;
    setIsSaving(true);
    setSaveMessage(null);
    try {
      await saveImageToGallery(resultImageUrl);
      setSaveMessage(Platform.OS === 'web' ? 'Downloaded ✓' : 'Saved to your photos ✓');
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : 'Could not save this image.');
    } finally {
      setIsSaving(false);
    }
  }

  function handleTryAnother() {
    setStatus('picking');
    setResultImageUrl(null);
    setErrorMessage(null);
    setSaveMessage(null);
  }

  if (isAuthLoading || isLoadingProduct) {
    return (
      <ThemedView style={styles.statusContainer}>
        <Stack.Screen options={{ title: 'Try It On' }} />
        <ActivityIndicator color={theme.textSecondary} />
      </ThemedView>
    );
  }

  if (!product) {
    return (
      <ThemedView style={styles.statusContainer}>
        <Stack.Screen options={{ title: 'Try It On' }} />
        <ThemedText themeColor="textSecondary">Product not found.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: `Try It On` }} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {status === 'result' && resultImageUrl ? (
            <>
              <Image source={{ uri: resultImageUrl }} style={styles.resultImage} resizeMode="contain" />
              {saveMessage && (
                <ThemedText themeColor="textSecondary" style={styles.saveMessage}>
                  {saveMessage}
                </ThemedText>
              )}
              <Pressable
                onPress={handleSave}
                disabled={isSaving}
                style={[styles.primaryButton, isSaving && styles.buttonDisabled]}>
                <ThemedText type="smallBold" style={styles.primaryButtonText}>
                  {isSaving ? 'Saving...' : 'Save to Gallery'}
                </ThemedText>
              </Pressable>
              <Pressable onPress={handleTryAnother} style={styles.secondaryButton}>
                <ThemedText type="smallBold">Try Another</ThemedText>
              </Pressable>
            </>
          ) : status === 'uploading' ? (
            <View style={styles.centered}>
              <ActivityIndicator color={theme.textSecondary} />
              <ThemedText themeColor="textSecondary" style={styles.uploadingText}>
                Creating your look...
              </ThemedText>
            </View>
          ) : (
            <>
              <ProductThumbnail product={product} size={96} style={styles.garmentThumbnail} />
              <ThemedText type="smallBold" style={styles.heading}>
                {product.name}
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.subheading}>
                Take a photo or choose one from your gallery to see how this looks on you.
              </ThemedText>

              {status === 'error' && errorMessage && (
                <ThemedText style={styles.error}>{errorMessage}</ThemedText>
              )}

              <Pressable onPress={handleTakePhoto} style={styles.primaryButton}>
                <ThemedText type="smallBold" style={styles.primaryButtonText}>
                  Take Photo
                </ThemedText>
              </Pressable>
              <Pressable onPress={handleChooseFromGallery} style={styles.secondaryButton}>
                <ThemedText type="smallBold">Choose from Gallery</ThemedText>
              </Pressable>
            </>
          )}
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statusContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
    gap: Spacing.one,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  uploadingText: {
    marginTop: Spacing.one,
  },
  garmentThumbnail: {
    marginBottom: Spacing.two,
  },
  heading: {
    textAlign: 'center',
  },
  subheading: {
    textAlign: 'center',
    marginBottom: Spacing.four,
  },
  error: {
    color: '#dc2626',
    textAlign: 'center',
    marginBottom: Spacing.three,
  },
  resultImage: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: Spacing.four,
    marginBottom: Spacing.three,
  },
  saveMessage: {
    marginBottom: Spacing.two,
  },
  primaryButton: {
    alignSelf: 'stretch',
    backgroundColor: '#3c87f7',
    borderRadius: Spacing.five,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#ffffff',
  },
  secondaryButton: {
    alignSelf: 'stretch',
    borderRadius: Spacing.five,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
});

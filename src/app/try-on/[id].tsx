import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProductThumbnail } from '@/components/product-thumbnail';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { fetchProductById, fetchProducts, type Product } from '@/lib/api';
import { saveImageToGallery } from '@/lib/save-image';
import { requestOutfitTryOn, requestTryOn } from '@/lib/try-on-api';
import { useTheme } from '@/hooks/use-theme';

type TryOnStatus = 'picking' | 'uploading' | 'result' | 'error';
type TryOnMode = 'single' | 'outfit';
type PickerSlot = 'top' | 'bottom';

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

  const [mode, setMode] = useState<TryOnMode>('single');
  const [topProduct, setTopProduct] = useState<Product | null>(null);
  const [bottomProduct, setBottomProduct] = useState<Product | null>(null);
  const [pickerSlot, setPickerSlot] = useState<PickerSlot | null>(null);
  const [pickerCandidates, setPickerCandidates] = useState<Product[]>([]);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);

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
    setMode('single');
    setTopProduct(null);
    setBottomProduct(null);

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

  // Pre-seed whichever outfit slot this product actually fits, so a shopper
  // who opened try-on from a shirt's product page doesn't have to re-pick
  // the top they already chose if they switch to outfit mode — they only
  // need to pick the complementary piece. Products with no garmentRegion
  // (or "dresses", which isn't a top/bottom) leave both slots empty.
  useEffect(() => {
    if (!product) return;
    if (product.garmentRegion === 'upper_body') {
      setTopProduct(product);
    } else if (product.garmentRegion === 'lower_body') {
      setBottomProduct(product);
    }
  }, [product]);

  async function openPicker(slot: PickerSlot) {
    if (!product) return;
    setPickerSlot(slot);
    setIsLoadingCandidates(true);
    setPickerCandidates([]);
    try {
      const region = slot === 'top' ? 'upper_body' : 'lower_body';
      const results = await fetchProducts({ vertical: product.vertical, category: 'Clothing' });
      setPickerCandidates(results.filter((candidate) => candidate.garmentRegion === region));
    } finally {
      setIsLoadingCandidates(false);
    }
  }

  function selectCandidate(candidate: Product) {
    if (pickerSlot === 'top') {
      setTopProduct(candidate);
    } else if (pickerSlot === 'bottom') {
      setBottomProduct(candidate);
    }
    setPickerSlot(null);
  }

  async function handlePhotoSelected(asset: ImagePicker.ImagePickerAsset) {
    if (!token) return;
    if (mode === 'single' && !product) return;
    if (mode === 'outfit' && (!topProduct || !bottomProduct)) return;

    setStatus('uploading');
    setErrorMessage(null);
    try {
      const { imageUrl } =
        mode === 'outfit'
          ? await requestOutfitTryOn(token, topProduct!.id, bottomProduct!.id, asset)
          : await requestTryOn(token, product!.id, asset);
      setResultImageUrl(imageUrl);
      setStatus('result');
    } catch (err) {
      // Covers both "couldn't reach the provider" (a real failure) and the
      // 422 "this photo couldn't be processed" case (not a failure exactly,
      // but the same recovery applies either way: show why, then let the
      // shopper pick a different photo instead of getting stuck on a
      // broken-looking screen). Status goes back to 'picking'-equivalent
      // ('error' still renders the same Take Photo/Choose from Gallery
      // buttons, just with the message shown above them) rather than any
      // kind of dead end.
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

  const canSubmit = mode === 'single' ? true : Boolean(topProduct && bottomProduct);

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
              <View style={styles.modeToggle}>
                <ModeButton label="Try single item" isActive={mode === 'single'} onPress={() => setMode('single')} />
                <ModeButton label="Try full outfit" isActive={mode === 'outfit'} onPress={() => setMode('outfit')} />
              </View>

              {mode === 'single' ? (
                <>
                  <ProductThumbnail product={product} size={96} style={styles.garmentThumbnail} />
                  <ThemedText type="smallBold" style={styles.heading}>
                    {product.name}
                  </ThemedText>
                  <ThemedText themeColor="textSecondary" style={styles.subheading}>
                    Take a photo or choose one from your gallery to see how this looks on you.
                  </ThemedText>
                </>
              ) : (
                <>
                  <View style={styles.outfitSlots}>
                    <OutfitSlot label="Top" product={topProduct} onPress={() => openPicker('top')} />
                    <OutfitSlot label="Bottom" product={bottomProduct} onPress={() => openPicker('bottom')} />
                  </View>
                  <ThemedText themeColor="textSecondary" style={styles.subheading}>
                    {canSubmit
                      ? 'Take a photo or choose one from your gallery to see this outfit on you.'
                      : 'Pick a top and a bottom to continue.'}
                  </ThemedText>
                </>
              )}

              {status === 'error' && errorMessage && (
                <ThemedText style={styles.error}>{errorMessage}</ThemedText>
              )}

              <Pressable
                onPress={handleTakePhoto}
                disabled={!canSubmit}
                style={[styles.primaryButton, !canSubmit && styles.buttonDisabled]}>
                <ThemedText type="smallBold" style={styles.primaryButtonText}>
                  Take Photo
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={handleChooseFromGallery}
                disabled={!canSubmit}
                style={[styles.secondaryButton, !canSubmit && styles.buttonDisabled]}>
                <ThemedText type="smallBold">Choose from Gallery</ThemedText>
              </Pressable>
            </>
          )}
        </View>
      </SafeAreaView>

      <Modal visible={pickerSlot !== null} animationType="slide" onRequestClose={() => setPickerSlot(null)}>
        <ThemedView style={styles.pickerContainer}>
          <SafeAreaView style={styles.pickerSafeArea}>
            <View style={styles.pickerHeader}>
              <ThemedText type="smallBold">Choose a {pickerSlot === 'top' ? 'top' : 'bottom'}</ThemedText>
              <Pressable onPress={() => setPickerSlot(null)} hitSlop={8}>
                <ThemedText themeColor="textSecondary">Close</ThemedText>
              </Pressable>
            </View>

            {isLoadingCandidates ? (
              <View style={styles.centered}>
                <ActivityIndicator color={theme.textSecondary} />
              </View>
            ) : pickerCandidates.length === 0 ? (
              <View style={styles.centered}>
                <ThemedText themeColor="textSecondary">
                  No {pickerSlot === 'top' ? 'tops' : 'bottoms'} available for this vertical yet.
                </ThemedText>
              </View>
            ) : (
              <FlatList
                data={pickerCandidates}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={styles.pickerList}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => selectCandidate(item)}
                    style={({ pressed }) => [styles.pickerRow, pressed && styles.pickerRowPressed]}>
                    <ProductThumbnail product={item} size={56} />
                    <ThemedText numberOfLines={2} style={styles.pickerRowLabel}>
                      {item.name}
                    </ThemedText>
                  </Pressable>
                )}
              />
            )}
          </SafeAreaView>
        </ThemedView>
      </Modal>
    </ThemedView>
  );
}

function ModeButton({ label, isActive, onPress }: { label: string; isActive: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.modeButton, isActive && styles.modeButtonActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}>
      <ThemedText type={isActive ? 'smallBold' : 'small'} themeColor={isActive ? 'text' : 'textSecondary'}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function OutfitSlot({
  label,
  product,
  onPress,
}: {
  label: string;
  product: Product | null;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.outfitSlot}>
      {product ? (
        <ProductThumbnail product={product} size={72} />
      ) : (
        <View style={[styles.outfitSlotEmpty]}>
          <ThemedText themeColor="textSecondary" style={styles.outfitSlotPlus}>
            +
          </ThemedText>
        </View>
      )}
      <ThemedText type="small" themeColor="textSecondary" style={styles.outfitSlotLabel}>
        {label}
      </ThemedText>
      <ThemedText numberOfLines={1} style={styles.outfitSlotName}>
        {product ? product.name : `Pick a ${label.toLowerCase()}`}
      </ThemedText>
    </Pressable>
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
  modeToggle: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  modeButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.five,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.3)',
  },
  modeButtonActive: {
    backgroundColor: 'rgba(60,135,247,0.12)',
    borderColor: '#3c87f7',
  },
  outfitSlots: {
    flexDirection: 'row',
    gap: Spacing.four,
    marginBottom: Spacing.two,
  },
  outfitSlot: {
    alignItems: 'center',
    gap: Spacing.one,
    width: 110,
  },
  outfitSlotEmpty: {
    width: 72,
    height: 72,
    borderRadius: Spacing.four,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(128,128,128,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outfitSlotPlus: {
    fontSize: 28,
    lineHeight: 30,
  },
  outfitSlotLabel: {
    marginTop: Spacing.one,
  },
  outfitSlotName: {
    textAlign: 'center',
  },
  pickerContainer: {
    flex: 1,
  },
  pickerSafeArea: {
    flex: 1,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
  },
  pickerList: {
    paddingHorizontal: Spacing.five,
    gap: Spacing.three,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  pickerRowPressed: {
    opacity: 0.7,
  },
  pickerRowLabel: {
    flex: 1,
  },
});

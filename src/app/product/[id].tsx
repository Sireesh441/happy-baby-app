import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorState } from '@/components/error-state';
import { FitConfidence } from '@/components/fit-confidence';
import { ProductCard } from '@/components/product-card';
import { ProductImageCarousel } from '@/components/product-image-carousel';
import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useCart } from '@/context/cart-context';
import { useWishlist } from '@/context/wishlist-context';
import { fetchProductById, fetchProductGroup, fetchProducts, getProductImageUrl, type Product } from '@/lib/api';
import { colorNameToHex, swatchNeedsBorder } from '@/lib/color-swatch';

const ADDED_FEEDBACK_DURATION_MS = 1500;
const MAX_RELATED_PRODUCTS = 4;
const LOW_STOCK_THRESHOLD = 5;

export default function ProductDetailScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addItem } = useCart();
  const { user } = useAuth();
  const { isWishlisted, toggleWishlist } = useWishlist();

  const productId = rawId ? Number(rawId) : NaN;

  // `product` is whatever was loaded for the routed :id -- stays stable
  // across a color swap so "related products" doesn't refetch/flicker every
  // time a swatch is tapped. `variants` holds every color in the same
  // ProductGroup (just `[product]` when it isn't grouped), and
  // `selectedVariantId` + `activeProduct` (below) track which one is
  // currently on screen. Tapping a swatch only ever touches
  // `selectedVariantId` -- no navigation, no refetch of `product` itself,
  // matching the "switch in place like Amazon" requirement.
  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<Product[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | undefined>(undefined);
  const [retryKey, setRetryKey] = useState(0);

  const activeProduct = useMemo(
    () => variants.find((variant) => variant.id === selectedVariantId) ?? product,
    [variants, selectedVariantId, product]
  );

  useEffect(() => {
    if (!Number.isFinite(productId)) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setHasError(false);
    setProduct(null);
    setVariants([]);
    setSelectedVariantId(null);
    setQuantity(1);
    setAdded(false);

    (async () => {
      try {
        const result = await fetchProductById(productId);
        if (cancelled) return;
        setProduct(result);
        if (!result) return;

        setSelectedVariantId(result.id);
        setSelectedSize(result.sizes?.find((entry) => entry.available)?.size);

        if (result.productGroupId != null) {
          const group = await fetchProductGroup(result.productGroupId);
          if (cancelled) return;
          setVariants(group?.variants && group.variants.length > 0 ? group.variants : [result]);
        } else {
          setVariants([result]);
        }
      } catch {
        if (!cancelled) setHasError(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [productId, retryKey]);

  useEffect(() => {
    if (!product) {
      setRelatedProducts([]);
      return;
    }

    let cancelled = false;
    const variantIds = new Set(variants.map((variant) => variant.id));
    fetchProducts({ vertical: product.vertical, category: product.category })
      .then((results) => {
        if (cancelled) return;
        // Exclude every color variant in this group, not just the currently
        // active one -- they're already reachable via the swatches above,
        // so listing them again under "You might also like" is redundant.
        setRelatedProducts(results.filter((item) => !variantIds.has(item.id)).slice(0, MAX_RELATED_PRODUCTS));
      })
      .catch(() => {
        // Related products are supplementary; fail silently and just show none.
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately keyed on `product` (not `activeProduct`/`variants`) so switching colors doesn't refetch this section.
  }, [product]);

  function handleSelectVariant(variant: Product) {
    if (variant.id === selectedVariantId) return;
    setSelectedVariantId(variant.id);
    setSelectedSize(variant.sizes?.find((entry) => entry.available)?.size);
    setAdded(false);
  }

  function handleAddToCart() {
    if (!activeProduct || !canAddToCart) return;
    // Whichever variant is currently selected -- addItem keys the cart line
    // by this exact product id, so cart/checkout reflect the color actually
    // chosen, even though the URL never changed.
    addItem(activeProduct, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), ADDED_FEEDBACK_DURATION_MS);
  }

  function handleTryItOn() {
    if (!activeProduct) return;
    if (user) {
      router.push({ pathname: '/try-on/[id]', params: { id: String(activeProduct.id) } });
    } else {
      router.push({ pathname: '/login', params: { redirectTo: `/try-on/${activeProduct.id}` } });
    }
  }

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: '' }} />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Skeleton height={320} borderRadius={0} />
          <View style={styles.content}>
            <Skeleton width="40%" height={12} />
            <Skeleton width="80%" height={28} style={styles.skeletonSpacingTop} />
            <Skeleton width="50%" height={16} style={styles.skeletonSpacingTop} />
            <Skeleton width="35%" height={30} style={styles.skeletonSpacingTop} />
            <Skeleton height={16} style={styles.skeletonSpacingLarge} />
            <Skeleton width="70%" height={16} style={styles.skeletonSpacingTop} />
          </View>
        </ScrollView>
      </ThemedView>
    );
  }

  if (hasError) {
    return (
      <ThemedView style={styles.statusContainer}>
        <Stack.Screen options={{ title: '' }} />
        <ErrorState message="Couldn't load this product. Check your connection." onRetry={() => setRetryKey((k) => k + 1)} />
      </ThemedView>
    );
  }

  if (!product || !activeProduct) {
    return (
      <ThemedView style={styles.statusContainer}>
        <Stack.Screen options={{ title: '' }} />
        <ThemedText themeColor="textSecondary">Product not found.</ThemedText>
      </ThemedView>
    );
  }

  // Everything below renders `activeProduct` -- the currently selected color
  // variant -- not `product` (the originally routed :id). They're the same
  // object until a swatch is tapped.
  const discountPercent = activeProduct.originalPrice
    ? Math.round((1 - activeProduct.price / activeProduct.originalPrice) * 100)
    : undefined;
  const filledStars = Math.round(activeProduct.rating);
  const imageUrl = getProductImageUrl(activeProduct);
  const totalPrice = activeProduct.price * quantity;

  const sizes = activeProduct.sizes ?? [];
  const hasSizes = sizes.length > 0;
  const outOfStock = activeProduct.inStock === false;
  const canAddToCart = !outOfStock && (!hasSizes || Boolean(selectedSize));
  const hasColorVariants = variants.length > 1;

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: '' }} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.carouselWrapper}>
          <ProductImageCarousel
            images={imageUrl ? [imageUrl] : []}
            emoji={activeProduct.emoji}
            color={activeProduct.color}
          />
          {activeProduct.tag && (
            <View style={styles.tagBadge}>
              <ThemedText type="small" style={styles.tagText}>
                {activeProduct.tag}
              </ThemedText>
            </View>
          )}
          <Pressable
            onPress={() => toggleWishlist(activeProduct)}
            hitSlop={8}
            style={styles.wishlistButton}
            accessibilityRole="button"
            accessibilityLabel={
              isWishlisted(activeProduct.id)
                ? `Remove ${activeProduct.name} from wishlist`
                : `Save ${activeProduct.name} to wishlist`
            }>
            <Ionicons
              name={isWishlisted(activeProduct.id) ? 'heart' : 'heart-outline'}
              size={22}
              color={isWishlisted(activeProduct.id) ? '#dc2626' : '#333333'}
            />
          </Pressable>
        </View>

        <View style={styles.content}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.category}>
            {activeProduct.category.toUpperCase()}
          </ThemedText>
          <ThemedText type="subtitle">{activeProduct.name}</ThemedText>

          <View style={styles.ratingRow}>
            <ThemedText style={styles.stars}>
              {'★'.repeat(filledStars)}
              {'☆'.repeat(5 - filledStars)}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {activeProduct.rating.toFixed(1)} ({activeProduct.reviewCount.toLocaleString()} reviews)
            </ThemedText>
          </View>

          {hasColorVariants && (
            <View style={styles.colorSection}>
              <ThemedText type="smallBold">
                Color{activeProduct.variantColor ? `: ${activeProduct.variantColor}` : ''}
              </ThemedText>
              <View style={styles.swatchPickerRow}>
                {variants.map((variant) => {
                  const isSelected = variant.id === activeProduct.id;
                  const hex = colorNameToHex(variant.variantColor);
                  return (
                    <Pressable
                      key={variant.id}
                      onPress={() => handleSelectVariant(variant)}
                      hitSlop={6}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={variant.variantColor ?? `Color option ${variant.id}`}
                      style={[styles.swatchPickerButton, isSelected && styles.swatchPickerButtonSelected]}>
                      <View
                        style={[
                          styles.swatchPickerDot,
                          { backgroundColor: hex },
                          swatchNeedsBorder(hex) && styles.swatchDotBorder,
                        ]}
                      />
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          <View style={styles.priceRow}>
            <ThemedText type="title" style={styles.price}>
              ₹{activeProduct.price}
            </ThemedText>
            {activeProduct.originalPrice && (
              <ThemedText themeColor="textSecondary" style={styles.strikethrough}>
                ₹{activeProduct.originalPrice}
              </ThemedText>
            )}
            {discountPercent !== undefined && discountPercent > 0 && (
              <ThemedText type="smallBold" style={styles.discountText}>
                {discountPercent}% off
              </ThemedText>
            )}
          </View>

          <View style={styles.descriptionBlock}>
            <ThemedText type="smallBold">About this product</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.description}>
              {activeProduct.description}
            </ThemedText>
          </View>

          {hasSizes && (
            <View style={styles.sizeSection}>
              <ThemedText type="smallBold">Size</ThemedText>
              <View style={styles.sizeRow}>
                {sizes.map((entry) => {
                  const isSelected = selectedSize === entry.size;
                  const isLowStock = entry.available && entry.quantity <= LOW_STOCK_THRESHOLD;

                  return (
                    <Pressable
                      key={entry.size}
                      disabled={!entry.available}
                      onPress={() => setSelectedSize(entry.size)}
                      accessibilityRole="button"
                      accessibilityState={{ disabled: !entry.available, selected: isSelected }}
                      style={[
                        styles.sizeButton,
                        !entry.available && styles.sizeButtonDisabled,
                        isSelected && styles.sizeButtonSelected,
                      ]}>
                      <ThemedText
                        type="smallBold"
                        style={!entry.available ? styles.sizeTextDisabled : isSelected ? styles.sizeTextSelected : undefined}>
                        {entry.size}
                      </ThemedText>
                      {!entry.available && (
                        <ThemedText type="small" style={styles.sizeTextDisabled}>
                          Out of Stock
                        </ThemedText>
                      )}
                      {isLowStock && (
                        <ThemedText type="small" style={styles.lowStockText}>
                          Only {entry.quantity} left!
                        </ThemedText>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {activeProduct.category === 'Clothing' && <FitConfidence vertical={activeProduct.vertical} />}

          <View style={styles.qtyRow}>
            <ThemedText type="smallBold">Quantity</ThemedText>
            <View style={styles.qtyStepper}>
              <Pressable
                onPress={() => setQuantity((qty) => Math.max(1, qty - 1))}
                style={styles.qtyButton}
                hitSlop={8}
                accessibilityLabel="Decrease quantity">
                <ThemedText type="subtitle" style={styles.qtySymbol}>
                  −
                </ThemedText>
              </Pressable>
              <ThemedText type="smallBold" style={styles.qtyValue}>
                {quantity}
              </ThemedText>
              <Pressable
                onPress={() => setQuantity((qty) => qty + 1)}
                style={styles.qtyButton}
                hitSlop={8}
                accessibilityLabel="Increase quantity">
                <ThemedText type="subtitle" style={styles.qtySymbol}>
                  +
                </ThemedText>
              </Pressable>
            </View>
          </View>

          {activeProduct.category === 'Clothing' && (
            <Pressable onPress={handleTryItOn} style={styles.tryOnButton}>
              <ThemedText type="smallBold" style={styles.tryOnButtonText}>
                👗 Try It On
              </ThemedText>
            </Pressable>
          )}
        </View>

        {relatedProducts.length > 0 && (
          <View style={styles.relatedSection}>
            <ThemedText type="smallBold" style={styles.relatedTitle}>
              You might also like
            </ThemedText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.relatedList}>
              {relatedProducts.map((item) => (
                <ProductCard key={item.id} product={item} style={styles.relatedCard} />
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      <ThemedView
        type="backgroundElement"
        style={[styles.stickyBar, { paddingBottom: Math.max(insets.bottom, Spacing.three) }]}>
        <View>
          <ThemedText type="small" themeColor="textSecondary">
            Total
          </ThemedText>
          <ThemedText type="smallBold" style={styles.totalPrice}>
            ₹{totalPrice}
          </ThemedText>
        </View>
        <Pressable
          onPress={handleAddToCart}
          disabled={!canAddToCart}
          style={[styles.addButton, !canAddToCart && styles.addButtonDisabled]}>
          <ThemedText type="smallBold" style={styles.addButtonText}>
            {outOfStock ? 'Out of Stock' : added ? 'Added ✓' : 'Add to Cart'}
          </ThemedText>
        </Pressable>
      </ThemedView>
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
    paddingHorizontal: Spacing.four,
  },
  skeletonSpacingTop: {
    marginTop: Spacing.two,
  },
  skeletonSpacingLarge: {
    marginTop: Spacing.four,
  },
  scrollContent: {
    paddingBottom: Spacing.six,
  },
  carouselWrapper: {
    position: 'relative',
  },
  tagBadge: {
    position: 'absolute',
    top: Spacing.three,
    left: Spacing.three,
    backgroundColor: '#fef3c7',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  tagText: {
    color: '#92400e',
  },
  wishlistButton: {
    position: 'absolute',
    top: Spacing.three,
    right: Spacing.three,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.two,
  },
  category: {
    letterSpacing: 0.5,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  stars: {
    color: '#f59e0b',
    fontSize: 14,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  price: {
    fontSize: 28,
    lineHeight: 34,
  },
  strikethrough: {
    textDecorationLine: 'line-through',
  },
  discountText: {
    color: '#16a34a',
  },
  colorSection: {
    marginTop: Spacing.three,
    gap: Spacing.two,
  },
  swatchPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  swatchPickerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchPickerButtonSelected: {
    borderColor: '#3c87f7',
  },
  swatchPickerDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  swatchDotBorder: {
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.35)',
  },
  descriptionBlock: {
    marginTop: Spacing.four,
    gap: Spacing.one,
  },
  description: {
    lineHeight: 22,
  },
  sizeSection: {
    marginTop: Spacing.four,
    gap: Spacing.two,
  },
  sizeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  sizeButton: {
    alignItems: 'center',
    borderRadius: Spacing.three,
    borderWidth: 2,
    borderColor: 'rgba(60,135,247,0.4)',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  sizeButtonSelected: {
    borderColor: '#3c87f7',
    backgroundColor: 'rgba(60,135,247,0.1)',
  },
  sizeButtonDisabled: {
    borderColor: 'rgba(128,128,128,0.25)',
    backgroundColor: 'rgba(128,128,128,0.08)',
  },
  sizeTextSelected: {
    color: '#3c87f7',
  },
  sizeTextDisabled: {
    color: '#9ca3af',
  },
  lowStockText: {
    color: '#d97706',
  },
  qtyRow: {
    marginTop: Spacing.four,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  qtyStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Spacing.five,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.3)',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  qtyButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtySymbol: {
    lineHeight: 28,
  },
  qtyValue: {
    minWidth: 20,
    textAlign: 'center',
  },
  tryOnButton: {
    marginTop: Spacing.four,
    borderRadius: Spacing.five,
    borderWidth: 1,
    borderColor: '#3c87f7',
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  tryOnButtonText: {
    color: '#3c87f7',
  },
  relatedSection: {
    marginTop: Spacing.five,
    gap: Spacing.three,
  },
  relatedTitle: {
    paddingHorizontal: Spacing.four,
  },
  relatedList: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  relatedCard: {
    width: 160,
  },
  stickyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.three,
    ...Platform.select({
      web: { boxShadow: '0 -2px 12px rgba(0,0,0,0.08)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 8,
      },
    }),
  },
  totalPrice: {
    fontSize: 18,
  },
  addButton: {
    flex: 1,
    backgroundColor: '#3c87f7',
    borderRadius: Spacing.five,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },
  addButtonText: {
    color: '#ffffff',
  },
});

import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProductCard } from '@/components/product-card';
import { ProductImageCarousel } from '@/components/product-image-carousel';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useCart } from '@/context/cart-context';
import { useTheme } from '@/hooks/use-theme';
import { fetchProductById, fetchProducts, getProductImageUrl, type Product } from '@/lib/api';

const ADDED_FEEDBACK_DURATION_MS = 1500;
const MAX_RELATED_PRODUCTS = 4;

export default function ProductDetailScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { addItem } = useCart();

  const productId = rawId ? Number(rawId) : NaN;

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(productId)) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setHasError(false);
    setProduct(null);
    setQuantity(1);
    setAdded(false);

    fetchProductById(productId)
      .then((result) => {
        if (!cancelled) setProduct(result);
      })
      .catch(() => {
        if (!cancelled) setHasError(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [productId]);

  useEffect(() => {
    if (!product) {
      setRelatedProducts([]);
      return;
    }

    let cancelled = false;
    fetchProducts({ vertical: product.vertical, category: product.category })
      .then((results) => {
        if (cancelled) return;
        setRelatedProducts(results.filter((item) => item.id !== product.id).slice(0, MAX_RELATED_PRODUCTS));
      })
      .catch(() => {
        // Related products are supplementary; fail silently and just show none.
      });

    return () => {
      cancelled = true;
    };
  }, [product]);

  function handleAddToCart() {
    if (!product) return;
    addItem(product, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), ADDED_FEEDBACK_DURATION_MS);
  }

  if (isLoading) {
    return (
      <ThemedView style={styles.statusContainer}>
        <Stack.Screen options={{ title: '' }} />
        <ActivityIndicator color={theme.textSecondary} />
      </ThemedView>
    );
  }

  if (hasError || !product) {
    return (
      <ThemedView style={styles.statusContainer}>
        <Stack.Screen options={{ title: '' }} />
        <ThemedText themeColor="textSecondary">
          {hasError ? "Couldn't load this product. Check your connection." : 'Product not found.'}
        </ThemedText>
      </ThemedView>
    );
  }

  const discountPercent = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : undefined;
  const filledStars = Math.round(product.rating);
  const imageUrl = getProductImageUrl(product);
  const totalPrice = product.price * quantity;

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: '' }} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.carouselWrapper}>
          <ProductImageCarousel images={imageUrl ? [imageUrl] : []} emoji={product.emoji} color={product.color} />
          {product.tag && (
            <View style={styles.tagBadge}>
              <ThemedText type="small" style={styles.tagText}>
                {product.tag}
              </ThemedText>
            </View>
          )}
        </View>

        <View style={styles.content}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.category}>
            {product.category.toUpperCase()}
          </ThemedText>
          <ThemedText type="subtitle">{product.name}</ThemedText>

          <View style={styles.ratingRow}>
            <ThemedText style={styles.stars}>
              {'★'.repeat(filledStars)}
              {'☆'.repeat(5 - filledStars)}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {product.rating.toFixed(1)} ({product.reviewCount.toLocaleString()} reviews)
            </ThemedText>
          </View>

          <View style={styles.priceRow}>
            <ThemedText type="title" style={styles.price}>
              ₹{product.price}
            </ThemedText>
            {product.originalPrice && (
              <ThemedText themeColor="textSecondary" style={styles.strikethrough}>
                ₹{product.originalPrice}
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
              {product.description}
            </ThemedText>
          </View>

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
        <Pressable onPress={handleAddToCart} style={styles.addButton}>
          <ThemedText type="smallBold" style={styles.addButtonText}>
            {added ? 'Added ✓' : 'Add to Cart'}
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
  descriptionBlock: {
    marginTop: Spacing.four,
    gap: Spacing.one,
  },
  description: {
    lineHeight: 22,
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
  addButtonText: {
    color: '#ffffff',
  },
});

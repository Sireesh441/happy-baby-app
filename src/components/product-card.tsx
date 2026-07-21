import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ProductThumbnail } from '@/components/product-thumbnail';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useCart } from '@/context/cart-context';
import type { Product } from '@/lib/api';

const ADDED_FEEDBACK_DURATION_MS = 1500;

type ProductCardProps = {
  product: Product;
  style?: StyleProp<ViewStyle>;
};

export function ProductCard({ product, style }: ProductCardProps) {
  const router = useRouter();
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const discountPercent = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : undefined;

  function handleAddToCart() {
    addItem(product, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), ADDED_FEEDBACK_DURATION_MS);
  }

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/product/[id]', params: { id: String(product.id) } })}
      style={style}>
      <ThemedView type="backgroundElement" style={styles.card}>
        {product.tag && (
          <View style={styles.tagBadge}>
            <ThemedText type="small" style={styles.tagText}>
              {product.tag}
            </ThemedText>
          </View>
        )}
        <ProductThumbnail product={product} size={56} style={styles.cardThumbnail} />
        <ThemedText numberOfLines={2} style={styles.cardName}>
          {product.name}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {product.category} · ★ {product.rating}
        </ThemedText>
        <View style={styles.priceRow}>
          <ThemedText type="smallBold">₹{product.price}</ThemedText>
          {product.originalPrice && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.strikethrough}>
              ₹{product.originalPrice}
            </ThemedText>
          )}
          {discountPercent !== undefined && discountPercent > 0 && (
            <ThemedText type="small" style={styles.discountText}>
              {discountPercent}% off
            </ThemedText>
          )}
        </View>

        <Pressable onPress={handleAddToCart} style={styles.addButton}>
          <ThemedText type="small" style={styles.addButtonText}>
            {added ? 'Added ✓' : 'Add to Cart'}
          </ThemedText>
        </Pressable>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.four,
    padding: Spacing.two,
    gap: Spacing.one,
  },
  cardThumbnail: {
    alignSelf: 'center',
    marginBottom: Spacing.one,
  },
  cardName: {
    minHeight: 40,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    flexWrap: 'wrap',
  },
  strikethrough: {
    textDecorationLine: 'line-through',
  },
  discountText: {
    color: '#16a34a',
  },
  tagBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#fef3c7',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  tagText: {
    color: '#92400e',
  },
  addButton: {
    marginTop: Spacing.one,
    backgroundColor: '#3c87f7',
    borderRadius: Spacing.five,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#ffffff',
  },
});

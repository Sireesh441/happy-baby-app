import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ProductThumbnail } from '@/components/product-thumbnail';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useCart } from '@/context/cart-context';
import { useWishlist } from '@/context/wishlist-context';
import type { Product } from '@/lib/api';
import { colorNameToHex, swatchNeedsBorder } from '@/lib/color-swatch';

const ADDED_FEEDBACK_DURATION_MS = 1500;
const MAX_SWATCH_DOTS = 4;

type ProductCardProps = {
  // `variantCount` is only present on entries from the grouped shop-grid
  // listing (GET /api/products) -- optional so this card also works for a
  // plain `Product` (related products, wishlist, cart thumbnails).
  product: Product & { variantCount?: number };
  style?: StyleProp<ViewStyle>;
};

/**
 * Small dot row hinting "this listing has N color options" on a grouped
 * product's card. Only the representative variant's own color is known
 * here (the rest live behind GET /api/products/group/:id, one fetch per
 * card away) -- so only the first dot is colored from `variantColor`; the
 * remainder are neutral placeholders, plus a "+N" label past the cap. Tap
 * through to the product detail page to see and pick the real colors.
 */
function VariantSwatchDots({ product }: { product: ProductCardProps['product'] }) {
  const count = product.variantCount ?? 1;
  if (count <= 1) return null;

  const dotCount = Math.min(count, MAX_SWATCH_DOTS);
  const overflow = count - dotCount;
  const firstDotColor = colorNameToHex(product.variantColor);

  return (
    <View style={styles.swatchRow} accessibilityLabel={`${count} colors available`}>
      {Array.from({ length: dotCount }).map((_, index) => {
        const color = index === 0 ? firstDotColor : DEFAULT_DOT_COLOR;
        return (
          <View
            key={index}
            style={[styles.swatchDot, { backgroundColor: color }, swatchNeedsBorder(color) && styles.swatchDotBorder]}
          />
        );
      })}
      {overflow > 0 && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.swatchOverflow}>
          +{overflow}
        </ThemedText>
      )}
    </View>
  );
}

const DEFAULT_DOT_COLOR = '#d1d5db';

export function ProductCard({ product, style }: ProductCardProps) {
  const router = useRouter();
  const { addItem } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const [added, setAdded] = useState(false);
  const wishlisted = isWishlisted(product.id);
  const outOfStock = product.inStock === false;
  const discountPercent = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : undefined;

  function handleAddToCart() {
    if (outOfStock) return;
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
        <Pressable
          onPress={() => toggleWishlist(product)}
          hitSlop={8}
          style={styles.wishlistButton}
          accessibilityRole="button"
          accessibilityLabel={wishlisted ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}>
          <Ionicons name={wishlisted ? 'heart' : 'heart-outline'} size={18} color={wishlisted ? '#dc2626' : '#60646C'} />
        </Pressable>
        {outOfStock && (
          <View style={styles.outOfStockBadge}>
            <ThemedText type="small" style={styles.outOfStockText}>
              Out of Stock
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
        <VariantSwatchDots product={product} />
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

        <Pressable
          onPress={handleAddToCart}
          disabled={outOfStock}
          style={[styles.addButton, outOfStock && styles.addButtonDisabled]}>
          <ThemedText type="small" style={styles.addButtonText}>
            {outOfStock ? 'Out of Stock' : added ? 'Added ✓' : 'Add to Cart'}
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
  swatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  swatchDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  swatchDotBorder: {
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.35)',
  },
  swatchOverflow: {
    marginLeft: 2,
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
  wishlistButton: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    zIndex: 1,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outOfStockBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(15,15,15,0.8)',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  outOfStockText: {
    color: '#ffffff',
  },
  addButton: {
    marginTop: Spacing.one,
    backgroundColor: '#3c87f7',
    borderRadius: Spacing.five,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },
  addButtonText: {
    color: '#ffffff',
  },
});

import { useRouter } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty-state';
import { ProductThumbnail } from '@/components/product-thumbnail';
import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useCart, type CartLine } from '@/context/cart-context';

const SKELETON_ROW_COUNT = 3;

export default function CartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { lines, itemCount, subtotal, isLoaded, updateQuantity, removeItem } = useCart();
  const { user, isLoading: isAuthLoading } = useAuth();

  function handleCheckoutPress() {
    if (isAuthLoading) return;
    if (user) {
      router.push('/checkout');
    } else {
      router.push({ pathname: '/login', params: { redirectTo: '/checkout' } });
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          Cart
        </ThemedText>

        {!isLoaded ? (
          <View style={styles.listContent}>
            {Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
              <View key={index} style={styles.row}>
                <View style={styles.rowTop}>
                  <Skeleton width={64} height={64} borderRadius={Spacing.three} />
                  <View style={styles.rowInfo}>
                    <Skeleton height={16} />
                    <Skeleton width="50%" height={14} />
                    <Skeleton width="30%" height={16} />
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : lines.length === 0 ? (
          <EmptyState
            emoji="🛒"
            title="Your cart is empty"
            message="Looks like you haven't added anything yet."
            actionLabel="Continue Shopping"
            onAction={() => router.push('/')}
          />
        ) : (
          <>
            <ScrollView
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}>
              {lines.map((line) => (
                <CartLineRow
                  key={line.productId}
                  line={line}
                  onIncrease={() => updateQuantity(line.productId, line.quantity + 1)}
                  onDecrease={() => updateQuantity(line.productId, line.quantity - 1)}
                  onRemove={() => removeItem(line.productId)}
                />
              ))}
            </ScrollView>

            <ThemedView
              type="backgroundElement"
              style={[
                styles.summaryBar,
                { paddingBottom: Math.max(insets.bottom, Spacing.three) + BottomTabInset },
              ]}>
              <View style={styles.summaryRow}>
                <ThemedText themeColor="textSecondary">
                  Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})
                </ThemedText>
                <ThemedText>₹{subtotal}</ThemedText>
              </View>
              <View style={styles.summaryRow}>
                <ThemedText type="smallBold">Total</ThemedText>
                <ThemedText type="smallBold">₹{subtotal}</ThemedText>
              </View>
              <Pressable onPress={handleCheckoutPress} style={styles.checkoutButton}>
                <ThemedText type="smallBold" style={styles.checkoutButtonText}>
                  Proceed to Checkout
                </ThemedText>
              </Pressable>
            </ThemedView>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

function CartLineRow({
  line,
  onIncrease,
  onDecrease,
  onRemove,
}: {
  line: CartLine;
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove: () => void;
}) {
  const { product, quantity } = line;

  return (
    <ThemedView type="backgroundElement" style={styles.row}>
      <View style={styles.rowTop}>
        <ProductThumbnail product={product} size={64} />
        <View style={styles.rowInfo}>
          <ThemedText numberOfLines={2}>{product.name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {product.category}
          </ThemedText>
          <ThemedText type="smallBold">₹{product.price}</ThemedText>
        </View>
        <Pressable onPress={onRemove} hitSlop={8} accessibilityLabel={`Remove ${product.name} from cart`}>
          <ThemedText themeColor="textSecondary" style={styles.removeIcon}>
            ✕
          </ThemedText>
        </Pressable>
      </View>

      <View style={styles.qtyStepper}>
        <Pressable onPress={onDecrease} style={styles.qtyButton} hitSlop={8} accessibilityLabel="Decrease quantity">
          <ThemedText style={styles.qtySymbol}>−</ThemedText>
        </Pressable>
        <ThemedText type="smallBold" style={styles.qtyValue}>
          {quantity}
        </ThemedText>
        <Pressable onPress={onIncrease} style={styles.qtyButton} hitSlop={8} accessibilityLabel="Increase quantity">
          <ThemedText style={styles.qtySymbol}>+</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: Platform.select({ web: Spacing.six, default: Spacing.four }),
  },
  title: {
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.three,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
    paddingBottom: Spacing.four,
  },
  row: {
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  rowTop: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  rowInfo: {
    flex: 1,
    gap: 2,
  },
  removeIcon: {
    fontSize: 16,
    padding: Spacing.one,
  },
  qtyStepper: {
    alignSelf: 'flex-end',
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
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtySymbol: {
    lineHeight: 22,
  },
  qtyValue: {
    minWidth: 16,
    textAlign: 'center',
  },
  summaryBar: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.one,
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
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  checkoutButton: {
    marginTop: Spacing.two,
    backgroundColor: '#3c87f7',
    borderRadius: Spacing.five,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  checkoutButtonText: {
    color: '#ffffff',
  },
});

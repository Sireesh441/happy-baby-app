import { useRouter } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProductThumbnail } from '@/components/product-thumbnail';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useCart, type CartLine } from '@/context/cart-context';

export default function CartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { lines, itemCount, subtotal, updateQuantity, removeItem } = useCart();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          Cart
        </ThemedText>

        {lines.length === 0 ? (
          <View style={styles.emptyState}>
            <ThemedText style={styles.emptyEmoji}>🛒</ThemedText>
            <ThemedText type="smallBold">Your cart is empty</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.emptyText}>
              Looks like you haven&apos;t added anything yet.
            </ThemedText>
            <Pressable onPress={() => router.push('/')} style={styles.continueButton}>
              <ThemedText type="smallBold" style={styles.continueButtonText}>
                Continue Shopping
              </ThemedText>
            </Pressable>
          </View>
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
              <Pressable onPress={() => router.push('/checkout')} style={styles.checkoutButton}>
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
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.five,
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: Spacing.two,
  },
  emptyText: {
    textAlign: 'center',
  },
  continueButton: {
    marginTop: Spacing.four,
    backgroundColor: '#3c87f7',
    borderRadius: Spacing.five,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
  },
  continueButtonText: {
    color: '#ffffff',
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

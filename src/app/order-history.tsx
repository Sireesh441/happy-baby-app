import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { ProductThumbnail } from '@/components/product-thumbnail';
import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useCart } from '@/context/cart-context';
import { useTheme } from '@/hooks/use-theme';
import { fetchProductById } from '@/lib/api';
import { fetchOrders, type Order } from '@/lib/orders-api';

const SKELETON_CARD_COUNT = 2;

export default function OrderHistoryScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { user, token, isLoading: isAuthLoading } = useAuth();
  const { addItem } = useCart();

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [buyingAgainId, setBuyingAgainId] = useState<number | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!user || !token) {
      router.replace({ pathname: '/login', params: { redirectTo: '/order-history' } });
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setHasError(false);

    fetchOrders(token)
      .then((result) => {
        if (!cancelled) setOrders(result);
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
  }, [user, token, isAuthLoading, router, retryKey]);

  async function handleBuyAgain(order: Order) {
    setBuyingAgainId(order.id);
    try {
      const unavailable: string[] = [];

      for (const item of order.items) {
        const product = await fetchProductById(item.id).catch(() => null);
        if (product) {
          addItem(product, item.quantity);
        } else {
          unavailable.push(item.name);
        }
      }

      if (unavailable.length > 0) {
        Alert.alert(
          'Some items are unavailable',
          `${unavailable.join(', ')} could no longer be added — the rest are in your cart.`
        );
      } else {
        Alert.alert('Added to cart', 'All items from this order are back in your cart.');
      }
    } finally {
      setBuyingAgainId(null);
    }
  }

  if (isAuthLoading) {
    return (
      <ThemedView style={styles.statusContainer}>
        <Stack.Screen options={{ title: 'Order History' }} />
        <ActivityIndicator color={theme.textSecondary} />
      </ThemedView>
    );
  }

  if (isLoading && orders.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: 'Order History' }} />
        <View style={styles.listContent}>
          {Array.from({ length: SKELETON_CARD_COUNT }).map((_, index) => (
            <View key={index} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.skeletonHeaderText}>
                  <Skeleton width="60%" height={16} />
                  <Skeleton width="80%" height={13} style={styles.skeletonSpacingSmall} />
                </View>
                <Skeleton width={50} height={16} />
              </View>
              <View style={styles.thumbRow}>
                <Skeleton width={44} height={44} borderRadius={Spacing.two} />
                <Skeleton width={44} height={44} borderRadius={Spacing.two} />
              </View>
              <Skeleton width={110} height={32} borderRadius={Spacing.five} />
            </View>
          ))}
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Order History' }} />
      {hasError ? (
        <ErrorState message="Couldn't load your orders. Check your connection." onRetry={() => setRetryKey((k) => k + 1)} />
      ) : orders.length === 0 ? (
        <EmptyState
          emoji="📦"
          title="No orders yet"
          message="Orders you place will show up here."
          actionLabel="Continue Shopping"
          onAction={() => router.push('/')}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              isBuyingAgain={buyingAgainId === order.id}
              onBuyAgain={() => handleBuyAgain(order)}
            />
          ))}
        </ScrollView>
      )}
    </ThemedView>
  );
}

function OrderCard({
  order,
  isBuyingAgain,
  onBuyAgain,
}: {
  order: Order;
  isBuyingAgain: boolean;
  onBuyAgain: () => void;
}) {
  const placedOn = new Date(order.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <ThemedText type="smallBold">Order #{order.id}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {placedOn} · {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </ThemedText>
        </View>
        <ThemedText type="smallBold">₹{order.total}</ThemedText>
      </View>

      <View style={styles.thumbRow}>
        {order.items.map((item) => (
          <ProductThumbnail key={item.id} product={item} size={44} />
        ))}
      </View>

      <Pressable
        onPress={onBuyAgain}
        disabled={isBuyingAgain}
        style={[styles.buyAgainButton, isBuyingAgain && styles.buyAgainButtonDisabled]}>
        <ThemedText type="smallBold" style={styles.buyAgainButtonText}>
          {isBuyingAgain ? 'Adding...' : 'Buy Again'}
        </ThemedText>
      </Pressable>
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
    gap: Spacing.one,
    paddingHorizontal: Spacing.five,
  },
  skeletonHeaderText: {
    flex: 1,
    gap: Spacing.one,
  },
  skeletonSpacingSmall: {
    marginTop: 2,
  },
  listContent: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  card: {
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  thumbRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  buyAgainButton: {
    alignSelf: 'flex-start',
    borderRadius: Spacing.five,
    borderWidth: 1,
    borderColor: '#3c87f7',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  buyAgainButtonDisabled: {
    opacity: 0.5,
  },
  buyAgainButtonText: {
    color: '#3c87f7',
  },
});

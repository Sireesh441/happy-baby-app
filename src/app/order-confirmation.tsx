import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { fetchOrderById, type Order } from '@/lib/orders-api';

export default function OrderConfirmationScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { token, isLoading: isAuthLoading } = useAuth();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();

  const [order, setOrder] = useState<Order | null | undefined>(undefined);

  useEffect(() => {
    if (!token || !orderId) return;
    let cancelled = false;
    fetchOrderById(token, Number(orderId))
      .then((result) => {
        if (!cancelled) setOrder(result);
      })
      .catch(() => {
        if (!cancelled) setOrder(null);
      });
    return () => {
      cancelled = true;
    };
  }, [token, orderId]);

  function handleContinueShopping() {
    router.replace('/');
  }

  if (isAuthLoading || order === undefined) {
    return (
      <ThemedView style={styles.statusContainer}>
        <Stack.Screen options={{ title: 'Order Confirmed' }} />
        <ActivityIndicator color={theme.textSecondary} />
      </ThemedView>
    );
  }

  if (!order) {
    return (
      <ThemedView style={styles.statusContainer}>
        <Stack.Screen options={{ title: 'Order Confirmed' }} />
        <ThemedText style={styles.emoji}>🔍</ThemedText>
        <ThemedText type="smallBold">Order not found</ThemedText>
        <Pressable onPress={handleContinueShopping} style={styles.continueButton}>
          <ThemedText type="smallBold" style={styles.continueButtonText}>
            Continue Shopping
          </ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Order Confirmed', headerBackVisible: false }} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <ThemedText style={styles.emoji}>🎉</ThemedText>
          <ThemedText type="subtitle" style={styles.title}>
            Order confirmed!
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.subtitle}>
            Thank you for your purchase.
          </ThemedText>
        </View>

        <ThemedView type="backgroundElement" style={styles.detailsCard}>
          <DetailRow label="Order ID" value={`#${order.id}`} />
          <DetailRow label="Payment ID" value={order.razorpayPaymentId} />
          <DetailRow label="Date" value={new Date(order.createdAt).toLocaleString('en-IN')} />
          <DetailRow label="Total Paid" value={`₹${order.total}`} />
        </ThemedView>

        <View style={styles.section}>
          <ThemedText type="smallBold" style={styles.sectionTitle}>
            Items
          </ThemedText>
          {order.items.map((item) => (
            <ThemedView key={item.id} type="backgroundElement" style={styles.itemRow}>
              <ThemedText style={styles.itemEmoji}>{item.emoji}</ThemedText>
              <View style={styles.itemInfo}>
                <ThemedText numberOfLines={1}>{item.name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Qty: {item.quantity}
                </ThemedText>
              </View>
              <ThemedText type="smallBold">₹{item.price * item.quantity}</ThemedText>
            </ThemedView>
          ))}
        </View>

        <View style={styles.section}>
          <ThemedText type="smallBold" style={styles.sectionTitle}>
            Shipping Address
          </ThemedText>
          <ThemedView type="backgroundElement" style={styles.addressCard}>
            <ThemedText type="smallBold">{order.shippingAddress.name}</ThemedText>
            <ThemedText themeColor="textSecondary" type="small">
              {order.shippingAddress.line1}, {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
              {order.shippingAddress.pincode}
            </ThemedText>
            <ThemedText themeColor="textSecondary" type="small">
              {order.shippingAddress.phone}
            </ThemedText>
          </ThemedView>
        </View>

        <Pressable onPress={handleContinueShopping} style={styles.continueButton}>
          <ThemedText type="smallBold" style={styles.continueButtonText}>
            Continue Shopping
          </ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold">{value}</ThemedText>
    </View>
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
    gap: Spacing.two,
    paddingHorizontal: Spacing.five,
  },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.five,
  },
  header: {
    alignItems: 'center',
    gap: Spacing.half,
  },
  emoji: {
    fontSize: 56,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
  },
  detailsCard: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  section: {
    gap: Spacing.two,
  },
  sectionTitle: {
    marginBottom: Spacing.half,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  itemEmoji: {
    fontSize: 28,
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  addressCard: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  continueButton: {
    marginTop: Spacing.two,
    backgroundColor: '#3c87f7',
    borderRadius: Spacing.five,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#ffffff',
  },
});

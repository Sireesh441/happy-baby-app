import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

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
import { fetchOrders, type BulkOrderItem, type Order, type RetailOrderItem } from '@/lib/orders-api';
import {
  createReturnCase,
  fetchReturnCases,
  uploadUnboxingProof,
  type ReturnCase,
  type ReturnCaseStatus,
} from '@/lib/returns-api';

const SKELETON_CARD_COUNT = 2;

const STATUS_LABELS: Record<ReturnCaseStatus, string> = {
  proof_pending: 'Proof Pending',
  proof_complete: 'Proof Complete',
  dispute_open: 'Dispute Open',
  resolved: 'Resolved',
};

type ProofTarget = { order: Order; returnCase: ReturnCase };

export default function OrderHistoryScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { user, token, isLoading: isAuthLoading } = useAuth();
  const { addItem, addBulkPack } = useCart();

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [buyingAgainId, setBuyingAgainId] = useState<number | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const [returnCasesByOrder, setReturnCasesByOrder] = useState<Record<number, ReturnCase[]>>({});
  const [pendingItemKey, setPendingItemKey] = useState<string | null>(null);
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});
  const [proofTarget, setProofTarget] = useState<ProofTarget | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);

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

  // Return status is supplementary to the order list itself -- fetched per
  // order once orders load, and a failure for one order's return cases
  // shouldn't block the page or the other orders' statuses.
  useEffect(() => {
    if (!token || orders.length === 0) return;
    let cancelled = false;

    Promise.all(
      orders.map((order) =>
        fetchReturnCases(token, order.id)
          .then((cases) => [order.id, cases] as const)
          .catch(() => [order.id, [] as ReturnCase[]] as const)
      )
    ).then((results) => {
      if (cancelled) return;
      const map: Record<number, ReturnCase[]> = {};
      for (const [orderId, cases] of results) map[orderId] = cases;
      setReturnCasesByOrder(map);
    });

    return () => {
      cancelled = true;
    };
  }, [orders, token]);

  async function handleBuyAgain(order: Order) {
    setBuyingAgainId(order.id);
    try {
      const unavailable: string[] = [];

      for (const item of order.items) {
        if (item.type === 'bulk') {
          // Re-add using this order's own snapshotted breakdown/price for
          // immediate display -- the real charge gets re-resolved from the
          // ProductGroup's *current* bulkPricing at checkout regardless
          // (same as every bulk pack), so a possibly-stale display price
          // here is just a preview, not what actually gets charged.
          addBulkPack({
            productGroupId: item.productGroupId,
            productGroupName: item.productGroupName,
            packSize: item.packSize as 5 | 10,
            pricePerUnit: item.pricePerUnit,
            breakdownDisplay: item.breakdownDisplay,
          });
          continue;
        }

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

  async function handleReturnItem(order: Order, item: RetailOrderItem) {
    if (!token) return;
    const key = `${order.id}-${item.id}`;
    setPendingItemKey(key);
    setItemErrors((current) => ({ ...current, [key]: '' }));

    try {
      const newCase = await createReturnCase(token, order.id, item.id);
      setReturnCasesByOrder((current) => ({
        ...current,
        [order.id]: [...(current[order.id] ?? []), newCase],
      }));
      setProofTarget({ order, returnCase: newCase });
    } catch (err) {
      setItemErrors((current) => ({
        ...current,
        [key]: err instanceof Error ? err.message : 'Could not start a return for this item.',
      }));
    } finally {
      setPendingItemKey(null);
    }
  }

  async function handlePickAndUpload(source: 'camera' | 'library') {
    if (!proofTarget || !token) return;
    const { order, returnCase } = proofTarget;

    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permission needed',
        source === 'camera' ? 'Camera permission is required.' : 'Photo library permission is required.'
      );
      return;
    }

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images', 'videos'], quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], quality: 0.8 });
    if (result.canceled || !result.assets?.[0]) return;

    setIsUploadingProof(true);
    try {
      await uploadUnboxingProof(token, returnCase.id, result.assets[0]);
      const refreshed = await fetchReturnCases(token, order.id);
      setReturnCasesByOrder((current) => ({ ...current, [order.id]: refreshed }));
      setProofTarget(null);
    } catch (err) {
      Alert.alert('Upload failed', err instanceof Error ? err.message : 'Could not upload proof. Please try again.');
    } finally {
      setIsUploadingProof(false);
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
              returnCases={returnCasesByOrder[order.id] ?? []}
              pendingItemKey={pendingItemKey}
              itemErrors={itemErrors}
              onReturnItem={(item) => handleReturnItem(order, item)}
              onRetryUploadProof={(returnCase) => setProofTarget({ order, returnCase })}
            />
          ))}
        </ScrollView>
      )}

      <ProofUploadModal
        visible={proofTarget != null}
        isUploading={isUploadingProof}
        onPickCamera={() => handlePickAndUpload('camera')}
        onPickLibrary={() => handlePickAndUpload('library')}
        onClose={() => setProofTarget(null)}
      />
    </ThemedView>
  );
}

function OrderCard({
  order,
  isBuyingAgain,
  onBuyAgain,
  returnCases,
  pendingItemKey,
  itemErrors,
  onReturnItem,
  onRetryUploadProof,
}: {
  order: Order;
  isBuyingAgain: boolean;
  onBuyAgain: () => void;
  returnCases: ReturnCase[];
  pendingItemKey: string | null;
  itemErrors: Record<string, string>;
  onReturnItem: (item: RetailOrderItem) => void;
  onRetryUploadProof: (returnCase: ReturnCase) => void;
}) {
  const placedOn = new Date(order.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const itemCount = order.items.reduce(
    (sum, item) => sum + (item.type === 'bulk' ? item.packSize * item.quantity : item.quantity),
    0
  );

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

      <View style={styles.itemList}>
        {order.items.map((item, index) => {
          if (item.type === 'bulk') {
            // Bulk packs aren't returnable through this flow yet --
            // returns-protection's model is per-retail-item-id and has no
            // concept of a wholesale pack. Shown for visibility only.
            return <BulkItemRow key={`bulk-${item.productGroupId}-${index}`} item={item} />;
          }

          const key = `${order.id}-${item.id}`;
          const returnCase = returnCases.find((c) => c.itemId === item.id);
          const isPending = pendingItemKey === key;
          // Optional chaining on proofRecords too, not just returnCase --
          // the backend's create response can omit it (only the GET query
          // includes the relation), so a freshly created case can have
          // proofRecords undefined rather than [].
          const hasProof = (returnCase?.proofRecords?.length ?? 0) > 0;

          return (
            <View key={item.id} style={styles.itemRow}>
              <ProductThumbnail product={item} size={40} />
              <View style={styles.itemInfo}>
                <ThemedText type="small" numberOfLines={1}>
                  {item.name}
                </ThemedText>
                {returnCase ? (
                  <View style={styles.returnStatusRow}>
                    <ThemedText type="small" style={styles.returnStatusText}>
                      Return: {STATUS_LABELS[returnCase.status]}
                      {hasProof ? ' · Proof uploaded ✓' : ''}
                    </ThemedText>
                    {!hasProof && (
                      <Pressable onPress={() => onRetryUploadProof(returnCase)} hitSlop={4}>
                        <ThemedText type="small" style={styles.returnLink}>
                          Add Proof
                        </ThemedText>
                      </Pressable>
                    )}
                  </View>
                ) : (
                  <Pressable onPress={() => onReturnItem(item)} disabled={isPending} hitSlop={4}>
                    <ThemedText type="small" style={styles.returnLink}>
                      {isPending ? 'Starting return...' : 'Return Item'}
                    </ThemedText>
                  </Pressable>
                )}
                {itemErrors[key] ? (
                  <ThemedText type="small" style={styles.returnError}>
                    {itemErrors[key]}
                  </ThemedText>
                ) : null}
              </View>
            </View>
          );
        })}
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

function BulkItemRow({ item }: { item: BulkOrderItem }) {
  const summary = item.breakdownDisplay
    .map((entry) => `${entry.name}${entry.size ? ` (${entry.size})` : ''} ×${entry.quantity}`)
    .join(', ');

  return (
    <View style={styles.itemRow}>
      <View style={styles.bulkItemThumb}>
        <ThemedText style={styles.bulkItemEmoji}>📦</ThemedText>
      </View>
      <View style={styles.itemInfo}>
        <ThemedText type="small" numberOfLines={1}>
          {item.productGroupName} — Bulk {item.packSize}-Pack
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
          {summary}
        </ThemedText>
      </View>
    </View>
  );
}

function ProofUploadModal({
  visible,
  isUploading,
  onPickCamera,
  onPickLibrary,
  onClose,
}: {
  visible: boolean;
  isUploading: boolean;
  onPickCamera: () => void;
  onPickLibrary: () => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <ThemedView style={styles.modalSheet}>
          <View style={styles.modalContent}>
            <ThemedText type="smallBold">Add Unboxing Proof</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              A photo or video showing the item as received helps us process your return faster.
            </ThemedText>

            {isUploading ? (
              <ActivityIndicator style={styles.modalSpinner} />
            ) : (
              <>
                <Pressable onPress={onPickCamera} style={styles.primaryButton}>
                  <ThemedText type="smallBold" style={styles.primaryButtonText}>
                    Take Photo/Video
                  </ThemedText>
                </Pressable>
                <Pressable onPress={onPickLibrary} style={styles.secondaryButton}>
                  <ThemedText type="smallBold">Choose from Library</ThemedText>
                </Pressable>
                <Pressable onPress={onClose} hitSlop={4} style={styles.skipButton}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Skip for now
                  </ThemedText>
                </Pressable>
              </>
            )}
          </View>
        </ThemedView>
      </View>
    </Modal>
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
  itemList: {
    gap: Spacing.two,
  },
  itemRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  bulkItemThumb: {
    width: 40,
    height: 40,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(79,70,229,0.12)',
  },
  bulkItemEmoji: {
    fontSize: 20,
  },
  returnStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  returnStatusText: {
    color: '#16a34a',
  },
  returnLink: {
    color: '#3c87f7',
  },
  returnError: {
    color: '#dc2626',
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: Spacing.five,
    borderTopRightRadius: Spacing.five,
  },
  modalContent: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  modalSpinner: {
    marginVertical: Spacing.four,
  },
  primaryButton: {
    backgroundColor: '#3c87f7',
    borderRadius: Spacing.five,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
  },
  secondaryButton: {
    borderRadius: Spacing.five,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.3)',
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
});

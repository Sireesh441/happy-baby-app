import { Stack, useRouter } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { ProductCard } from '@/components/product-card';
import { ProductCardSkeleton } from '@/components/skeleton';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useWishlist } from '@/context/wishlist-context';

const SKELETON_COUNT = 4;

export default function WishlistScreen() {
  const router = useRouter();
  const { items, isLoaded } = useWishlist();

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Wishlist' }} />
      {!isLoaded ? (
        <View style={styles.skeletonGrid}>
          {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
            <ProductCardSkeleton key={index} style={styles.skeletonCard} />
          ))}
        </View>
      ) : items.length === 0 ? (
        <EmptyState
          emoji="🤍"
          title="Your wishlist is empty"
          message="Tap the heart on any product to save it here."
          actionLabel="Continue Shopping"
          onAction={() => router.push('/')}
        />
      ) : (
        <FlatList
          style={styles.grid}
          data={items}
          keyExtractor={(item) => String(item.productId)}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => <ProductCard product={item.product} style={styles.gridCard} />}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skeletonGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: Spacing.three,
    gap: Spacing.two,
  },
  skeletonCard: {
    width: '47%',
  },
  grid: {
    flex: 1,
  },
  listContent: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  row: {
    gap: Spacing.two,
  },
  gridCard: {
    flex: 1,
  },
});

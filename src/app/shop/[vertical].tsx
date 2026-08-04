import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ErrorState } from '@/components/error-state';
import { ProductCard } from '@/components/product-card';
import { ProductCardSkeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { fetchProducts, type Product, type ProductVertical } from '@/lib/api';

const SKELETON_COUNT = 6;

const VERTICAL_LABELS: Record<ProductVertical, string> = {
  kids: 'Kids',
  men: 'Men',
  women: 'Women',
};

const ALL_CATEGORY = 'All';
const ALL_CATEGORY_EMOJI = '🛍️';

function isProductVertical(value: string): value is ProductVertical {
  return value === 'kids' || value === 'men' || value === 'women';
}

type CategoryTab = {
  name: string;
  emoji: string;
};

export default function ShopScreen() {
  const { vertical: rawVertical } = useLocalSearchParams<{ vertical: string }>();

  const vertical = rawVertical && isProductVertical(rawVertical) ? rawVertical : undefined;
  const title = vertical ? VERTICAL_LABELS[vertical] : 'Shop';

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORY);
  const [retryKey, setRetryKey] = useState(0);

  // Fetched once per vertical; category taps below just filter this in memory
  // so switching categories never re-hits the network or reloads the screen.
  useEffect(() => {
    if (!vertical) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setHasError(false);
    setSelectedCategory(ALL_CATEGORY);

    fetchProducts({ vertical })
      .then((results) => {
        if (!cancelled) setProducts(results);
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
  }, [vertical, retryKey]);

  const categories = useMemo<CategoryTab[]>(() => {
    const seen = new Map<string, string>();
    for (const product of products) {
      if (!seen.has(product.category)) {
        seen.set(product.category, product.emoji);
      }
    }
    return [
      { name: ALL_CATEGORY, emoji: ALL_CATEGORY_EMOJI },
      ...Array.from(seen, ([name, emoji]) => ({ name, emoji })),
    ];
  }, [products]);

  const visibleProducts = useMemo(() => {
    if (selectedCategory === ALL_CATEGORY) return products;
    return products.filter((product) => product.category === selectedCategory);
  }, [products, selectedCategory]);

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title }} />

      {!vertical ? (
        <View style={styles.statusContainer}>
          <ThemedText themeColor="textSecondary">Unknown shop category.</ThemedText>
        </View>
      ) : isLoading ? (
        <View style={styles.skeletonGrid}>
          {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
            <ProductCardSkeleton key={index} style={styles.skeletonCard} />
          ))}
        </View>
      ) : hasError ? (
        <ErrorState message="Couldn't load products. Check your connection." onRetry={() => setRetryKey((k) => k + 1)} />
      ) : (
        <View style={styles.body}>
          <ThemedView type="backgroundElement" style={styles.rail}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.railContent}>
              {categories.map((category) => (
                <CategoryRailItem
                  key={category.name}
                  category={category}
                  isSelected={category.name === selectedCategory}
                  onPress={() => setSelectedCategory(category.name)}
                />
              ))}
            </ScrollView>
          </ThemedView>

          <FlatList
            key={selectedCategory}
            style={styles.grid}
            data={visibleProducts}
            keyExtractor={(item) => String(item.id)}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.statusContainer}>
                <ThemedText themeColor="textSecondary">No products in this category.</ThemedText>
              </View>
            }
            renderItem={({ item }) => <ProductCard product={item} style={styles.gridCard} />}
          />
        </View>
      )}
    </ThemedView>
  );
}

function CategoryRailItem({
  category,
  isSelected,
  onPress,
}: {
  category: CategoryTab;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.railItemWrapper}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}>
      <ThemedView type={isSelected ? 'backgroundSelected' : 'background'} style={styles.railIconTile}>
        <ThemedText style={styles.railEmoji}>{category.emoji}</ThemedText>
      </ThemedView>
      <ThemedText
        type={isSelected ? 'smallBold' : 'small'}
        themeColor={isSelected ? 'text' : 'textSecondary'}
        numberOfLines={2}
        style={styles.railLabel}>
        {category.name}
      </ThemedText>
    </Pressable>
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
    paddingVertical: Spacing.six,
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
  body: {
    flex: 1,
    flexDirection: 'row',
  },
  rail: {
    width: 92,
  },
  railContent: {
    paddingVertical: Spacing.three,
    gap: Spacing.three,
    alignItems: 'center',
  },
  railItemWrapper: {
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.one,
  },
  railIconTile: {
    width: 44,
    height: 44,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  railEmoji: {
    fontSize: 20,
  },
  railLabel: {
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 14,
    width: 76,
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

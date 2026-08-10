import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ErrorState } from '@/components/error-state';
import { ProductCard } from '@/components/product-card';
import { ProductCardSkeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { fetchCategories, fetchProducts, type ProductListItem, type ProductVertical } from '@/lib/api';

const SKELETON_COUNT = 6;

// The only category that expands in the rail -- must match the name
// GET /api/categories returns for the Clothing entry in every vertical
// (kids/men/women all use the literal category name "Clothing").
const EXPANDABLE_CATEGORY = 'Clothing';

// Matches the vertical brand names shown in the web app's Header component
// (app/components/Header.tsx's BRAND map) so each vertical's shop screen
// carries its own brand identity, parallel to Happy Men/Happy Women.
const VERTICAL_LABELS: Record<ProductVertical, string> = {
  kids: 'Happy Baby',
  men: 'Happy Men',
  women: 'Happy Women',
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

  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORY);
  const [retryKey, setRetryKey] = useState(0);

  // Clothing's subcategory list for the current vertical, from
  // GET /api/categories. Non-critical: if this fetch fails, Clothing just
  // doesn't expand into anything -- the rest of the screen (including
  // browsing Clothing as a whole) still works, so this has no loading/error
  // UI of its own and isn't part of the isLoading/hasError gate above.
  const [clothingSubcategories, setClothingSubcategories] = useState<string[]>([]);
  // Which top-level rail category is currently expanded (only ever
  // EXPANDABLE_CATEGORY in practice, since nothing else has subcategories).
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  // A tapped subcategory, refining selectedCategory (always "Clothing" when
  // this is set) further. Cleared whenever a top-level category is tapped.
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);

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
    setExpandedCategory(null);
    setSelectedSubcategory(null);

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

    fetchCategories(vertical)
      .then((results) => {
        if (cancelled) return;
        const clothing = results.find((c) => c.name === EXPANDABLE_CATEGORY);
        setClothingSubcategories(clothing?.subcategories ?? []);
      })
      .catch(() => {
        if (!cancelled) setClothingSubcategories([]);
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
    if (selectedSubcategory) {
      return products.filter(
        (product) => product.category === selectedCategory && product.subcategory === selectedSubcategory
      );
    }
    return products.filter((product) => product.category === selectedCategory);
  }, [products, selectedCategory, selectedSubcategory]);

  // Tapping a top-level rail item. Clothing toggles its own expansion
  // (tapping it again while expanded collapses it); every other category
  // just selects normally and makes sure Clothing's list is collapsed, per
  // "other top-level categories stay collapsed below."
  function handleCategoryPress(name: string) {
    setSelectedSubcategory(null);
    setSelectedCategory(name);
    if (name === EXPANDABLE_CATEGORY) {
      setExpandedCategory((current) => (current === EXPANDABLE_CATEGORY ? null : EXPANDABLE_CATEGORY));
    } else {
      setExpandedCategory(null);
    }
  }

  function handleSubcategoryPress(subcategory: string) {
    setSelectedCategory(EXPANDABLE_CATEGORY);
    setSelectedSubcategory(subcategory);
    // Stays expanded -- picking a subcategory shouldn't collapse the list
    // you're actively choosing from.
    setExpandedCategory(EXPANDABLE_CATEGORY);
  }

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
              {categories.map((category) => {
                const isExpandable = category.name === EXPANDABLE_CATEGORY && clothingSubcategories.length > 0;
                const isExpanded = isExpandable && expandedCategory === EXPANDABLE_CATEGORY;
                return (
                  <View key={category.name} style={styles.railItemGroup}>
                    <CategoryRailItem
                      category={category}
                      isSelected={category.name === selectedCategory}
                      onPress={() => handleCategoryPress(category.name)}
                    />
                    {isExpanded && (
                      <View style={styles.subcategoryList}>
                        {clothingSubcategories.map((subcategory) => (
                          <SubcategoryRailItem
                            key={subcategory}
                            label={subcategory}
                            isSelected={selectedSubcategory === subcategory}
                            onPress={() => handleSubcategoryPress(subcategory)}
                          />
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </ThemedView>

          <FlatList
            key={`${selectedCategory}:${selectedSubcategory ?? ''}`}
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

// A single subcategory row, stacked beneath Clothing once it's expanded.
// Deliberately plainer than CategoryRailItem (no icon tile, no bold pill) so
// the rail visually reads as "Clothing, then its subcategories indented
// under it" rather than a second row of equally-weighted top-level items.
function SubcategoryRailItem({
  label,
  isSelected,
  onPress,
}: {
  label: string;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.subcategoryItem, pressed && styles.subcategoryItemPressed]}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}>
      <ThemedText
        type={isSelected ? 'smallBold' : 'small'}
        themeColor={isSelected ? 'text' : 'textSecondary'}
        numberOfLines={2}
        style={styles.railLabel}>
        {label}
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
  railItemGroup: {
    alignItems: 'center',
    width: '100%',
  },
  railItemWrapper: {
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.one,
  },
  subcategoryList: {
    marginTop: Spacing.two,
    gap: Spacing.two,
    alignItems: 'center',
  },
  subcategoryItem: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.one,
  },
  subcategoryItemPressed: {
    opacity: 0.6,
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

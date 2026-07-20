import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Keyboard, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProductThumbnail } from '@/components/product-thumbnail';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useTheme } from '@/hooks/use-theme';
import { fetchProducts, type Product, type ProductVertical } from '@/lib/api';

const VERTICALS: { key: ProductVertical; label: string; emoji: string; color: string }[] = [
  { key: 'kids', label: 'Kids', emoji: '🧸', color: '#fce7f3' },
  { key: 'men', label: 'Men', emoji: '👔', color: '#e0f2fe' },
  { key: 'women', label: 'Women', emoji: '👗', color: '#ffe4e6' },
];

const MAX_SUGGESTIONS = 6;

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();

  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const debouncedQuery = useDebouncedValue(query.trim(), 300);

  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!debouncedQuery) {
      setSuggestions([]);
      setIsLoading(false);
      setHasError(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setHasError(false);

    fetchProducts({ search: debouncedQuery })
      .then((results) => {
        if (!cancelled) setSuggestions(results.slice(0, MAX_SUGGESTIONS));
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
  }, [debouncedQuery]);

  const showDropdown = isFocused && debouncedQuery.length > 0;

  function goToVertical(vertical: ProductVertical) {
    setIsFocused(false);
    Keyboard.dismiss();
    router.push({ pathname: '/shop/[vertical]', params: { vertical } });
  }

  function closeDropdown() {
    setIsFocused(false);
    Keyboard.dismiss();
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <View>
          <ThemedText type="title" style={styles.brand}>
            HappyBaby
          </ThemedText>
          <ThemedText themeColor="textSecondary">Everything for your family, in one place.</ThemedText>
        </View>

        <View style={styles.searchSection}>
          <ThemedView type="backgroundElement" style={styles.searchBar}>
            <SymbolView
              name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
              size={18}
              tintColor={theme.textSecondary}
            />
            <TextInput
              value={query}
              onChangeText={setQuery}
              onFocus={() => setIsFocused(true)}
              placeholder="Search products..."
              placeholderTextColor={theme.textSecondary}
              style={[styles.searchInput, { color: theme.text }]}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
            />
            {query.length > 0 && (
              <Pressable
                onPress={() => setQuery('')}
                hitSlop={8}
                accessibilityLabel="Clear search"
                accessibilityRole="button">
                <SymbolView
                  name={{ ios: 'xmark.circle.fill', android: 'close', web: 'close' }}
                  size={18}
                  tintColor={theme.textSecondary}
                />
              </Pressable>
            )}
          </ThemedView>

          {showDropdown && (
            <ThemedView type="backgroundElement" style={styles.dropdown}>
              {isLoading ? (
                <ActivityIndicator style={styles.dropdownStatus} color={theme.textSecondary} />
              ) : hasError ? (
                <ThemedText themeColor="textSecondary" style={styles.dropdownStatus}>
                  Couldn&apos;t load suggestions. Check your connection.
                </ThemedText>
              ) : suggestions.length === 0 ? (
                <ThemedText themeColor="textSecondary" style={styles.dropdownStatus}>
                  No products found for &quot;{debouncedQuery}&quot;
                </ThemedText>
              ) : (
                suggestions.map((product) => (
                  <Pressable
                    key={product.id}
                    onPress={() => goToVertical(product.vertical)}
                    style={({ pressed }) => [styles.suggestionRow, pressed && styles.pressed]}>
                    <ProductThumbnail product={product} size={40} />
                    <View style={styles.suggestionText}>
                      <ThemedText numberOfLines={1}>{product.name}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                        {product.category}
                      </ThemedText>
                    </View>
                    <ThemedText type="smallBold">₹{product.price}</ThemedText>
                  </Pressable>
                ))
              )}
            </ThemedView>
          )}
        </View>

        {showDropdown && <Pressable style={styles.backdrop} onPress={closeDropdown} />}

        <View style={styles.verticalSection}>
          <ThemedText type="smallBold">Shop by</ThemedText>
          <View style={styles.verticalRow}>
            {VERTICALS.map((vertical) => (
              <Pressable
                key={vertical.key}
                onPress={() => goToVertical(vertical.key)}
                style={({ pressed }) => [styles.verticalCardWrapper, pressed && styles.pressed]}>
                <ThemedView type="backgroundElement" style={styles.verticalCard}>
                  <View style={[styles.verticalIconTile, { backgroundColor: vertical.color }]}>
                    <ThemedText style={styles.verticalEmoji}>{vertical.emoji}</ThemedText>
                  </View>
                  <ThemedText type="smallBold">{vertical.label}</ThemedText>
                </ThemedView>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Platform.select({ web: Spacing.six, default: Spacing.four }),
    gap: Spacing.five,
  },
  brand: {
    fontSize: 32,
    lineHeight: 38,
  },
  searchSection: {
    position: 'relative',
    zIndex: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.one,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: Spacing.two,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.one,
    maxHeight: 320,
    overflow: 'hidden',
  },
  dropdownStatus: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
    textAlign: 'center',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  suggestionText: {
    flex: 1,
    gap: 2,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  verticalSection: {
    gap: Spacing.three,
  },
  verticalRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  verticalCardWrapper: {
    flex: 1,
  },
  verticalCard: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.four,
    borderRadius: Spacing.four,
  },
  verticalIconTile: {
    width: 56,
    height: 56,
    borderRadius: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verticalEmoji: {
    fontSize: 28,
  },
  pressed: {
    opacity: 0.7,
  },
});

import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, type DimensionValue, type ViewStyle } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SkeletonProps = {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle;
};

export function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, easing: Easing.ease, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, easing: Easing.ease, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: theme.backgroundSelected, opacity },
        style,
      ]}
    />
  );
}

/** Matches ProductCard's shape -- used by the shop grid and wishlist grid. */
export function ProductCardSkeleton({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.card, style]}>
      <Skeleton width={56} height={56} borderRadius={Spacing.three} style={styles.thumbnail} />
      {/* Reserves roughly the same height as ProductCard's two-line name
          (minHeight: 40) so swapping in real text doesn't jump the layout. */}
      <Skeleton height={36} style={styles.line} />
      <Skeleton width="60%" height={14} />
      <Skeleton width="40%" height={18} style={styles.priceLine} />
      <Skeleton height={36} borderRadius={Spacing.five} style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.four,
    padding: Spacing.two,
    gap: Spacing.two,
  },
  thumbnail: {
    alignSelf: 'center',
    marginBottom: Spacing.one,
  },
  line: {
    marginTop: Spacing.one,
  },
  priceLine: {
    marginTop: Spacing.one,
  },
  button: {
    marginTop: Spacing.one,
  },
});

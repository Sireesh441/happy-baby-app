import { useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { getTileColor } from '@/components/product-thumbnail';

type ProductImageCarouselProps = {
  images: string[];
  emoji: string;
  color: string;
  height?: number;
};

export function ProductImageCarousel({ images, emoji, color, height = 320 }: ProductImageCarouselProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const tileColor = getTileColor(color);

  function handleLayout(event: LayoutChangeEvent) {
    setContainerWidth(event.nativeEvent.layout.width);
  }

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (!containerWidth) return;
    setActiveIndex(Math.round(event.nativeEvent.contentOffset.x / containerWidth));
  }

  if (images.length === 0) {
    return (
      <View
        onLayout={handleLayout}
        style={[
          styles.fallback,
          {
            height,
            backgroundColor: tileColor,
            experimental_backgroundImage: `linear-gradient(135deg, ${tileColor}, #ffffff)`,
          },
        ]}>
        <ThemedText style={{ fontSize: height * 0.35 }}>{emoji}</ThemedText>
      </View>
    );
  }

  return (
    <View onLayout={handleLayout} style={{ height }}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}>
        {images.map((uri, index) => (
          <Image
            key={`${uri}-${index}`}
            source={{ uri }}
            style={{ width: containerWidth, height }}
            resizeMode="cover"
          />
        ))}
      </ScrollView>

      {images.length > 1 && (
        <View style={styles.dots}>
          {images.map((_, index) => (
            <View key={index} style={[styles.dot, index === activeIndex && styles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  dotActive: {
    backgroundColor: '#ffffff',
    width: 16,
  },
});

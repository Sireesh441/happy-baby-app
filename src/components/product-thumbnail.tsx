import { StyleSheet, Text, View, type ViewProps } from 'react-native';

import type { Product } from '@/lib/api';

// The backend describes each product's tile color as a Tailwind class name;
// map the ones it actually sends to hex since Tailwind classes don't apply here.
const TILE_COLORS: Record<string, string> = {
  'bg-sky-100': '#e0f2fe',
  'bg-amber-100': '#fef3c7',
  'bg-pink-100': '#fce7f3',
  'bg-emerald-100': '#d1fae5',
  'bg-violet-100': '#ede9fe',
  'bg-slate-100': '#f1f5f9',
  'bg-indigo-100': '#e0e7ff',
  'bg-rose-100': '#ffe4e6',
  'bg-fuchsia-100': '#fae8ff',
};
const DEFAULT_TILE_COLOR = '#f1f5f9';

export function getTileColor(color: string): string {
  return TILE_COLORS[color] ?? DEFAULT_TILE_COLOR;
}

type ProductThumbnailProps = ViewProps & {
  product: Pick<Product, 'emoji' | 'color'>;
  size?: number;
};

export function ProductThumbnail({ product, size = 48, style, ...rest }: ProductThumbnailProps) {
  return (
    <View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          borderRadius: size / 4,
          backgroundColor: getTileColor(product.color),
        },
        style,
      ]}
      {...rest}>
      <Text style={{ fontSize: size * 0.5 }}>{product.emoji}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

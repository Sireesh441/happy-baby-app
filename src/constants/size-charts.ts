import type { ProductVertical } from '@/lib/api';
import type { SizeChartEntry } from '@/lib/fit-engine-api';

// No product has real per-item measurement data yet -- happy-baby's
// Product.sizes only tracks stock quantity/availability per size, not
// height/weight/chest ranges. These are generic, standardized reference
// charts per vertical (not specific to any one product), good enough for a
// size *recommendation*. Replace with real per-product charts once that
// data exists.
const KIDS_SIZE_CHART: SizeChartEntry[] = [
  { size: '0-3M', heightCm: [50, 61] },
  { size: '3-6M', heightCm: [61, 68] },
  { size: '6-12M', heightCm: [68, 76] },
  { size: '1-2Y', heightCm: [76, 88] },
  { size: '2-3Y', heightCm: [88, 98] },
  { size: '3-4Y', heightCm: [98, 106] },
  { size: '4-5Y', heightCm: [106, 114] },
  { size: '5-6Y', heightCm: [114, 122] },
  { size: '6-7Y', heightCm: [122, 128] },
  { size: '7-8Y', heightCm: [128, 134] },
];

const MEN_SIZE_CHART: SizeChartEntry[] = [
  { size: 'S', heightCm: [163, 173], chestCm: [86, 94], waistCm: [71, 79] },
  { size: 'M', heightCm: [170, 178], chestCm: [94, 102], waistCm: [79, 87] },
  { size: 'L', heightCm: [175, 183], chestCm: [102, 110], waistCm: [87, 97] },
  { size: 'XL', heightCm: [178, 188], chestCm: [110, 118], waistCm: [97, 107] },
  { size: 'XXL', heightCm: [180, 193], chestCm: [118, 128], waistCm: [107, 117] },
];

const WOMEN_SIZE_CHART: SizeChartEntry[] = [
  { size: 'XS', heightCm: [150, 160], chestCm: [78, 84], waistCm: [60, 66], hipCm: [86, 92] },
  { size: 'S', heightCm: [155, 165], chestCm: [84, 90], waistCm: [66, 72], hipCm: [92, 98] },
  { size: 'M', heightCm: [158, 168], chestCm: [90, 96], waistCm: [72, 78], hipCm: [98, 104] },
  { size: 'L', heightCm: [160, 170], chestCm: [96, 104], waistCm: [78, 86], hipCm: [104, 112] },
  { size: 'XL', heightCm: [163, 175], chestCm: [104, 112], waistCm: [86, 96], hipCm: [112, 122] },
];

export function getSizeChartForVertical(vertical: ProductVertical): SizeChartEntry[] {
  switch (vertical) {
    case 'kids':
      return KIDS_SIZE_CHART;
    case 'men':
      return MEN_SIZE_CHART;
    case 'women':
      return WOMEN_SIZE_CHART;
  }
}

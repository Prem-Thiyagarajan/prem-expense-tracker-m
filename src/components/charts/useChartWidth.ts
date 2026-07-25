import { useCallback, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';

/**
 * Measures a chart container's width via onLayout so SVGs can render in crisp
 * real pixels instead of relying on viewBox scaling (which stretches strokes).
 * Shared primitive for all "Pocket" charts — reused by Trends (M5).
 *
 * Usage: `const { width, onLayout } = useChartWidth();` then spread onLayout on
 * the wrapping <View> and only draw once `width > 0`.
 */
export function useChartWidth() {
  const [width, setWidth] = useState(0);
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    // Ignore sub-pixel jitter to avoid re-render loops.
    setWidth((prev) => (Math.abs(prev - w) > 0.5 ? w : prev));
  }, []);
  return { width, onLayout };
}

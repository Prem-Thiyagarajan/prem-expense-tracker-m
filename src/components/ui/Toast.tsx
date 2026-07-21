import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';
import { AppText } from './AppText';

type ToastContextValue = { show: (message: string) => void };
const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Toasts: ink pill (inverted in dark), bottom-center above the tab bar,
 * auto-dismiss ~2.2s (README §Interactions).
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState<string | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (msg: string) => {
      if (timer.current) clearTimeout(timer.current);
      setMessage(msg);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
      timer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(
          ({ finished }) => finished && setMessage(null),
        );
      }, 2200);
    },
    [opacity],
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  // Ink pill inverts in dark: use ink bg + bg-colored text.
  const pillBg = t.colors.ink;
  const pillText = t.colors.bg;

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {message !== null && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: insets.bottom + 96, // above the tab bar
            alignItems: 'center',
          }}
        >
          <Animated.View
            style={{
              opacity,
              transform: [
                {
                  translateY: opacity.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }),
                },
              ],
              backgroundColor: pillBg,
              paddingVertical: 10,
              paddingHorizontal: 18,
              borderRadius: t.radius.pill,
              maxWidth: '86%',
            }}
          >
            <AppText variant="bodySemi" color={pillText} numberOfLines={2}>
              {message}
            </AppText>
          </Animated.View>
        </View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Optional fixed height; otherwise the sheet hugs its content. */
  style?: ViewStyle;
};

/**
 * Bottom sheet: cream bg, 2px top border, 28 top radius, drag grabber, sliding
 * up over a 45% ink scrim. Tapping the scrim closes it.
 */
export function BottomSheet({ visible, onClose, children, style }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(1)).current; // 0 = shown, 1 = hidden
  const scrim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scrim, { toValue: 1, duration: 260, useNativeDriver: true }),
      ]).start();
    } else {
      translateY.setValue(1);
      scrim.setValue(0);
    }
  }, [visible, translateY, scrim]);

  const sheetTranslate = translateY.interpolate({ inputRange: [0, 1], outputRange: [0, 600] });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'flex-end' }}
      >
        <Animated.View
          style={{
            ...StyleSheetAbsolute,
            backgroundColor: t.colors.scrim,
            opacity: scrim,
          }}
        >
          <Pressable style={{ flex: 1 }} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[
            {
              backgroundColor: t.colors.bg,
              borderTopWidth: 2,
              borderColor: t.colors.line,
              borderTopLeftRadius: t.radius.sheet,
              borderTopRightRadius: t.radius.sheet,
              paddingBottom: insets.bottom + t.spacing.lg,
              paddingHorizontal: t.spacing.lg,
              transform: [{ translateY: sheetTranslate }],
            },
            style,
          ]}
        >
          {/* Drag grabber: 44×5, ink at 25% */}
          <View style={{ alignItems: 'center', paddingTop: t.spacing.md, paddingBottom: t.spacing.sm }}>
            <View
              style={{
                width: 44,
                height: 5,
                borderRadius: 3,
                backgroundColor: t.colors.ink,
                opacity: 0.25,
              }}
            />
          </View>
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const StyleSheetAbsolute = {
  position: 'absolute' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};

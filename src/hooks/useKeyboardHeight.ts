import { useEffect, useState } from 'react';
import { Dimensions, Keyboard, Platform, type KeyboardEvent } from 'react-native';

/**
 * How much of the screen the keyboard covers from the bottom, or 0 when hidden.
 *
 * Derived from `endCoordinates.screenY` (the keyboard's top edge) rather than
 * `endCoordinates.height`. On device those disagree: `height` reported only the
 * key area and excluded the IME's suggestion strip, which left the composer
 * clipped by exactly the height of that strip. `screenY` is the real top edge
 * whatever the IME chooses to draw, and it is the value `Screen` already uses
 * to decide how far to scroll a focused input.
 *
 * Needed because `KeyboardAvoidingView` does not work on Android here: the app
 * has been edge-to-edge since SDK 54, so the window no longer resizes for the
 * IME and there is nothing for the view to avoid — anything pinned to the
 * bottom simply ends up behind the keyboard. `Screen` already solves this the
 * same way for scrolling forms; this hook is that logic, extracted for screens
 * that pin a bar to the bottom instead.
 *
 * Deliberately no native keyboard library: adding one would be a new native
 * module, which cannot ship over EAS Update and would force a fresh build.
 */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    // iOS emits "will" events so padding lands with the animation; Android
    // only emits "did".
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const show = Keyboard.addListener(showEvent, (e: KeyboardEvent) => {
      const end = e.endCoordinates;
      if (!end) return;
      // Read the height per event so a rotation mid-session stays correct.
      const screenHeight = Dimensions.get('screen').height;
      const covered = screenHeight - end.screenY;
      // Fall back to `height` if screenY looks implausible (some IMEs report 0).
      setHeight(covered > 0 ? covered : (end.height ?? 0));
    });
    const hide = Keyboard.addListener(hideEvent, () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return height;
}

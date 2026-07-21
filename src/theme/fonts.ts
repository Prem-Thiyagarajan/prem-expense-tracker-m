import {
  useFonts,
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  Archivo_400Regular,
  Archivo_500Medium,
  Archivo_600SemiBold,
  Archivo_700Bold,
} from '@expo-google-fonts/archivo';
import { ArchivoBlack_400Regular } from '@expo-google-fonts/archivo-black';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';

/**
 * Loads every Pocket font. The keys here MUST match `fontFamily` in tokens.ts.
 * Returns [loaded, error] from expo-font's useFonts.
 */
export function useAppFonts() {
  return useFonts({
    Bricolage_600: BricolageGrotesque_600SemiBold,
    Bricolage_700: BricolageGrotesque_700Bold,
    Bricolage_800: BricolageGrotesque_800ExtraBold,
    Archivo_400: Archivo_400Regular,
    Archivo_500: Archivo_500Medium,
    Archivo_600: Archivo_600SemiBold,
    Archivo_700: Archivo_700Bold,
    ArchivoBlack: ArchivoBlack_400Regular,
    JetBrainsMono_400: JetBrainsMono_400Regular,
    JetBrainsMono_500: JetBrainsMono_500Medium,
    JetBrainsMono_700: JetBrainsMono_700Bold,
  });
}

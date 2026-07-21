import * as SecureStore from 'expo-secure-store';

/**
 * JWT storage backed by the device keychain/keystore (NEVER AsyncStorage or
 * localStorage — per the handoff's state-management notes).
 */
const TOKEN_KEY = 'pft.access_token';

export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

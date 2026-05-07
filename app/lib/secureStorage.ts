// JS bridge for the iOS Keychain-backed SecureStorage Capacitor plugin.
//
// Used by capacitorBoot.ts to swap the auth-token storage from localStorage
// (in-WebView, can be cleared under iOS storage pressure) to the system
// Keychain. See setTokenStorage in app/lib/api.ts.
//
// On non-iOS platforms, registerPlugin returns a stub that throws on every
// call — we feature-detect via Capacitor.isPluginAvailable and fall back to
// a synchronous in-memory + localStorage adapter so the swap is never a
// regression on web.

import { Capacitor, registerPlugin } from "@capacitor/core";
import type { TokenStorage } from "@/lib/api";

interface SecureStoragePluginInterface {
  get(opts: { key: string }): Promise<{ value: string | null }>;
  set(opts: { key: string; value: string }): Promise<{ ok: boolean }>;
  remove(opts: { key: string }): Promise<{ ok: boolean }>;
}

const SecureStorage =
  registerPlugin<SecureStoragePluginInterface>("SecureStorage");

export function isSecureStorageAvailable(): boolean {
  return (
    Capacitor.getPlatform() === "ios" &&
    Capacitor.isPluginAvailable("SecureStorage")
  );
}

// Keychain reads are async, but our TokenStorage interface (used in the
// fetch-request path) is sync. We hydrate a single in-memory cache from
// Keychain at boot via primeTokenStorage(), then read/write through it
// synchronously while mirroring writes to Keychain in the background.
//
// This is the same pattern Auth0/Firebase use for their iOS SDKs and is
// safe because:
//   - The cache is only populated after primeTokenStorage() resolves at
//     app boot, which happens before any auth-aware code runs.
//   - Writes go to both the cache and Keychain; if the Keychain write
//     fails the in-memory token still works for the current session.
//   - Reads from cold cache return null (same as a fresh install).

const TOKEN_KEY = "homebase-auth-token";
let cachedToken: string | null = null;
let primed = false;

export async function primeTokenStorage(): Promise<void> {
  if (!isSecureStorageAvailable() || primed) {
    primed = true;
    return;
  }
  try {
    const { value } = await SecureStorage.get({ key: TOKEN_KEY });
    cachedToken = value;
  } catch {
    cachedToken = null;
  }
  primed = true;
}

export const keychainTokenStorage: TokenStorage = {
  get: () => cachedToken,
  set: (token) => {
    cachedToken = token;
    SecureStorage.set({ key: TOKEN_KEY, value: token }).catch(() => undefined);
  },
  clear: () => {
    cachedToken = null;
    SecureStorage.remove({ key: TOKEN_KEY }).catch(() => undefined);
  },
};

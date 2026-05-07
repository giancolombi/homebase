// One-time Capacitor setup at app boot.
//
// Runs only on iOS — every call no-ops on web/Android (Capacitor.getPlatform()
// returns "web" and the plugins themselves no-op when the native bridge is
// missing, but we platform-check first to avoid pointless work).
//
// Order matters: configure StatusBar style before the Splash hides so the
// transition feels deliberate rather than flashing the system default.

import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";
import { setTokenStorage } from "@/lib/api";
import {
  isSecureStorageAvailable,
  keychainTokenStorage,
  primeTokenStorage,
} from "@/lib/secureStorage";

export async function bootCapacitor() {
  if (Capacitor.getPlatform() !== "ios") return;

  // Migrate the auth token to the Keychain-backed storage BEFORE React
  // renders. primeTokenStorage hydrates an in-memory cache from Keychain;
  // setTokenStorage swaps the api/request() reader away from localStorage.
  // If the user is upgrading from an older build whose token still lives
  // in localStorage, copy it over once.
  if (isSecureStorageAvailable()) {
    const legacyToken = localStorage.getItem("homebase-auth-token");
    await primeTokenStorage();
    if (legacyToken && !keychainTokenStorage.get()) {
      keychainTokenStorage.set(legacyToken);
      localStorage.removeItem("homebase-auth-token");
    }
    setTokenStorage(keychainTokenStorage);
  }

  // overlay: true lets the WebView extend under the status bar; our
  // .safe-area-top utility pushes the mobile header down by the system inset.
  // Style.Default follows the system light/dark mode, which matches how
  // our CSS variables already cascade.
  try {
    await StatusBar.setOverlaysWebView({ overlay: true });
    await StatusBar.setStyle({ style: Style.Default });
  } catch {
    // Plugin not available (e.g. running web app) — ignore.
  }

  try {
    await SplashScreen.hide();
  } catch {
    // ignore
  }
}

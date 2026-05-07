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
import { setApiBaseUrl, setTokenStorage } from "@/lib/api";
import {
  isSecureStorageAvailable,
  keychainTokenStorage,
  primeTokenStorage,
} from "@/lib/secureStorage";

// Where the iOS app talks to. Override at build time with
// VITE_API_BASE_URL when pointing the bundled app at staging or local
// dev (e.g. `VITE_API_BASE_URL=http://192.168.1.42:3001 pnpm cap:sync`
// to test against a local API on your dev machine from a real iPhone).
const IOS_API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://gethomebase.dev";

export async function bootCapacitor() {
  if (Capacitor.getPlatform() !== "ios") return;

  // Point /api/* fetches at the live API server. The WebView origin is
  // `capacitor://localhost`, so relative paths would 404. Must run BEFORE
  // any auth-aware code (AuthContext kicks off a /me fetch on mount).
  setApiBaseUrl(IOS_API_BASE_URL);

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

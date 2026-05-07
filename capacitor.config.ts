import type { CapacitorConfig } from "@capacitor/cli";

// Capacitor configuration for the iOS Homebase app.
//
// We intentionally bundle the SPA assets (`webDir: "dist"`) rather than
// pointing `server.url` at production. Reasons:
//   - App Store Review prefers bundled assets
//   - Lets the app start offline / with a flaky connection
//   - Universal Links + EventKit sync still hit gethomebase.dev for data,
//     so live UI changes still reach users via the API/data layer
//
// To iterate against the live web during development without rebuilding,
// flip `server.url` to "https://gethomebase.dev" temporarily. Don't ship
// that — it disables JS bundling and breaks offline behavior.
const config: CapacitorConfig = {
  appId: "dev.gethomebase.app",
  appName: "Homebase",
  webDir: "dist",
  ios: {
    contentInset: "always",
    // Allow the WebView to load resources from gethomebase.dev (API calls)
    // even though the assets themselves are bundled.
    allowsLinkPreview: false,
    backgroundColor: "#ffffff",
  },
  // Plugin configuration goes here as plugins are added (push, browser,
  // status bar). Per-plugin defaults live in each plugin's docs.
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      launchAutoHide: true,
      backgroundColor: "#ffffff",
      androidSplashResourceName: "splash",
    },
  },
};

export default config;

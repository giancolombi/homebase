import { Capacitor } from "@capacitor/core";
import { devices } from "@/lib/api";

// Register the device for APNs push on iOS and forward the token to the API.
// No-ops on web/Android. Best-effort: a failed devices.register (e.g. not yet
// signed in) is swallowed; the token re-registers on the next cold start.
export async function initPushNotifications(): Promise<void> {
  if (Capacitor.getPlatform() !== "ios") return;
  if (!Capacitor.isPluginAvailable("PushNotifications")) return;

  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");

    await PushNotifications.addListener("registration", (token) => {
      devices.register(token.value, "ios").catch(() => undefined);
    });
    await PushNotifications.addListener("registrationError", (err) => {
      console.warn("Push registration error:", err);
    });

    const perm = await PushNotifications.requestPermissions();
    if (perm.receive !== "granted") return;
    await PushNotifications.register();
  } catch (err) {
    console.warn("Push init failed:", err);
  }
}

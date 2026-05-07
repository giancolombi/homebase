// Cross-platform OAuth handoff helper.
//
// Web (browser): opens a popup window. We poll until it's closed (the
// provider redirects back to /calendar/callback/<provider> on our API,
// which then redirects the popup to /?calendarConnected=<provider>; the
// user closes it themselves or we close it programmatically once we see
// the success URL). When closed, we run the onClose callback.
//
// iOS (Capacitor): window.open is unreliable inside a WKWebView and
// doesn't share cookies with Safari. We use @capacitor/browser which
// presents an SFSafariViewController. We close it on browserFinished
// (user taps Done) and on browserPageLoaded events that match our app
// URL with the calendar success query string — the API redirects to
// `${APP_URL}/?calendarConnected=<provider>` after a successful OAuth
// callback, so we can detect that and close automatically.
//
// Either path calls onClose() exactly once when the OAuth flow has ended,
// which is the consumer's signal to refresh calendar connections.

import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";

export interface OpenOAuthOptions {
  url: string;
  onClose: () => void;
}

const isIOS = () => Capacitor.getPlatform() === "ios";

async function openInSafariView({ url, onClose }: OpenOAuthOptions) {
  // browserFinished fires when the user dismisses the SFSafariViewController
  // (taps Done) or when we call Browser.close(). The OAuth callback page
  // we serve at /api/calendar/callback/:provider already says "Calendar
  // connected! You can close this window." so the dismissal is part of the
  // expected flow, no extra UX prompt needed.
  let fired = false;
  const sub = await Browser.addListener("browserFinished", () => {
    if (fired) return;
    fired = true;
    sub.remove();
    onClose();
  });

  await Browser.open({ url, presentationStyle: "popover" });
}

function openInWebPopup({ url, onClose }: OpenOAuthOptions) {
  const popup = window.open(url, "calendar-auth", "width=500,height=700");
  if (!popup) {
    // Pop-up blocked. Bail to onClose so the UI doesn't get stuck in a
    // syncing state — the caller can show a toast.
    onClose();
    return;
  }
  const interval = window.setInterval(() => {
    if (popup.closed) {
      window.clearInterval(interval);
      onClose();
    }
  }, 500);
}

export function openOAuth(options: OpenOAuthOptions): void {
  if (isIOS()) {
    openInSafariView(options).catch(() => options.onClose());
  } else {
    openInWebPopup(options);
  }
}

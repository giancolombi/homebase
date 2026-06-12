// Cross-platform OAuth handoff helper.
//
// Web (browser): opens a popup window synchronously (so the browser still
// sees the user gesture even when the URL needs a server round-trip), then
// navigates it once the URL resolves. We poll until the popup is closed —
// the provider redirects back to /api/calendar/callback/<provider>, which
// serves a page that hands the result to the opener and closes itself.
//
// iOS (Capacitor): window.open is unreliable inside a WKWebView and
// doesn't share cookies with Safari. We use @capacitor/browser which
// presents an SFSafariViewController and fires browserFinished when the
// user dismisses it (taps Done) or when Browser.close() is called.
//
// Either path calls onClose() exactly once when the OAuth flow has ended,
// which is the consumer's signal to refresh calendar connections.

import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";

export interface OpenOAuthOptions {
  // The OAuth URL, or a promise resolving to it. getAuthUrl() needs a server
  // round-trip to mint a short-lived handoff token, so callers pass the
  // promise straight through rather than awaiting (which would lose the
  // user-gesture context and trip popup blockers on the web).
  url: string | Promise<string>;
  onClose: () => void;
}

const isIOS = () => Capacitor.getPlatform() === "ios";

// Stop polling a popup that has somehow outlived any plausible OAuth flow.
const POPUP_POLL_TIMEOUT_MS = 10 * 60 * 1000;

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

  await Browser.open({ url: await url, presentationStyle: "popover" });
}

function openInWebPopup({ url, onClose }: OpenOAuthOptions) {
  const popup = window.open(
    "about:blank",
    "calendar-auth",
    "width=500,height=700",
  );
  if (!popup) {
    // Pop-up blocked. Bail to onClose so the UI doesn't get stuck in a
    // syncing state — the caller can show a toast.
    onClose();
    return;
  }

  Promise.resolve(url).then(
    (resolved) => {
      popup.location.href = resolved;
    },
    () => {
      // Couldn't build the OAuth URL (e.g. token mint failed) — close the
      // blank popup rather than stranding it.
      popup.close();
    },
  );

  const startedAt = Date.now();
  const interval = window.setInterval(() => {
    if (popup.closed || Date.now() - startedAt > POPUP_POLL_TIMEOUT_MS) {
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

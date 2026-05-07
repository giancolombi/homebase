import type { Request, Response } from "express";

// Apple App Site Association.
//
// Served at /.well-known/apple-app-site-association so iOS recognizes the
// gethomebase.dev domain as a Universal Link target for the Homebase app.
// When a user taps an invite or password-reset email link on iPhone, iOS
// will open the native app at the matching path instead of Safari.
//
// The `appID` field is `<TeamID>.<BundleID>`. We don't have a Team ID until
// the Apple Developer Program enrollment is active, so the env var lets us
// flip the file on without code changes. Until then it serves an empty
// `applinks.details` array, which is harmless — iOS just doesn't claim the
// domain. Universal Links degrade gracefully to web URLs.
//
// Apple requires this file:
//   - served as application/json
//   - no redirects (302 will fail validation)
//   - reachable at both /.well-known/apple-app-site-association and (legacy)
//     /apple-app-site-association
//   - no .json extension in the URL even though the body is JSON

const BUNDLE_ID = "dev.gethomebase.app";

export function aasaHandler(_req: Request, res: Response) {
  const teamId = process.env.APPLE_TEAM_ID;

  // Path patterns that should open the iOS app when present in a tapped URL.
  const paths = [
    "/accept-invite",
    "/accept-invite/*",
    "/reset-password",
    "/reset-password/*",
    "/calendar",
    "/calendar/*",
    "/tasks",
    "/tasks/*",
    "/meals",
    "/meals/*",
    "/finance",
    "/finance/*",
    "/settings",
    "/settings/*",
  ];

  const body = {
    applinks: {
      details: teamId
        ? [
            {
              appIDs: [`${teamId}.${BUNDLE_ID}`],
              components: paths.map((path) => ({ "/": path })),
            },
          ]
        : [],
    },
    webcredentials: teamId
      ? { apps: [`${teamId}.${BUNDLE_ID}`] }
      : { apps: [] },
  };

  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.send(JSON.stringify(body));
}

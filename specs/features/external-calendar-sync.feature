Feature: External calendar sync (Google, Outlook, Apple)
  Family members can connect their personal calendars so events show on
  the Homebase calendar alongside Homebase-native events. Google and
  Outlook use OAuth (popup → callback). Apple/iCloud uses CalDAV with
  an Apple ID + app-specific password (no OAuth available from Apple).

  # ---- OAuth flow (Google / Outlook) -------------------------------------

  Background:
    Given the user is signed in with a real familyId
    And they're on Settings → Your Calendars

  Scenario: Connect Google Calendar
    When the user clicks "Google"
    Then a popup opens to https://accounts.google.com/o/oauth2/v2/auth
    And the URL includes `state` containing `userId`, `memberId`, `familyId`, `provider`, `returnTo`
    And `prompt=consent` and `access_type=offline` are set (so we always get a refresh token)
    When Google redirects back to /api/calendar/callback/google with `?code=...`
    Then the server exchanges the code for tokens
    And `getUserEmail` is called to pull the connected account's email
    And a row is upserted in `calendar_connections` with `access_token_encrypted`, `refresh_token_encrypted`, `external_email`
    And the popup script sets `window.opener.location.href` to `${APP_URL}${returnTo}?calendarConnected=google`
    And the popup closes
    And the parent shows "Calendar connected" toast

  Scenario: Connect Outlook Calendar
    Same as Google but the auth URL is login.microsoftonline.com/common/oauth2/v2.0/authorize
    And scopes include "Calendars.Read", "User.Read", "offline_access"

  Scenario: User cancels in the OAuth popup
    When Google returns `?error=access_denied`
    Then the popup redirects parent to `${returnTo}?calendarError=access_denied&calendarErrorDescription=...`
    And `formatCalendarError` produces a "Calendar connection cancelled" toast

  Scenario: Enterprise Outlook user blocked by tenant policy
    When Microsoft returns `?error=access_denied&error_description=AADSTS65001...`
    Then the toast title reads "Your IT admin needs to approve Homebase"
    And the description offers an admin-consent path

  Scenario: Provider mismatch in callback (state vs URL provider)
    When the callback URL is /callback/outlook but state.provider is "google"
    Then the server redirects to `${returnTo}?calendarError=provider_mismatch`

  Scenario: returnTo defaults to /settings when not supplied
    Given the auth URL omits `returnTo`
    Then the callback redirects to /settings?calendarConnected=...

  Scenario: returnTo cannot point off-origin
    Given the auth URL has `returnTo=https://evil.com/`
    Then `sanitizeReturnTo` normalizes it to "/settings"

  # ---- Apple / iCloud (CalDAV) -------------------------------------------

  Scenario: Connect Apple Calendar
    When the user clicks "Apple"
    Then the AppleConnectDialog opens (no popup, no OAuth)
    When they enter "user@icloud.com" + a valid app-specific password
    And they submit
    Then `POST /api/calendar/apple/connect` validates against caldav.icloud.com
    And the password is encrypted into `access_token_encrypted`
    And the row is upserted with `provider: "apple"`, `external_email: <appleId>`, far-future `token_expires_at`
    And the dialog closes
    And the connection appears in the providers list with the Apple ID shown

  Scenario: Apple credentials rejected
    When the user enters their regular Apple ID password (not app-specific)
    Then iCloud returns 401
    And the API returns 401 with "make sure you're using an app-specific password"
    And no calendar_connections row is created

  Scenario: Apple sync skips non-event calendars
    Given the user's iCloud account has Reminders + a Family calendar
    When sync runs
    Then only calendars with `components` including `VEVENT` are queried
    And Reminders (VTODO) are ignored

  Scenario: Apple sync handles a calendar that rejects time-range queries
    Given one shared iCloud calendar throws on `fetchCalendarObjects` with timeRange
    Then that one calendar is skipped with a console.warn
    And other calendars still sync successfully

  # ---- Sync mechanics -----------------------------------------------------

  Scenario: Auto-sync stale OAuth connections on calendar mount
    Given a user-connected Google calendar last synced 30 minutes ago
    When `useCalendarSync` mounts
    Then `syncMutation.mutate(connectionId)` fires automatically
    And events are upserted into `synced_calendar_events`
    And `last_synced_at` is updated

  Scenario: Refresh expired OAuth token
    Given an OAuth connection where `token_expires_at` has passed
    When sync is requested
    Then `getValidAccessToken` calls `refreshAccessToken(provider, refreshToken)`
    And the new access token is encrypted and persisted
    And sync continues with the new token

  Scenario: Token refresh fails (revoked grant)
    Given an OAuth connection whose refresh token is no longer valid
    When sync is attempted
    Then the error message includes "invalid_grant"
    And the connection is marked `connected: false`
    And `sync_error` is set on the connection row

  Scenario: Sync succeeded — events upserted, removed events purged
    Given a previous sync wrote 10 events with external_ids 1-10
    When the next sync returns external_ids 1-8 (events 9 and 10 deleted in provider)
    Then events 9 and 10 are deleted from `synced_calendar_events`
    And events 1-8 are upserted

  Scenario: Disconnect a calendar
    When the user clicks the X next to a connected provider in Settings
    Then `DELETE /api/calendar/connections/:id` runs
    And the row is removed
    And synced events for that connection are removed (CASCADE)
    And the provider row in Settings goes back to "not connected"

  Scenario: GET /api/calendar/connections excludes legacy zombies
    Given the DB has an old row with `access_token_encrypted IS NULL`
    Then it does NOT appear in the connections list
    Because the route filters by `access_token_encrypted IS NOT NULL`

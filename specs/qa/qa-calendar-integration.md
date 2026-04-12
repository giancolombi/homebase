# QA Test Plan: Calendar Integration (Google & Outlook)

**Feature:** Read-only calendar sync from external providers
**URL:** `https://homebase.up.railway.app/`
**Precondition:** User is signed in with a real account (not demo mode). Google OAuth credentials are configured on Railway.

---

## Test Cases — Google Calendar Connection

### TC-CI-01: Connect Google Calendar from Settings

| Step | Action                                      | Expected Result                                                                                                |
| ---- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1    | Sign in and navigate to Settings            | Settings page loads with "Your Calendars" section                                                              |
| 2    | Click "Google" under Your Calendars         | A popup window opens with Google's OAuth consent screen                                                        |
| 3    | Sign in to Google and grant calendar access | Popup redirects and closes                                                                                     |
| 4    | Check the Settings page                     | Google shows as connected with your Gmail address displayed. Toast: "Your google calendar has been connected." |

### TC-CI-02: Verify Google Calendar events appear on Calendar page

| Step | Action                                              | Expected Result                                      |
| ---- | --------------------------------------------------- | ---------------------------------------------------- |
| 1    | Complete TC-CI-01 (Google connected)                |                                                      |
| 2    | Navigate to the Calendar page                       | Calendar loads                                       |
| 3    | Look for events from your Google Calendar           | External events appear with a 📅 prefix in the title |
| 4    | Navigate to different dates that have Google events | Events appear on the correct dates and times         |

### TC-CI-03: Sync Now button

| Step | Action                                     | Expected Result                                 |
| ---- | ------------------------------------------ | ----------------------------------------------- |
| 1    | Navigate to Settings with Google connected | Google row shows a sync (refresh) icon          |
| 2    | Click the sync (refresh) icon              | A loading spinner appears briefly               |
| 3    | Navigate to Calendar page                  | Events are up to date with your Google Calendar |

### TC-CI-04: Disconnect Google Calendar

| Step | Action                                     | Expected Result                                |
| ---- | ------------------------------------------ | ---------------------------------------------- |
| 1    | Navigate to Settings with Google connected | Google row shows a disconnect (X) icon         |
| 2    | Click the disconnect (X) icon              | Google row reverts to unconnected state        |
| 3    | Navigate to Calendar page                  | Google Calendar events are no longer displayed |

### TC-CI-05: Reconnect after disconnect

| Step | Action                           | Expected Result                         |
| ---- | -------------------------------- | --------------------------------------- |
| 1    | Complete TC-CI-04 (disconnected) |                                         |
| 2    | Click "Google" again in Settings | OAuth popup opens                       |
| 3    | Grant access                     | Calendar reconnects and events reappear |

---

## Test Cases — OAuth Error Handling

### TC-CI-06: Deny Google Calendar access

| Step | Action                                                   | Expected Result                                                                       |
| ---- | -------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 1    | Click "Google" under Your Calendars                      | OAuth popup opens                                                                     |
| 2    | Click "Cancel" or deny access on Google's consent screen | Popup closes/redirects                                                                |
| 3    | Check the Settings page                                  | Error toast: "Could not connect calendar: access_denied". Google remains unconnected. |

### TC-CI-07: OAuth popup blocked by browser

| Step | Action                                   | Expected Result                          |
| ---- | ---------------------------------------- | ---------------------------------------- |
| 1    | Enable popup blocker in browser settings |                                          |
| 2    | Click "Google" under Your Calendars      | Browser shows popup blocked notification |
| 3    | Allow the popup and retry                | OAuth flow proceeds normally             |

---

## Test Cases — Calendar Page Display

### TC-CI-08: External events display correctly in day view

| Step | Action                                           | Expected Result                                                      |
| ---- | ------------------------------------------------ | -------------------------------------------------------------------- |
| 1    | Connect Google Calendar and navigate to Calendar | Calendar loads in day view                                           |
| 2    | Navigate to a day with Google Calendar events    | Events appear in correct time slots with member colors               |
| 3    | Check event titles                               | External events have a 📅 prefix to distinguish from Homebase events |

### TC-CI-09: External events display correctly in week view

| Step | Action                                 | Expected Result                         |
| ---- | -------------------------------------- | --------------------------------------- |
| 1    | Switch to week view on Calendar page   | Week view loads                         |
| 2    | Check days with Google Calendar events | Events appear on correct days and times |

### TC-CI-10: All-day events from Google Calendar

| Step | Action                                     | Expected Result                                            |
| ---- | ------------------------------------------ | ---------------------------------------------------------- |
| 1    | Create an all-day event in Google Calendar |                                                            |
| 2    | Sync and navigate to that date in Homebase | All-day event appears (may show as 00:00-23:59 time range) |

### TC-CI-11: Homebase events and Google events coexist

| Step | Action                                                           | Expected Result                                      |
| ---- | ---------------------------------------------------------------- | ---------------------------------------------------- |
| 1    | Navigate to a day with both Homebase and Google events           | Both types of events appear on the calendar          |
| 2    | Add a new Homebase event on the same day                         | New event appears alongside Google events            |
| 3    | Verify Google events are not editable/deletable through Homebase | Google events are read-only (no edit/delete actions) |

---

## Test Cases — Auto-Sync Behavior

### TC-CI-12: Events sync automatically on page load

| Step | Action                                           | Expected Result                                              |
| ---- | ------------------------------------------------ | ------------------------------------------------------------ |
| 1    | Connect Google Calendar                          |                                                              |
| 2    | Add a new event in Google Calendar               |                                                              |
| 3    | Wait 15+ minutes, then navigate to Calendar page | New event appears (auto-sync triggers for stale connections) |

### TC-CI-13: Recent sync does not re-fetch

| Step | Action                                                    | Expected Result                                                        |
| ---- | --------------------------------------------------------- | ---------------------------------------------------------------------- |
| 1    | Open Calendar page (triggers sync)                        | Events load                                                            |
| 2    | Open browser DevTools → Network tab                       |                                                                        |
| 3    | Navigate away and back to Calendar page within 15 minutes | No new sync request is made to `/api/calendar/sync` (uses cached data) |

---

## Test Cases — Demo Mode

### TC-CI-14: Calendar integration not available in demo mode

| Step | Action                                          | Expected Result                                                                                   |
| ---- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1    | Load sample data (demo mode) from the auth page | App enters demo mode                                                                              |
| 2    | Navigate to Settings                            | Calendar providers are shown                                                                      |
| 3    | Click "Google"                                  | Local toggle behavior (no OAuth popup). This is expected — real OAuth requires a backend account. |

---

## Test Cases — Edge Cases

### TC-CI-15: Revoked Google access

| Step | Action                                                                      | Expected Result                                                                      |
| ---- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 1    | Connect Google Calendar successfully                                        |                                                                                      |
| 2    | Go to Google Account → Security → Third-party apps → Remove Homebase access |                                                                                      |
| 3    | Navigate to Calendar page in Homebase                                       | Sync fails gracefully. Settings shows a sync error. Google may show as disconnected. |

### TC-CI-16: Multiple family members with different calendars

| Step | Action                                                          | Expected Result                             |
| ---- | --------------------------------------------------------------- | ------------------------------------------- |
| 1    | Connect Google Calendar for the current user                    | Events appear with the user's member color  |
| 2    | (If another adult joins) They connect their own Google Calendar | Their events appear with their member color |
| 3    | Calendar page shows both sets of events                         | Events are color-coded by member            |

---

## Test Cases — Outlook Calendar (when configured)

### TC-CI-17: Connect Outlook Calendar

| Step | Action                                                       | Expected Result                                 |
| ---- | ------------------------------------------------------------ | ----------------------------------------------- |
| 1    | Ensure Microsoft OAuth credentials are configured on Railway |                                                 |
| 2    | Click "Outlook" under Your Calendars in Settings             | OAuth popup opens with Microsoft login          |
| 3    | Sign in and grant access                                     | Outlook shows as connected with email displayed |
| 4    | Navigate to Calendar page                                    | Outlook events appear with 📆 prefix            |

### TC-CI-18: Disconnect Outlook Calendar

| Step | Action                                                | Expected Result                        |
| ---- | ----------------------------------------------------- | -------------------------------------- |
| 1    | With Outlook connected, click the disconnect (X) icon | Outlook reverts to unconnected state   |
| 2    | Navigate to Calendar page                             | Outlook events are no longer displayed |

---

## Pass Criteria

- Google OAuth flow completes without errors
- External events appear on the correct dates and times in the calendar
- External events are visually distinct from Homebase events (📅/📆 prefix)
- Disconnect removes all synced events
- Reconnect restores events
- Denied OAuth access shows a clear error message
- Demo mode does not attempt real OAuth
- Auto-sync respects the 15-minute staleness window
- Revoked access is handled gracefully with error messaging

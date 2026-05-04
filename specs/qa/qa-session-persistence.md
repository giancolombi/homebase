# QA Test Plan: Session Persistence

**Feature:** Returning users stay logged in across page reloads and browser restarts
**URL:** `https://gethomebase.dev/`
**Precondition:** A user account exists and credentials are known

---

## Test Cases

### TC-SP-01: Session survives page refresh

| Step | Action                                | Expected Result                                                                    |
| ---- | ------------------------------------- | ---------------------------------------------------------------------------------- |
| 1    | Sign in with valid credentials        | Redirected to dashboard                                                            |
| 2    | Press F5 or Cmd+R to refresh the page | Page reloads. User is still logged in on the dashboard. No flash of the auth page. |

### TC-SP-02: Session survives closing and reopening the tab

| Step | Action                                     | Expected Result                                    |
| ---- | ------------------------------------------ | -------------------------------------------------- |
| 1    | Sign in with valid credentials             | Redirected to dashboard                            |
| 2    | Close the browser tab                      |                                                    |
| 3    | Open a new tab and navigate to the app URL | User is still logged in. Dashboard loads directly. |

### TC-SP-03: Session survives closing and reopening the browser

| Step | Action                                         | Expected Result                                    |
| ---- | ---------------------------------------------- | -------------------------------------------------- |
| 1    | Sign in with valid credentials                 | Redirected to dashboard                            |
| 2    | Quit the browser completely                    |                                                    |
| 3    | Reopen the browser and navigate to the app URL | User is still logged in. Dashboard loads directly. |

### TC-SP-04: Session loads user data from the server

| Step | Action                              | Expected Result                                 |
| ---- | ----------------------------------- | ----------------------------------------------- |
| 1    | Sign in with valid credentials      | Redirected to dashboard                         |
| 2    | Refresh the page                    |                                                 |
| 3    | Open browser DevTools → Network tab | A request to `GET /api/auth/me` is made on load |
| 4    | Check the response                  | Returns the correct user (id, email, full_name) |

### TC-SP-05: Expired token redirects to login

| Step | Action                                                                                           | Expected Result                                                                      |
| ---- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| 1    | Sign in with valid credentials                                                                   | Token is stored in localStorage                                                      |
| 2    | Open DevTools → Application → Local Storage                                                      |                                                                                      |
| 3    | Replace the value of `homebase-auth-token` with an invalid/expired string (e.g. "expired-token") |                                                                                      |
| 4    | Refresh the page                                                                                 | User is redirected to the auth page. The invalid token is cleared from localStorage. |

### TC-SP-06: Deleted user token is rejected

| Step | Action                                                        | Expected Result                                                                                  |
| ---- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 1    | Sign in with valid credentials                                | Token is stored                                                                                  |
| 2    | Delete the user directly from the database (Railway Postgres) |                                                                                                  |
| 3    | Refresh the page                                              | `GET /api/auth/me` returns 401 ("User no longer exists"). Token is cleared. User sees auth page. |

### TC-SP-07: Multi-tab session sync

| Step | Action                            | Expected Result                                                                         |
| ---- | --------------------------------- | --------------------------------------------------------------------------------------- |
| 1    | Open the app in Tab A and sign in | Dashboard loads                                                                         |
| 2    | Open the app in Tab B             | Tab B is also logged in (same localStorage token)                                       |
| 3    | Sign out in Tab A                 | Tab A shows auth page                                                                   |
| 4    | Switch to Tab B                   | Tab B detects the storage change and shows the auth page (via `storage` event listener) |

### TC-SP-08: Loading state while checking session

| Step | Action                         | Expected Result                                                                                                               |
| ---- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| 1    | Sign in with valid credentials |                                                                                                                               |
| 2    | Refresh the page               | A brief loading state is shown while `GET /api/auth/me` is in flight. No flash of the auth page before the dashboard appears. |

---

## Pass Criteria

- Token persists in localStorage across page reloads and browser restarts
- Expired or invalid tokens are cleared automatically and user is redirected to login
- Multi-tab logout sync works via the `storage` event
- No flash of auth page for valid sessions (loading state covers the check)
- `GET /api/auth/me` verifies the user still exists in the database, not just that the token is valid

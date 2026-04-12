# QA Test Plan: Sign Out

**Feature:** User logout
**URL:** `https://homebase.up.railway.app/`
**Precondition:** User is signed in

---

## Test Cases

### TC-SO-01: Successful sign out

| Step | Action                                      | Expected Result                      |
| ---- | ------------------------------------------- | ------------------------------------ |
| 1    | Sign in with valid credentials              | Dashboard loads                      |
| 2    | Locate and click the sign out button/link   | User is redirected to the auth page  |
| 3    | Open DevTools → Application → Local Storage | `homebase-auth-token` key is removed |

### TC-SO-02: Sign out prevents access to protected pages

| Step | Action                                | Expected Result                                                 |
| ---- | ------------------------------------- | --------------------------------------------------------------- |
| 1    | Sign in and navigate to the dashboard |                                                                 |
| 2    | Sign out                              | Redirected to auth page                                         |
| 3    | Press the browser Back button         | Auth page remains (or reloads). Dashboard content is NOT shown. |

### TC-SO-03: Sign out requires fresh login

| Step | Action                         | Expected Result                                            |
| ---- | ------------------------------ | ---------------------------------------------------------- |
| 1    | Sign in with valid credentials | Dashboard loads                                            |
| 2    | Sign out                       | Redirected to auth page                                    |
| 3    | Refresh the page               | Auth page loads. User is not automatically logged back in. |

### TC-SO-04: Sign out clears only auth state

| Step | Action                                               | Expected Result                                                                                                                |
| ---- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 1    | Sign in and use the app (create events, tasks, etc.) |                                                                                                                                |
| 2    | Sign out                                             |                                                                                                                                |
| 3    | Open DevTools → Application → Local Storage          | `homebase-auth-token` is removed. Other app data (e.g. `homebase-family-data`) may still be present (Zustand persisted state). |
| 4    | Sign back in with the same account                   | User data is loaded from the server. App is functional.                                                                        |

### TC-SO-05: Sign out syncs across tabs

| Step | Action                                   | Expected Result                                           |
| ---- | ---------------------------------------- | --------------------------------------------------------- |
| 1    | Open the app in two tabs, both signed in |                                                           |
| 2    | Sign out in Tab A                        | Tab A shows auth page                                     |
| 3    | Switch to Tab B                          | Tab B also shows auth page (detected via `storage` event) |

---

## Pass Criteria

- Sign out clears the JWT token from localStorage
- After sign out, no protected content is accessible
- Refreshing after sign out does not restore the session
- Multi-tab sign out sync works
- Sign out does not produce console errors

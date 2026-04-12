# QA Test Plan: Sign In

**Feature:** User authentication (login)
**URL:** `https://homebase.up.railway.app/`
**Precondition:** A user account already exists (complete sign-up first)

---

## Test Cases

### TC-SI-01: Successful sign in

| Step | Action                                 | Expected Result                                      |
| ---- | -------------------------------------- | ---------------------------------------------------- |
| 1    | Navigate to the app URL                | Auth page loads with Sign In tab active              |
| 2    | Enter the email of an existing account | Field accepts input                                  |
| 3    | Enter the correct password             | Field accepts input, characters are masked           |
| 4    | Click "Sign In"                        | Loading state shows "Signing in..."                  |
| 5    | Wait for response                      | User is redirected to the dashboard. No error toast. |

### TC-SI-02: Sign in with wrong password

| Step | Action                                 | Expected Result                                                        |
| ---- | -------------------------------------- | ---------------------------------------------------------------------- |
| 1    | Navigate to the app URL                | Auth page loads                                                        |
| 2    | Enter the email of an existing account | Field accepts input                                                    |
| 3    | Enter an incorrect password            | Field accepts input                                                    |
| 4    | Click "Sign In"                        | Error toast: "Invalid email or password". User stays on the auth page. |

### TC-SI-03: Sign in with non-existent email

| Step | Action                                        | Expected Result                                                                                  |
| ---- | --------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 1    | Navigate to the app URL                       | Auth page loads                                                                                  |
| 2    | Enter an email that has never been registered | Field accepts input                                                                              |
| 3    | Enter any password                            | Field accepts input                                                                              |
| 4    | Click "Sign In"                               | Error toast: "Invalid email or password". Same message as wrong password (no email enumeration). |

### TC-SI-04: Sign in with missing email

| Step | Action                              | Expected Result                                      |
| ---- | ----------------------------------- | ---------------------------------------------------- |
| 1    | Navigate to the app URL             | Auth page loads                                      |
| 2    | Leave email empty, enter a password |                                                      |
| 3    | Click "Sign In"                     | Browser's native form validation prevents submission |

### TC-SI-05: Sign in with missing password

| Step | Action                               | Expected Result                                      |
| ---- | ------------------------------------ | ---------------------------------------------------- |
| 1    | Navigate to the app URL              | Auth page loads                                      |
| 2    | Enter an email, leave password empty |                                                      |
| 3    | Click "Sign In"                      | Browser's native form validation prevents submission |

### TC-SI-06: Sign in button disabled during loading

| Step | Action                                      | Expected Result                                               |
| ---- | ------------------------------------------- | ------------------------------------------------------------- |
| 1    | Enter valid credentials                     |                                                               |
| 2    | Click "Sign In"                             | Button text changes to "Signing in..." and button is disabled |
| 3    | Rapidly click "Sign In" again while loading | No duplicate requests are sent                                |

### TC-SI-07: Network error during sign in

| Step | Action                                                   | Expected Result                                                              |
| ---- | -------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 1    | Open browser DevTools → Network tab → set "Offline" mode |                                                                              |
| 2    | Enter valid credentials                                  |                                                                              |
| 3    | Click "Sign In"                                          | Error toast with a network error message. Button returns to "Sign In" state. |

### TC-SI-08: Sign in preserves correct tab state

| Step | Action                  | Expected Result                                                      |
| ---- | ----------------------- | -------------------------------------------------------------------- |
| 1    | Navigate to the app URL | Sign In tab is active by default                                     |
| 2    | Click "Sign Up" tab     | Sign Up form shows                                                   |
| 3    | Click "Sign In" tab     | Sign In form shows. Previously entered data in Sign Up is preserved. |

### TC-SI-09: Sign in after sign out

| Step | Action                                  | Expected Result                           |
| ---- | --------------------------------------- | ----------------------------------------- |
| 1    | Sign in with valid credentials          | Redirected to dashboard                   |
| 2    | Sign out                                | Redirected to auth page                   |
| 3    | Sign in again with the same credentials | Redirected to dashboard. All data intact. |

---

## Pass Criteria

- All test cases produce the expected results
- Wrong password and non-existent email return the same error message (prevents email enumeration)
- No console errors (other than known browser extension noise)
- Successful sign in stores a valid JWT in localStorage (`homebase-auth-token`)
- Failed sign in does not store anything in localStorage

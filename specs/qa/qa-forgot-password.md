# QA Test Plan: Forgot Password / Reset Password

**Feature:** Password reset flow
**URL:** `https://gethomebase.dev/`
**Precondition:** A user account already exists

---

## Current Limitation

> **Note:** The password reset flow does NOT send emails in production. The reset token is logged to the API server console. To complete a full reset test, you need access to Railway's API service logs to retrieve the token. This is a known limitation — email delivery is not yet implemented.

---

## Test Cases

### TC-FP-01: Navigate to forgot password form

| Step | Action                                                 | Expected Result                                                                                          |
| ---- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| 1    | Navigate to the app URL                                | Auth page loads with Sign In tab active                                                                  |
| 2    | Click "Forgot password?" link below the Sign In button | Forgot password form appears with an email field, "Send Reset Link" button, and a "Back to sign in" link |

### TC-FP-02: Request password reset with registered email

| Step | Action                                 | Expected Result                                                                |
| ---- | -------------------------------------- | ------------------------------------------------------------------------------ |
| 1    | Navigate to the forgot password form   |                                                                                |
| 2    | Enter the email of an existing account | Field accepts input                                                            |
| 3    | Click "Send Reset Link"                | Loading state shows "Sending..."                                               |
| 4    | Wait for response                      | Toast: "Check your email — If that email is registered, we sent a reset link." |

### TC-FP-03: Request password reset with unregistered email

| Step | Action                                        | Expected Result                                                                                           |
| ---- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1    | Navigate to the forgot password form          |                                                                                                           |
| 2    | Enter an email that has never been registered | Field accepts input                                                                                       |
| 3    | Click "Send Reset Link"                       | Same toast as TC-FP-02: "If that email is registered, we sent a reset link." (prevents email enumeration) |

### TC-FP-04: Request password reset with empty email

| Step | Action                               | Expected Result                                      |
| ---- | ------------------------------------ | ---------------------------------------------------- |
| 1    | Navigate to the forgot password form |                                                      |
| 2    | Leave email field empty              |                                                      |
| 3    | Click "Send Reset Link"              | Browser's native form validation prevents submission |

### TC-FP-05: Back to sign in from forgot password

| Step | Action                               | Expected Result                                                      |
| ---- | ------------------------------------ | -------------------------------------------------------------------- |
| 1    | Navigate to the forgot password form |                                                                      |
| 2    | Click "Back to sign in" link         | Sign In form is displayed again. Sign In / Sign Up tabs are visible. |

### TC-FP-06: Reset password with valid token (requires API log access)

| Step | Action                                                                                      | Expected Result                                                            |
| ---- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 1    | Complete TC-FP-02 with a registered email                                                   |                                                                            |
| 2    | Check Railway API service logs for the reset token                                          | A JWT reset token is logged                                                |
| 3    | Call the reset endpoint manually (curl or Postman):                                         |                                                                            |
|      | `POST /api/auth/reset-password` with `{ "token": "<token>", "password": "newpassword123" }` | Response: `{ "message": "Password has been reset. You can now sign in." }` |
| 4    | Sign in with the email and the new password                                                 | Sign in succeeds                                                           |
| 5    | Sign in with the email and the old password                                                 | Sign in fails: "Invalid email or password"                                 |

### TC-FP-07: Reset password with expired token

| Step | Action                                                                         | Expected Result                                               |
| ---- | ------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| 1    | Use a reset token that is older than 1 hour                                    |                                                               |
| 2    | Call `POST /api/auth/reset-password` with the expired token and a new password | Response: 400 `{ "error": "Invalid or expired reset token" }` |

### TC-FP-08: Reset password with short password

| Step | Action                                                                                       | Expected Result                                                       |
| ---- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 1    | Obtain a valid reset token                                                                   |                                                                       |
| 2    | Call `POST /api/auth/reset-password` with the token and a password shorter than 8 characters | Response: 400 `{ "error": "Password must be at least 8 characters" }` |

### TC-FP-09: Reset password with tampered token

| Step | Action                                                       | Expected Result                                               |
| ---- | ------------------------------------------------------------ | ------------------------------------------------------------- |
| 1    | Take a valid reset token and modify a character in it        |                                                               |
| 2    | Call `POST /api/auth/reset-password` with the tampered token | Response: 400 `{ "error": "Invalid or expired reset token" }` |

### TC-FP-10: Use a regular auth token as a reset token

| Step | Action                                                                             | Expected Result                                                                     |
| ---- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 1    | Sign in to get a regular JWT token                                                 |                                                                                     |
| 2    | Call `POST /api/auth/reset-password` using the auth token instead of a reset token | Response: 400 `{ "error": "Invalid reset token" }` (token lacks `purpose: "reset"`) |

---

## Pass Criteria

- Registered and unregistered emails return the same response (no email enumeration)
- Valid reset token allows password change; old password stops working
- Expired, tampered, and non-reset tokens are all rejected
- No console errors during the flow
- Reset token is single-purpose (only works for reset, not as an auth token)

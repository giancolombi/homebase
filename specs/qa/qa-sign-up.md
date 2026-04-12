# QA Test Plan: Sign Up

**Feature:** Account creation
**URL:** `https://homebase.up.railway.app/`
**Precondition:** User is not logged in (no token in localStorage)

---

## Test Cases

### TC-SU-01: Successful sign up

| Step | Action                                            | Expected Result                                                                    |
| ---- | ------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 1    | Navigate to the app URL                           | Auth page loads with Sign In tab active                                            |
| 2    | Click the "Sign Up" tab                           | Sign Up form is displayed with Full Name, Email, and Password fields               |
| 3    | Enter a full name (e.g. "Test User")              | Field accepts input                                                                |
| 4    | Enter a valid email (e.g. "testuser@example.com") | Field accepts input                                                                |
| 5    | Enter a password (8+ characters)                  | Field accepts input, characters are masked                                         |
| 6    | Click "Create Account"                            | Loading state shows "Creating account..."                                          |
| 7    | Wait for response                                 | User is redirected to the onboarding/dashboard. Toast shows "Welcome to Homebase!" |

### TC-SU-02: Sign up with duplicate email

| Step | Action                                                | Expected Result                                          |
| ---- | ----------------------------------------------------- | -------------------------------------------------------- |
| 1    | Complete TC-SU-01 successfully with an email          | Account is created                                       |
| 2    | Sign out                                              |                                                          |
| 3    | Click "Sign Up" tab                                   | Sign Up form is displayed                                |
| 4    | Enter a different name but the same email from step 1 | Field accepts input                                      |
| 5    | Enter a valid password                                | Field accepts input                                      |
| 6    | Click "Create Account"                                | Error toast: "An account with this email already exists" |

### TC-SU-03: Sign up with short password

| Step | Action                                                  | Expected Result                                                                                             |
| ---- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 1    | Navigate to Sign Up tab                                 | Form is displayed                                                                                           |
| 2    | Enter full name and valid email                         | Fields accept input                                                                                         |
| 3    | Enter a password shorter than 8 characters (e.g. "abc") | Field accepts input                                                                                         |
| 4    | Click "Create Account"                                  | Error toast: "Password must be at least 8 characters". No network request is made (client-side validation). |

### TC-SU-04: Sign up with missing email

| Step | Action                                             | Expected Result                                                                     |
| ---- | -------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 1    | Navigate to Sign Up tab                            | Form is displayed                                                                   |
| 2    | Enter full name and password but leave email empty |                                                                                     |
| 3    | Click "Create Account"                             | Browser's native form validation prevents submission ("Please fill out this field") |

### TC-SU-05: Sign up with missing password

| Step | Action                                             | Expected Result                                      |
| ---- | -------------------------------------------------- | ---------------------------------------------------- |
| 1    | Navigate to Sign Up tab                            | Form is displayed                                    |
| 2    | Enter full name and email but leave password empty |                                                      |
| 3    | Click "Create Account"                             | Browser's native form validation prevents submission |

### TC-SU-06: Sign up with missing full name

| Step | Action                                             | Expected Result                                      |
| ---- | -------------------------------------------------- | ---------------------------------------------------- |
| 1    | Navigate to Sign Up tab                            | Form is displayed                                    |
| 2    | Enter email and password but leave full name empty |                                                      |
| 3    | Click "Create Account"                             | Browser's native form validation prevents submission |

### TC-SU-07: Sign up with invalid email format

| Step | Action                                     | Expected Result                                       |
| ---- | ------------------------------------------ | ----------------------------------------------------- |
| 1    | Navigate to Sign Up tab                    | Form is displayed                                     |
| 2    | Enter full name and password               | Fields accept input                                   |
| 3    | Enter an invalid email (e.g. "notanemail") |                                                       |
| 4    | Click "Create Account"                     | Browser's native email validation prevents submission |

### TC-SU-08: Network error during sign up

| Step | Action                                                   | Expected Result                                                                                       |
| ---- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 1    | Open browser DevTools → Network tab → set "Offline" mode |                                                                                                       |
| 2    | Fill in all sign up fields with valid data               |                                                                                                       |
| 3    | Click "Create Account"                                   | Error toast: "Sign up failed" with a network error message. Button returns to "Create Account" state. |
| 4    | Disable offline mode                                     | App is usable again                                                                                   |

---

## Pass Criteria

- All test cases produce the expected results
- No console errors (other than known browser extension noise)
- No data is persisted on failed sign ups
- Successful sign up results in a valid JWT in localStorage (`homebase-auth-token`)

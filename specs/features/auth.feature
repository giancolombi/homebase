Feature: Authentication
  Homebase users sign up with email + password, sign back in, can reset
  forgotten passwords, and stay signed in across browser refreshes.
  /api/auth/me is the source of truth for `familyId` and
  `onboardingComplete` on every auth transition.

  Background:
    Given the Homebase web app is running

  # ---- Sign up -------------------------------------------------------------

  Scenario: Sign up with valid credentials
    Given a visitor is on the /auth page
    When they switch to the "Sign Up" tab
    And they fill "Full Name" with "Gian Colombi"
    And they fill "Email" with a unique email
    And they fill "Password" with "Password123456!"
    And they submit the form
    Then a new user record exists in the database
    And the response includes a JWT token
    And the response user includes `familyId: null` and `onboardingComplete: false`
    And the visitor lands on the onboarding wizard
    And a welcome email is sent (or logged when RESEND_API_KEY is unset)

  Scenario: Sign up with too-short password
    Given a visitor is on the /auth Sign Up tab
    When they fill "Password" with "short"
    And they submit
    Then a toast says "Password too short"
    And the user is not created

  Scenario: Sign up with an email that already exists
    Given an account exists for "taken@example.com"
    When the visitor signs up with the same email
    Then the API returns 409 with "An account with this email already exists"
    And no duplicate user is created

  # ---- Sign in -------------------------------------------------------------

  Scenario: Sign in with valid credentials, finished onboarding
    Given an account "test.user@example.com" exists with password "Password123456!"
    And that user has a family with onboarding_completed_at set
    When the user signs in with the correct password
    Then the response includes the JWT
    And the response user includes the user's `familyId` and `onboardingComplete: true`
    And the AuthContext mirrors `onboardingComplete: true` into the store
    And the user lands on /calendar (not /auth, not onboarding)

  Scenario: Sign in with valid credentials, onboarding not finished
    Given an account exists whose `families.onboarding_completed_at IS NULL`
    When the user signs in
    Then the response user has `onboardingComplete: false`
    And the user lands on the onboarding wizard

  Scenario: Sign in with an unknown email
    When the user signs in with "nobody@example.com"
    Then the API returns 401 with "Invalid email or password"
    And no user-enumeration leak occurs (same error for unknown email vs wrong password)

  Scenario: Sign in with the wrong password
    Given an account "test.user@example.com" exists
    When the user signs in with the wrong password
    Then the API returns 401 with "Invalid email or password"

  Scenario: Sign in on a fresh browser (no cached state)
    Given an existing user with a family
    When they sign in for the first time on this browser
    Then `pullAllData` hydrates members, tasks, recipes, accounts, etc.
    And `currentUserId` is derived by matching `user.email` to a `family_members.email`
    And Settings shows the family member list
    And Calendar renders the day view (not "Add family members…")

  # ---- Sign out ------------------------------------------------------------

  Scenario: Sign out clears local state
    Given the user is signed in
    When they click "Sign Out" in Settings
    Then the auth token is cleared from localStorage
    And the family store is reset (familyId, members, onboardingComplete=false)
    And the user is redirected to "/"
    And the public landing page renders

  Scenario: Sign-out in one tab signs out all tabs
    Given the user is signed in across two tabs
    When they sign out in tab A
    Then tab B's AuthContext detects the storage event
    And tab B's user becomes null
    And tab B navigates to a public route on next interaction

  # ---- Forgot password ----------------------------------------------------

  Scenario: Request a password reset for a known email
    When the user submits "Forgot password" for a known email
    Then the API returns 200 with a generic "if that email is registered…" message
    And a reset email is sent (or logged) with a link to /reset-password?token=<jwt>
    And the JWT has `purpose: "reset"` and a 1-hour expiry

  Scenario: Request a password reset for an unknown email
    When the user submits "Forgot password" for "nobody@example.com"
    Then the API returns the same generic 200 message
    And no email is sent
    And no record of the request exists (no enumeration vector)

  Scenario: Use a valid reset link
    Given the user clicks the link in the reset email
    Then they land on /reset-password with a token query param
    When they enter a new password and submit
    Then the user's password_hash is updated
    And a "Password updated" notification email is sent
    And they can sign in with the new password

  Scenario: Use an expired reset token
    Given a reset token older than 1 hour
    When the user submits a new password with that token
    Then the API returns 400 with "Invalid or expired reset token"

  # ---- Session persistence ------------------------------------------------

  Scenario: Token survives a hard reload
    Given the user is signed in
    When they hard-reload the page
    Then `auth.getSession()` returns the user
    And the AuthContext effect rehydrates `familyId`, `members`, `onboardingComplete`
    And the user lands back on the same authenticated route

  Scenario: Stale or tampered token is rejected
    Given the user has a token signed with a different JWT_SECRET
    When the page loads and calls `/api/auth/me`
    Then the API returns 401
    And the client clears the stored token
    And the user lands on the public landing page

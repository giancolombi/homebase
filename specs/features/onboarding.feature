Feature: Onboarding wizard
  Newly-signed-up users walk through a 4-step wizard that captures their
  family name, profile, household members, and (optionally) their personal
  calendar connections. The family is created on the server when the user
  transitions Step 2 → Step 3 so the calendar step has a real `familyId`
  to use for OAuth. Onboarding completion is persisted server-side via
  `families.onboarding_completed_at` so it survives device changes.

  Background:
    Given a freshly-signed-up user with no family yet

  # ---- Step navigation ----------------------------------------------------

  Scenario: New user lands on Step 0 (Family Name)
    When the user reaches /onboarding for the first time
    Then they see "Family Name" heading
    And the progress bar shows 1 of 4

  Scenario: Step 0 → Step 1 with a non-empty family name
    Given the user is on Step 0
    When they enter "Colombi" and click "Continue"
    Then `familyName: "Colombi"` is in the persisted store
    And they advance to Step 1 (Your Profile)

  Scenario: Step 1 pre-populates from auth data
    Given the user's auth account is "Gian Colombi <test.user@example.com>"
    When they reach Step 1
    Then "Your name" is pre-filled with "Gian Colombi"
    And "Email" is pre-filled with "test.user@example.com"

  Scenario: Step 1 → Step 2 creates the local current-user member
    Given the user is on Step 1
    When they click "Continue"
    Then a new member with `isCurrentUser: true` is added to the store
    And `currentUserId` is set to that member's local id
    And they advance to Step 2 (Family Members)

  Scenario: Adding adult vs child members at Step 2
    Given the user is on Step 2
    When they add an adult "Alex Colombi" with email "alex@example.com"
    Then the new member has `role: "adult"` and `inviteStatus: "pending"`
    When they add a child "Mateo"
    Then the new child member is added with `role: "child"`
    And a homebase pseudo-`calendarConnections` entry is auto-added for the child

  # ---- Server-side family setup ------------------------------------------

  Scenario: Step 2 → Step 3 creates the family on the server
    Given the user has chosen a family name and added themselves + others
    When they click "Continue" on Step 2
    Then the button shows "Setting up family…"
    And `POST /api/onboarding/complete` is called with profile + family + members
    And the response includes a real `familyId`
    And the store's `familyId` is set
    And the user advances to Step 3

  Scenario: /api/onboarding/complete is idempotent
    Given the user already has a family on the server (from a prior attempt)
    When they POST to /api/onboarding/complete again
    Then the existing family is returned with `alreadyExisted: true`
    And no duplicate family is created
    And no duplicate members are created

  Scenario: /api/onboarding/complete inserts default task categories
    When a new family is created via /api/onboarding/complete
    Then "Home", "School", "Work", "Health", "Errands" rows exist in `task_categories`

  # ---- Step 3 (calendar) -------------------------------------------------

  Scenario: Step 3 surfaces real OAuth providers
    Given the user has reached Step 3 with a real familyId
    When they click "Google"
    Then a popup opens to https://accounts.google.com/o/oauth2/v2/auth
    And the popup carries `state` containing `returnTo: "/"`
    When the user finishes Google auth
    Then the popup closes
    And the parent reloads at "/?calendarConnected=google"
    And a "Calendar connected" toast fires

  Scenario: Step 3 — Apple opens the credentials dialog (not OAuth)
    Given the user has reached Step 3
    When they click "Apple"
    Then the AppleConnectDialog opens
    And the dialog explains app-specific passwords
    And the dialog links to account.apple.com/account/manage

  Scenario: Step 3 "Get Started" finalizes onboarding
    Given the user has reached Step 3
    When they click "Get Started"
    Then `POST /api/onboarding/finish` is called
    And `families.onboarding_completed_at` is set on the server
    And the store's `onboardingComplete` is true
    And the user navigates to /calendar

  Scenario: Step 3 "I'll do this later" still finalizes onboarding
    Given the user has reached Step 3 without connecting any calendar
    When they click "I'll do this later"
    Then `POST /api/onboarding/finish` is still called
    And the user lands on /calendar

  # ---- Survives reload mid-flow -------------------------------------------

  Scenario: Mid-onboarding reload preserves the current step
    Given the user is on Step 2 with members added
    When they hard-reload the page
    Then they land back on Step 2 (not Step 0)
    Because `onboardingStep` is persisted in the family store

  Scenario: Reload after Step 2 setup keeps familyId
    Given the user advanced past Step 2 and the family was created
    When they reload
    Then the persisted `familyId` is preserved
    And re-clicking "Continue" on Step 2 hits /complete which is idempotent

  # ---- Cross-device --------------------------------------------------

  Scenario: Existing user opening the app on a new device skips onboarding
    Given an existing user whose `families.onboarding_completed_at IS NOT NULL`
    When they sign in for the first time on a new browser
    Then `/api/auth/me` returns `onboardingComplete: true`
    And AuthContext sets the local store's `onboardingComplete` to true
    And the user lands on /calendar — not the wizard

  Scenario: Existing user with a family but no onboarding_completed_at
    Given a user has a `families` row but `onboarding_completed_at IS NULL`
    When they sign in fresh
    Then they're routed to the onboarding wizard
    And clicking "Get Started" / "I'll do this later" sets the timestamp

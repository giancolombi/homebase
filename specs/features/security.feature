Feature: API security & access control
  As Homebase storing family calendars, finances and children's data
  I want every family-scoped endpoint to enforce membership and roles
  So that one family can never read or modify another family's data

  # Coverage note: these are backend authorization guarantees. The Playwright
  # suite drives the real API, but the cross-family/cross-role scenarios below
  # need multi-family, multi-user fixtures the current e2e helpers don't set up.
  # They are verified by api/ unit tests (validation, rate limiting, webhook
  # rejection) plus integration/manual testing against a running API + database,
  # and are tracked here as the behavioural spec.

  Scenario: A user cannot list another family's members
    Given I am authenticated as a member of family A
    When I request the member list for family B
    Then the response is 403 Not a member of this family

  Scenario: A user cannot read another family's calendar
    Given I am authenticated as a member of family A
    When I request calendar events or connections for family B
    Then the response is 403 Not a member of this family

  Scenario: A user cannot delete or sync another family's calendar connection
    Given I am authenticated as a member of family A
    When I delete or sync a calendar connection that belongs to family B
    Then the response is 404 Connection not found

  Scenario: Only owners and admins can send invites
    Given I am a non-admin adult member of my family
    When I send an invite for a member of my family
    Then the response is 403 Only admins can send invites

  Scenario: Only owners and admins can remove members
    Given I am a non-admin member of my family
    When I remove another member
    Then the response is 403 Only admins can remove members

  Scenario: The family owner cannot be removed
    Given I am an admin of my family
    When I remove the owner
    Then the response is 400 Cannot remove the family owner

  Scenario: Changing a password requires the current password
    Given I am signed in
    When I change my password without supplying the correct current password
    Then the response is 401 Current password is incorrect

  Scenario: Resetting a password invalidates existing sessions
    Given I have an active session token
    When my password is reset or changed
    Then that previously-issued token is rejected as expired

  Scenario: Email is treated case-insensitively
    Given an account exists for "Gian@Example.com"
    When I sign in as "gian@example.com"
    Then I am signed in to the same account

  Scenario: The Plaid webhook rejects unsigned requests
    Given a POST to /api/plaid/webhook without a valid Plaid-Verification header
    Then the response is 401 Invalid webhook signature
    And no transaction sync is triggered

  Scenario: Auth endpoints are rate limited
    Given many failed sign-in attempts from one client
    When the per-window limit is exceeded
    Then further attempts receive 429 Too many attempts

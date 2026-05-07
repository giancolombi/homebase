Feature: Transactional emails
  All transactional emails are sent via Resend (FROM_EMAIL). When
  RESEND_API_KEY is unset (dev / E2E), `sendOrLog` falls back to a
  console log so flows still complete.

  Background:
    Given the API server is running
    And FROM_EMAIL is configured

  # ---- Welcome (signup) --------------------------------------------------

  Scenario: Welcome email on signup
    When a new user signs up
    Then `sendWelcomeEmail` fires (fire-and-forget, doesn't block the response)
    And the email subject is "Welcome to Homebase"
    And the body greets the user by first name when full_name is set
    And the body links back to APP_URL

  # ---- Password reset ----------------------------------------------------

  Scenario: Password reset email on /request-reset
    When a user requests a password reset for an existing account
    Then `sendPasswordResetEmail` fires
    And the email subject is "Reset your Homebase password"
    And the link points to /reset-password?token=<jwt>
    And the JWT has 1-hour expiry and `purpose: "reset"`

  Scenario: No email for an unknown account (no enumeration)
    When `/request-reset` is called for an unknown email
    Then no email is sent
    And the API still returns the same generic 200 response

  # ---- Password changed --------------------------------------------------

  Scenario: Notify on /update-password
    When a signed-in user updates their password
    Then `sendPasswordChangedEmail` fires (fire-and-forget)
    And the email tells them to reset immediately if the change wasn't them

  Scenario: Notify on /reset-password
    When a user uses a reset link to set a new password
    Then `sendPasswordChangedEmail` fires for the user's email

  # ---- Invite ------------------------------------------------------------

  Scenario: Invite email on /invite/send
    When an admin sends an invite to a pending adult member
    Then `sendInviteEmail` fires (this one DOES await — the response body confirms send)
    And the link is /accept-invite?token=<jwt>
    And the subject is "<inviter> invited you to join <family> on Homebase"

  # ---- Invite accepted (back to owner) -----------------------------------

  Scenario: Owner notified on /invite/accept
    When a recipient accepts an invite
    Then `sendInviteAcceptedEmail` fires for the family owner's email
    And the body names the invitee + the family
    And it doesn't fire if the invitee IS the owner (self-link edge case)

  # ---- Dev / E2E fallback ------------------------------------------------

  Scenario: Falls back to console.log when RESEND_API_KEY is unset
    Given `RESEND_API_KEY` is not configured
    When any email helper is called
    Then nothing is sent over the network
    And a log line "[email dev-fallback] to=… subject=…" is printed
    And `sent: false` is returned to the caller

  Scenario: Email-helper failures don't break the request
    Given Resend is unreachable
    When any fire-and-forget helper is called from a route
    Then the route response succeeds normally
    And a `console.warn` records the email failure

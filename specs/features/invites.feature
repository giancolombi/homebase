Feature: Family invites
  Adult members are invited via email. The invite carries a 7-day JWT.
  When the recipient accepts, they're linked to the invited family
  member row and (optionally) booted from any prior family they were in.

  # ---- Send --------------------------------------------------------------

  Scenario: Sending an invite stores a token and emails the recipient
    Given an admin sends an invite to "alex@example.com"
    Then `POST /api/invite/send` is called
    And a JWT with `purpose: "invite"`, 7-day expiry, memberId/familyId/email is generated
    And it's stored on `family_members.invite_token` with `invite_sent_at = now()`
    And `sendInviteEmail` fires (or logs in dev) with a link to /accept-invite?token=<jwt>

  Scenario: Send-invite when the invitee already has an account
    Given the invited email already corresponds to a Homebase user
    Then no email is sent
    And the existing user is auto-linked to the family member row
    And `invite_status` becomes "accepted" immediately
    And the response includes `alreadyAccepted: true`

  # ---- Verify (the accept-invite page calls this on load) ----------------

  Scenario: Verify a valid token
    When the accept page calls `GET /api/invite/verify?token=<jwt>`
    Then the response includes the inviter's family name + the inviter's display name
    And whether the recipient already has an account
    And whether they currently belong to another family

  Scenario: Verify an expired token
    When the JWT is expired
    Then the API returns 400 with "Invite has expired"

  Scenario: Verify a token whose member status is already "accepted"
    Then the API returns 400 with "Invite already accepted"

  # ---- Accept ------------------------------------------------------------

  Scenario: Accept as a brand-new user
    When the recipient creates an account via the accept-invite page
    And `POST /api/invite/accept` runs with their new userId + token
    Then `family_members.user_id` is set on the invited row
    And `invite_status` flips to "accepted"
    And `invite_token` is cleared
    And the family owner receives an "X joined Y on Homebase" email

  Scenario: Accept as an existing user not currently in any family
    When an existing Homebase user clicks accept
    Then they're linked to the new family
    And no detach step runs

  Scenario: Accept when the recipient is already in another (non-owned) family
    Given the recipient currently belongs to family A as a non-owner member
    When they accept the new invite
    Then their previous membership is detached (user_id = NULL on family A's row)
    And they're linked to family B

  Scenario: Owners cannot leave their own family by accepting an invite
    Given the recipient is the owner of family A
    When they attempt to accept an invite to family B
    Then the API returns 400 with "transfer ownership or delete first"
    And nothing changes

  Scenario: Accept with an invalid token
    When the JWT signature is wrong
    Then the API returns 400 with "Invalid invite token"
    And no DB change happens

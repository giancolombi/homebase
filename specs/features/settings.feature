Feature: Settings — family members, calendars, profile
  Settings is the canonical surface for managing family members, sending
  invites, toggling admins, connecting calendars, editing your profile,
  and signing out.

  Background:
    Given the user is signed in
    And the user is on /settings

  # ---- Family members card -----------------------------------------------

  Scenario: Current user appears at the top with a "You" badge
    Then the first row shows the current user's name + colored avatar
    And the "You" badge is visible
    And an "Edit profile" button opens EditProfileDialog

  Scenario: Edit your profile
    When the user opens EditProfileDialog
    And updates their name + color
    And saves
    Then the local `members[currentUserId]` is updated
    And the change persists on reload

  Scenario: Other adults are listed below the current user
    Given the family has another adult member
    Then they appear in the "Other adults" row
    And their invite status is shown (Joined / Pending)

  Scenario: Children appear in the children section
    Given the family has child members
    Then each child row shows the "Managed" badge

  # ---- Add member --------------------------------------------------------

  Scenario: Add an adult member with email
    When the user opens AddMemberDialog
    And enters name "Alex", role "adult", email "alex@example.com"
    And saves
    Then `family.addMember` runs server-side
    And the new member appears in the list with "Pending" invite status

  Scenario: Add a child member
    When the user adds a member with role "child"
    Then no email is required
    And the row shows "Managed"

  # ---- Send invite -------------------------------------------------------

  Scenario: Send an invite to an adult member with a pending status
    When the user clicks "Send Invite" next to a pending member
    Then `POST /api/invite/send` runs with that member's id
    And the member's `invite_token` and `invite_sent_at` are set
    And an email is sent (or logged) with a /accept-invite?token=<jwt> link
    And the toast confirms "Invite sent"

  Scenario: Resend invite to the same member
    Given an invite has already been sent
    When the user clicks "Send Invite" again
    Then a fresh invite_token is generated
    And the previous token is invalidated (overwritten)

  Scenario: Send-invite blocked for child members
    When the user attempts to invite a child
    Then the API returns 400 with "Can only invite adult members"

  # ---- Toggle admin ------------------------------------------------------

  Scenario: Promote an adult to admin
    When the user clicks "Admin" on an adult who isn't admin
    Then `POST /api/family/members/:id/toggle-admin` runs
    And the member's `is_admin` flips to true
    And the row immediately shows the ShieldCheck "Admin" badge

  Scenario: Owners cannot lose admin
    When the user attempts to toggle admin off the family owner
    Then the API returns 400 with "Owner must remain admin"
    And the UI shows a toast "Cannot remove admin"

  # ---- Remove member -----------------------------------------------------

  Scenario: Remove a non-owner member
    When the user clicks the trash icon on a non-owner member
    Then the local store removes them
    And `family.removeMember` (if present) syncs to the server
    And their dependent rows (calendar connections, etc.) cascade-delete

  # ---- Your calendars card -----------------------------------------------

  Scenario: Calendars card lists Google, Outlook, Apple
    Then the providers card shows all three options
    And each shows whether the current user has connected it

  Scenario: Apple connection shows the linked Apple ID
    Given the user has connected iCloud as "user@icloud.com"
    Then the Apple row shows "user@icloud.com" beneath the provider name

  Scenario: Sync now and disconnect controls
    Given the user has at least one connected provider
    Then a refresh button and an X (disconnect) button appear on that row
    When the user clicks refresh
    Then `syncConnection(connectionId)` runs and `last_synced_at` updates
    When the user clicks X
    Then `disconnectMutation` runs and the row reverts to "not connected"

  # ---- Sign out ----------------------------------------------------------

  Scenario: Sign out from Settings
    When the user clicks "Sign Out"
    Then `auth.signOut` clears the JWT
    And AuthContext's user becomes null
    And the family store is reset
    And the user lands on "/"

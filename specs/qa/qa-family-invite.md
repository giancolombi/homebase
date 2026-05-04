# QA Test Plan: Family Invites

**Feature:** Invite adult family members via email, accept/decline invites
**URL:** `https://gethomebase.dev/`
**Precondition:** Resend API key is configured. At least one user account exists with a family.

---

## Test Cases — Sending Invites

### TC-FI-01: Send invite to a new user (no existing account)

| Step | Action                                                                      | Expected Result                                                                            |
| ---- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 1    | Sign in as User A                                                           | Dashboard loads                                                                            |
| 2    | Go to Settings → Add Member → add an adult with email `newuser@example.com` | Member appears with "Pending" badge                                                        |
| 3    | Click "Send Invite" next to the new member                                  | Toast: "Invite sent! Email sent to newuser@example.com"                                    |
| 4    | Check the email inbox for `newuser@example.com`                             | Email received with subject containing "invited you to join" and an "Accept Invite" button |

### TC-FI-02: Send invite to an existing user who has no family

| Step | Action                                                                                          | Expected Result                                                     |
| ---- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 1    | User B signs up at the auth page but does NOT complete onboarding (closes browser after signup) | Account created, no family                                          |
| 2    | Sign in as User A → Settings → Add Member → add User B's email                                  | Member appears with "Pending" badge                                 |
| 3    | Click "Send Invite"                                                                             | Toast: "Invite sent!"                                               |
| 4    | User B checks their email and clicks "Accept Invite"                                            | Accept invite page loads with User B's email pre-filled             |
| 5    | User B enters their password and clicks "Accept & Join Family"                                  | User B signs in and joins User A's family. Redirected to dashboard. |

### TC-FI-03: Send invite to an existing user who already has a family

| Step | Action                                                          | Expected Result                                                                                                                                             |
| ---- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | User B signs up, completes onboarding, creates their own family | User B has their own family                                                                                                                                 |
| 2    | Sign in as User A → Settings → Add Member → add User B's email  | Member appears with "Pending" badge                                                                                                                         |
| 3    | Click "Send Invite"                                             | Toast: "Invite sent!"                                                                                                                                       |
| 4    | User B checks their email and clicks "Accept Invite"            | Accept invite page loads. Shows a message: "You currently belong to [User B's family]. Joining [User A's family] will remove you from your current family." |
| 5    | User B clicks "Accept & Join Family"                            | User B is moved to User A's family. Their old family data is preserved but they no longer belong to it. Redirected to dashboard showing User A's family.    |
| 6    | User B goes to Settings                                         | User B sees User A's family members, not their old family                                                                                                   |

### TC-FI-04: Decline invite (user stays in their current family)

| Step | Action                                                     | Expected Result                                     |
| ---- | ---------------------------------------------------------- | --------------------------------------------------- |
| 1    | User B receives an invite email while already in a family  |                                                     |
| 2    | User B clicks "Accept Invite" link                         | Accept invite page loads with family switch warning |
| 3    | User B clicks "Stay in my current family" / navigates away | No changes. User B stays in their current family.   |

### TC-FI-05: Send invite with no email address

| Step | Action                                | Expected Result                                  |
| ---- | ------------------------------------- | ------------------------------------------------ |
| 1    | Add a member without an email address | Member appears but no "Send Invite" button shown |

### TC-FI-06: Resend invite

| Step | Action                                        | Expected Result                                           |
| ---- | --------------------------------------------- | --------------------------------------------------------- |
| 1    | Send an invite to a user                      | Invite sent                                               |
| 2    | Click "Send Invite" again for the same member | New invite email sent. Previous invite token is replaced. |

---

## Test Cases — Accepting Invites

### TC-FI-07: Accept invite as a brand new user

| Step | Action                                            | Expected Result                                                                   |
| ---- | ------------------------------------------------- | --------------------------------------------------------------------------------- |
| 1    | Click the invite link from email                  | Accept invite page loads                                                          |
| 2    | Page shows the family name and the member name    | Pre-filled email, password field                                                  |
| 3    | Enter a password and click "Accept & Join Family" | Account is created. User is linked to the family member. Redirected to dashboard. |
| 4    | Go to Settings                                    | Shows the family with all members including themselves                            |

### TC-FI-08: Accept invite with expired token

| Step | Action                                                 | Expected Result                                         |
| ---- | ------------------------------------------------------ | ------------------------------------------------------- |
| 1    | Use an invite link with an expired token (7+ days old) | Accept invite page shows: "Invite has expired"          |
| 2    | No account is created or linked                        | User sees a "Go to Homebase" button to sign in normally |

### TC-FI-09: Accept invite with invalid token

| Step | Action                                             | Expected Result                                     |
| ---- | -------------------------------------------------- | --------------------------------------------------- |
| 1    | Navigate to `/accept-invite?token=invalid-garbage` | Page shows: "Invalid invite token" or similar error |

### TC-FI-10: Accept invite that was already accepted

| Step | Action                           | Expected Result                       |
| ---- | -------------------------------- | ------------------------------------- |
| 1    | Accept an invite successfully    | User joins family                     |
| 2    | Click the same invite link again | Page shows: "Invite already accepted" |

---

## Test Cases — Admin Roles

### TC-FI-11: Owner can toggle admin status

| Step | Action                                        | Expected Result                                                |
| ---- | --------------------------------------------- | -------------------------------------------------------------- |
| 1    | Sign in as the family owner (User A)          |                                                                |
| 2    | Go to Settings                                | See other adult members with a shield icon                     |
| 3    | Click the shield icon next to an adult member | "Admin" badge appears. Shield icon turns active (highlighted). |
| 4    | Click the shield icon again                   | "Admin" badge removed. Shield icon turns inactive.             |

### TC-FI-12: Admin can send invites

| Step | Action                                             | Expected Result             |
| ---- | -------------------------------------------------- | --------------------------- |
| 1    | User A promotes User B to admin                    |                             |
| 2    | Sign in as User B                                  |                             |
| 3    | Go to Settings → Add a new adult member with email |                             |
| 4    | Click "Send Invite"                                | Invite is sent successfully |

### TC-FI-13: Non-admin cannot toggle admin status

| Step | Action                               | Expected Result                                            |
| ---- | ------------------------------------ | ---------------------------------------------------------- |
| 1    | Sign in as a non-admin family member |                                                            |
| 2    | Go to Settings                       | Shield toggle icon should NOT be visible for other members |

### TC-FI-14: Cannot remove admin from the owner

| Step | Action                                  | Expected Result                                          |
| ---- | --------------------------------------- | -------------------------------------------------------- |
| 1    | The owner's admin badge is always shown | No toggle icon next to the owner — they are always admin |

---

## Test Cases — Single Family Constraint

### TC-FI-15: User can only belong to one family

| Step | Action                            | Expected Result                                                                                                                     |
| ---- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 1    | User B is in Family B             |                                                                                                                                     |
| 2    | User B accepts invite to Family A | User B is moved to Family A                                                                                                         |
| 3    | Check the database                | User B's `family_members` row in Family B has `user_id` set to NULL or is deleted. User B has a row in Family A with `user_id` set. |

### TC-FI-16: Owner cannot leave their family via invite

| Step | Action                            | Expected Result                                                                                                       |
| ---- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 1    | User B is the OWNER of Family B   |                                                                                                                       |
| 2    | User A invites User B to Family A | Invite sent                                                                                                           |
| 3    | User B clicks "Accept Invite"     | Warning: "You are the owner of [Family B]. You must transfer ownership or delete your family before joining another." |
| 4    | User B cannot proceed             | Join button is disabled or not shown                                                                                  |

---

## Pass Criteria

- Invites are sent via email with a valid, clickable link
- New users can create accounts and join via the invite link
- Existing users with families see a clear warning about switching families
- Users can only belong to one family at a time
- Family owners cannot abandon their family via invite
- Expired and invalid tokens are rejected gracefully
- Admin toggle works for owners, is restricted for non-admins
- "Send Invite" button is only shown for pending adult members with email addresses

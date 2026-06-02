Feature: Push notifications
  Homebase delivers push notifications to family members' iOS devices via APNs.

  # Coverage note: delivery requires Apple APNs credentials (a .p8 key + the
  # team/key/bundle ids) that aren't available in CI, so — like
  # external-calendar-sync.feature and emails.feature — these are verified by
  # api/ unit tests (the unconfigured no-op path) plus manual testing on a real
  # device, not by Playwright. When APNS_* env is unset, every send is a no-op.

  Scenario: iOS device registers for push on launch
    Given the user is signed in on the iOS app
    When the app boots
    Then it requests notification permission and registers for APNs
    And the device token is POSTed to /api/devices/register

  Scenario: Assigned task notifies the assignee
    Given push is configured (APNS_* env set)
    When a task is created and assigned to another family member
    Then that member's registered devices receive a "New task assigned" push
    And the creator is not notified

  Scenario: Dead tokens are pruned
    Given a device token APNs reports as Unregistered / BadDeviceToken / 410
    When a notification is sent to it
    Then the token row is deleted from device_tokens

  Scenario: Unconfigured APNs is a safe no-op
    Given APNS_* env is not set
    When the app attempts to send a push
    Then nothing is sent and no error surfaces

  # Not yet implemented (needs a scheduled worker): time-based event/task
  # reminders. The send pipeline (api/lib/apns.ts + notify.ts) is in place for
  # a cron/queue to call.

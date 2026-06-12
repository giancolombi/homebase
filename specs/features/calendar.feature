Feature: Calendar — events, day/week view, task overlay
  The Calendar page renders a day or week view with a swimlane per family
  member. Events come from three sources merged together: locally-created
  Homebase events, task deadlines, and externally-synced events from
  Google/Outlook/iCloud.

  Background:
    Given the user is signed in and has at least one family member
    And the user is on /calendar

  # ---- View modes ---------------------------------------------------------

  Scenario: Default day view
    Then the page shows "Day" toggled active
    And the visible time window is 6 AM through 9 PM
    And the date label reads today's date

  Scenario: Switch to week view
    When the user clicks the "Week" toggle
    Then 7 days from Monday are shown side-by-side
    And the date label reads "<Mon date> – <Sun date>"

  Scenario: Navigate by day in day view
    When the user clicks the right chevron
    Then the date advances one day
    And the "Today" label hides if the new date isn't today

  Scenario: Navigate by week in week view
    When the user clicks the right chevron in week view
    Then the visible range shifts forward 7 days

  Scenario: "Today" link returns to today's date
    Given the user has navigated forward several days
    When they click "Today"
    Then the date label resets to today

  # ---- Add event ----------------------------------------------------------

  Scenario: Open Add Event dialog from header
    When the user clicks "+ Event" in the header
    Then the AddEventDialog opens
    And the date defaults to the currently-viewed day
    And no time is preselected

  Scenario: Open Add Event dialog from a slot click
    When the user clicks the 9 AM slot in day view
    Then the AddEventDialog opens with start time preset to 09:00

  Scenario: Create a timed event
    When the user fills the dialog
      | Title       | Coffee with Alex |
      | Date        | today            |
      | Start time  | 10:00            |
      | End time    | 10:30            |
      | Member      | currentUser      |
    And clicks "Save"
    Then a new event is added to the store
    And `POST /api/calendar/events` mirrors it to the backend
    And the event renders on the day view at 10:00 with 30-min height
    And the event uses the assigned member's color

  Scenario: Created events are visible to the whole family
    Given the user created an event on this device
    When any family member loads the calendar on any device
    Then the event is pulled from the server (`GET /api/calendar/events`)
    # Events used to live only in this browser's localStorage — invisible
    # to the partner the shared calendar exists for.

  Scenario: Event edits and deletions sync to the backend
    When the user edits or deletes a Homebase event
    Then `PUT /api/calendar/events/:id` / `DELETE /api/calendar/events/:id` run
    And the change survives a reload with cleared local storage

  Scenario: Create an all-day event
    When the user enables "All day"
    And saves a "Family vacation" event for today
    Then the event renders as a full-width all-day chip at the top of the day

  # ---- Task deadlines as events ------------------------------------------

  Scenario: Tasks with deadlines appear on the calendar
    Given a task "Pay rent" with deadline today at 14:00 and status "todo"
    Then a 📋 chip titled "Pay rent" renders at 14:00
    And the chip is styled with the assigned member's color

  Scenario: Done tasks don't clutter the calendar
    Given a task with deadline today and status "done"
    Then no chip for that task appears on the calendar

  Scenario: Task deadline without a time defaults to 09:00
    Given a task with `deadline` but no `deadlineTime`
    Then the chip renders at 09:00 with a 1-hour height

  # ---- External events ---------------------------------------------------

  Scenario: Google events appear with a 📅 prefix
    Given a synced Google event "Standup" exists for today at 09:30
    Then a chip "📅 Standup" renders at 09:30

  Scenario: Outlook events appear with a 📆 prefix
    Given a synced Outlook event "Client review" exists for today at 14:00
    Then a chip "📆 Client review" renders at 14:00

  Scenario: Empty state when no members
    Given the user has no family members
    Then the calendar shows "Add family members to see calendars"
    And the day grid is hidden

  # ---- Event layout edge cases -------------------------------------------

  Scenario: Event spanning before 6 AM is clipped to the visible window
    Given an event 04:30 → 07:00
    Then it renders starting at 06:00 with a "starts before window" indicator

  Scenario: Event spanning past 9 PM is clipped to the visible window
    Given an event 20:00 → 23:00
    Then it renders ending at 22:00 with an "ends after window" indicator

  Scenario: Midnight-spanning event is clipped to end-of-day
    Given an event 23:00 → 02:00 (next day)
    Then the original day's chip ends at 23:59

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
    And the event renders on the day view at 10:00 with 30-min height
    And the event uses the assigned member's color

  Scenario: Homebase events persist to the backend and sync across the family
    Given the user creates the event "Dentist appointment"
    Then it is saved via POST /api/calendar/events under the family
    And after clearing localStorage and reloading, pullAllData re-hydrates it
    And other family members see it on their calendar
    # Homebase events live in the store (hydrated by pullAllData) and are
    # pushed fire-and-forget on create/update/delete; the calendar view
    # excludes source="homebase" from the API merge to avoid double-rendering.

  Scenario: Recurring events repeat across the visible window
    When the user creates a "Morning workout" event with recurrence "daily"
    Then an occurrence renders on each day of the week view
    And a weekly event renders once per week, a monthly event once per month
    # expandRecurringEvents generates concrete dated occurrences within the
    # visible range; the start-date occurrence keeps the original id so it
    # stays editable.

  Scenario: Create an all-day event
    When the user enables "All day"
    And saves a "Family vacation" event for today
    Then the event renders as a full-width all-day chip at the top of the day

  Scenario: Search events by title
    Given the calendar has an event "Piano lesson"
    When the user types "piano" into the event search box
    Then only events whose title matches are shown
    And clearing the search restores all events

  # ---- External sync robustness ------------------------------------------

  Scenario: Large external calendars are fully paginated
    Given a connected Google or Outlook calendar with more than 250 events
    When the calendar syncs
    Then all pages are fetched (nextPageToken / @odata.nextLink) up to a cap
    And events beyond the first page are not dropped or purged

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

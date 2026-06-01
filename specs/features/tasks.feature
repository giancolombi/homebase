Feature: Tasks
  Family members share a task list grouped into categories. Each task can
  have a deadline, an assigned member, a recurrence, and a status. Default
  categories (Home, School, Work, Health, Errands) are seeded when the
  family is created.

  Background:
    Given the user is signed in and has a family
    And the user is on /tasks

  # ---- Empty / default state ---------------------------------------------

  Scenario: Default categories appear after onboarding
    Given the family was just created
    Then the categories sidebar lists "Home", "School", "Work", "Health", "Errands"

  Scenario: Empty task list shows the empty state
    Given no tasks exist for the family
    Then the page shows "No tasks yet" copy and a "+ Add task" button

  # ---- Create -------------------------------------------------------------

  Scenario: Create a task with category, deadline, and assignee
    When the user clicks "+ Add task"
    And fills "Title" with "Pay rent"
    And picks category "Home"
    And picks deadline "next Friday at 14:00"
    And assigns it to currentUser
    And clicks "Save"
    Then a row exists in `tasks` with the chosen attributes
    And the task appears in the list under "Home"
    And it appears at 14:00 on the calendar's next-Friday view

  Scenario: Create a task without a deadline
    When the user creates a task without setting a deadline
    Then the row is created with `deadline: null`
    And no chip appears on the calendar for that task

  Scenario: Recurring tasks
    When the user creates a task with `recurrence: "weekly"`
    Then the row stores `recurrence` as "weekly"
    And the calendar surfaces an instance for each upcoming week

  # ---- Update / status ----------------------------------------------------

  Scenario: Mark a task done
    When the user clicks the checkbox next to a "todo" task
    Then `tasks.update` runs with `status: "done"`
    And the task moves to the "Done" group
    And its calendar chip disappears

  Scenario: Re-open a done task
    When the user un-checks a "done" task
    Then `status` flips back to "todo"
    And the calendar chip reappears

  Scenario: Edit a task's details
    When the user clicks the edit (pencil) button on a task
    And changes title, deadline, time, recurrence, status, or assignee
    And saves
    Then the row is updated server-side
    And the local store reflects the change immediately (optimistic)

  Scenario: A task can be marked in progress
    When the user edits a task and sets its status to "in progress"
    Then the row shows an "In progress" badge
    And the status is not "done" (the checkbox stays unchecked)

  # ---- Delete -------------------------------------------------------------

  Scenario: Delete a task
    When the user clicks the trash icon on a task
    Then `tasks.remove` is called
    And the task disappears from the list and the calendar

  # ---- Categories --------------------------------------------------------

  Scenario: Add a custom category
    When the user creates a category named "Garage"
    Then `task_categories` gets a new row
    And the sidebar lists "Garage" alongside the defaults

  Scenario: Filter by category
    When the user clicks "School" in the sidebar
    Then only tasks with `category_id` matching School are shown
    And the count badge updates accordingly

  # ---- Sync mechanics -----------------------------------------------------

  Scenario: Optimistic UI mirrors server outcome
    When a network request fails
    Then the optimistic local change is kept
    And a console warning surfaces but no toast
    And the next successful pull reconciles the state

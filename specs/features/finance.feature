Feature: Finance — accounts, transactions, Plaid
  The Finance page lists bank accounts (with balances, savings goals, and
  monthly trends) and the family's transactions. Accounts can be linked
  via Plaid (real bank sync) or added manually.

  Background:
    Given the user is signed in and has a family
    And the user is on /finance

  # ---- Accounts ----------------------------------------------------------

  Scenario: Empty state with no accounts
    Then the page shows "No accounts yet" copy and a "Manage Accounts" button

  Scenario: Add a manual account
    When the user opens "Manage Accounts" → "+ Add manual"
    And fills name "Joint Checking", institution "Chase", balance "1500"
    And saves
    Then a row in `bank_accounts` is created with those fields
    And the account appears in the Accounts list with $1,500.00

  Scenario: Toggle the savings-goal field
    When the user clicks the goal pencil on an account
    And enters "10000"
    Then the account row's `savings_goal` is updated server-side

  Scenario: Mark an account as featured
    When the user toggles the star on one account
    Then `is_featured: true` is persisted
    And only one account is featured at a time (UI clears others)

  Scenario: Remove a manual account
    When the user clicks trash on a manual account
    Then `finance.removeAccount` runs
    And the account row + its transactions are CASCADE-deleted

  # ---- Plaid integration -------------------------------------------------

  Scenario: Connect a bank via Plaid
    When the user clicks "Link a bank" in Manage Accounts
    Then `plaid.createLinkToken(familyId)` returns a short-lived token
    And `usePlaidLink` opens the Plaid Link UI
    When the user finishes Plaid Link with a public_token
    Then `POST /api/plaid/exchange` swaps the public_token for an access_token
    And `plaid_items` gets a row with the encrypted access_token
    And `bank_accounts` gets a row per Plaid account
    And the first transactions sync runs synchronously
    And the toast says "Bank connected"

  Scenario: Transactions sync incrementally via /transactions/sync
    When the user clicks the refresh icon on a linked Plaid item
    Then `POST /api/plaid/sync` runs
    And only added/modified/removed transactions since the last cursor are processed
    And the cursor on `plaid_items` is advanced
    And the result toast reports "+X / ~Y / −Z transactions"

  Scenario: Plaid sync with a stored cursor (no full re-pull)
    Given a Plaid item with `transactions_cursor` set from a prior sync
    When sync runs again
    Then the call uses the existing cursor (not a full pull)
    And only deltas are applied

  Scenario: Plaid auth revoked / item login required
    When Plaid returns an `ITEM_LOGIN_REQUIRED` error
    Then the toast surfaces a clear message asking the user to reconnect
    And the connection is flagged in the UI

  Scenario: Unlink a Plaid item
    When the user clicks "Unlink" on a connected bank
    Then `POST /api/plaid/items/:id/remove` is called
    And the `plaid_items` row + associated `bank_accounts` are removed

  # ---- Transactions ------------------------------------------------------

  Scenario: Transactions list filtered by category
    When the user clicks a category in the breakdown
    Then only transactions with that category are listed below

  Scenario: Update a transaction's category
    When the user changes a transaction's category
    Then `finance.updateTransaction` persists the change
    And the breakdown re-aggregates immediately

  # ---- Insights / charts -------------------------------------------------

  Scenario: Spend-by-category pie chart
    Then categories sum to 100% of spend in the displayed period
    And empty categories don't render

  Scenario: Account balance trend
    Then each account's monthly_balances renders as a line chart
    And the most-recent month's value matches the current `balance`

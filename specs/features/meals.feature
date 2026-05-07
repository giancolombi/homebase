Feature: Meals — recipes, weekly plan, shopping list
  The Meals page has three tabs: Recipes (the family's recipe library),
  Plan (the weekly meal plan), and Shopping (the auto-generated list).
  A FoodLab tab is covered separately in foodlab.feature.

  Background:
    Given the user is signed in and has a family
    And the user is on /meals

  # ---- Recipes ------------------------------------------------------------

  Scenario: Empty recipe library shows the empty state
    Given the family has no recipes
    Then the Recipes tab shows the empty state with "+ Add recipe"

  Scenario: Add a recipe manually
    When the user opens AddRecipeDialog
    And fills title, prep time, cook time, servings, ingredients, steps
    And clicks "Save"
    Then a row exists in `recipes` with the structured fields
    And the recipe appears in the library
    And `meals.createRecipe` was called

  Scenario: Edit a recipe
    When the user clicks edit on an existing recipe and changes the title
    And saves
    Then the row is updated server-side
    And the card in the library shows the new title

  Scenario: Delete a recipe
    When the user clicks the trash icon on a recipe
    Then `meals.removeRecipe` runs
    And the recipe disappears from the library
    And any meal-plan entries referencing it are dangling (handled by the planner)

  # ---- Weekly plan --------------------------------------------------------

  Scenario: Switch weeks
    Given the user is viewing this week
    When they click the right chevron
    Then the week shifts forward by 7 days
    And the URL doesn't need to change (state is local)

  Scenario: Add a recipe to a meal slot
    When the user drags or clicks "Add" on the Tuesday/Dinner slot
    And selects "Tacos"
    Then a `mealPlan` entry is created with date, mealType: "dinner", recipeId
    And the slot shows the recipe title

  Scenario: Remove a recipe from the plan
    When the user clicks the X on a meal-plan entry
    Then the entry is removed from the store and the server

  # ---- Shopping list ------------------------------------------------------

  Scenario: Generate shopping list from the week's plan
    Given the week's plan has 5 recipes with overlapping ingredients
    When the user clicks "Generate shopping list"
    Then ingredients are consolidated by name (case-insensitive)
    And quantities are summed per unit
    And the list is grouped by category (Produce, Dairy, Pantry, etc.)
    And `updateShoppingList` persists the result

  Scenario: Check off shopping items
    When the user clicks a shopping item's checkbox
    Then `toggleShoppingItem` flips its `checked` state
    And `meals.toggleShopping` runs server-side

  Scenario: Replace the entire shopping list
    When the user regenerates the list with a different week
    Then `meals.replaceShopping` is called with the new array
    And the previous list is overwritten on the server

  # ---- Empty / first-run --------------------------------------------------

  Scenario: Plan tab without any members
    Given the family has no members yet
    Then the meal-planner tabs render but with no per-member dietary context

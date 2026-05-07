Feature: FoodLab integration
  The FoodLab tab on /meals integrates with the public FoodLab recipe
  repository. Users browse curated recipes, get matches based on
  ingredients they have at home, see per-member dietary versions
  (vegetarian / meat), rate recipes 1-5, and import any recipe into
  the family's local recipe library + weekly plan.

  Background:
    Given the user is signed in and has a family
    And the user is on /meals → FoodLab tab

  # ---- Browse / search ---------------------------------------------------

  Scenario: Recipes load from the FoodLab GitHub repo
    When the user opens FoodLab
    Then `foodlabSync` fetches the latest recipes
    And `foodlabRecipes` is populated in the store
    And `foodlabLastSynced` records the timestamp

  Scenario: Filter recipes by cuisine
    When the user filters by "Italian"
    Then only recipes with that cuisine tag render

  Scenario: Search recipes by name or ingredient
    When the user types "chicken"
    Then matching recipes (any field containing "chicken") are listed

  # ---- Ingredient matcher -------------------------------------------------

  Scenario: Match recipes to ingredients I have
    When the user enters "chicken, garlic, rice" into the ingredient matcher
    Then recipes are ranked by the fraction of their ingredients I have
    And recipes with 100% coverage appear first

  # ---- Per-member dietary -----------------------------------------------

  Scenario: Member with noMeat sees the vegetarian version
    Given the current user has `memberDietary[currentUserId].noMeat = true`
    When they view a recipe that has both meat and veg variants
    Then the veg variant is selected by default

  Scenario: Member without noMeat sees the meat version
    Given the current user's dietary has `noMeat: false`
    Then the meat variant is selected by default

  Scenario: Edit dietary restrictions
    When the user opens DietaryEditor for a member
    And toggles noSoy, noDairy, noMeat
    And clicks save
    Then `memberDietary[memberId]` is updated in the store
    And subsequent recipe views honor the new restrictions

  # ---- Ratings -----------------------------------------------------------

  Scenario: Rate a recipe
    When the user clicks 4 stars on a recipe
    Then a `FoodLabRating` is added to `foodlabRatings` for that recipe
    And the recipe card displays the user's 4-star rating

  Scenario: Ratings influence future suggestions
    Given the user has rated several recipes
    When the meal-planner suggests recipes
    Then high-rated recipes are weighted more heavily
    (ranking is computed from `foodlabRatings`)

  # ---- Import to library -------------------------------------------------

  Scenario: Import a FoodLab recipe to my library
    When the user clicks "Add to my recipes" on a FoodLab recipe
    Then `importFoodlabToMeals` creates a Recipe in the local store
    And the recipe shows up in the Recipes tab

  Scenario: Import the version that matches my dietary
    Given the user is vegetarian (`noMeat: true`)
    When they import a recipe with both variants
    Then `getRecipeVersionForMember` returns "veg"
    And the imported recipe stores the veg ingredients/steps

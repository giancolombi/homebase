import type {
  FoodLabRecipe,
  DietaryRestrictions,
  FoodLabRating,
} from "@/types/foodlab";

// Keyword heuristics for detecting which dietary restrictions a recipe is
// likely to violate. The FoodLab data only ships veg/meat variants, so the
// remaining restrictions can't switch the recipe — instead we surface a clear
// warning so a member with that restriction isn't blindsided.
const CONFLICT_KEYWORDS: Record<keyof DietaryRestrictions, string[]> = {
  noMeat: [
    "beef",
    "chicken",
    "pork",
    "lamb",
    "bacon",
    "ham",
    "sausage",
    "turkey",
  ],
  noDairy: [
    "milk",
    "cheese",
    "butter",
    "cream",
    "yogurt",
    "feta",
    "parmesan",
    "mozzarella",
    "ghee",
  ],
  noGluten: [
    "flour",
    "bread",
    "pasta",
    "wheat",
    "couscous",
    "breadcrumb",
    "noodle",
    "barley",
    "soy sauce",
  ],
  noNuts: [
    "almond",
    "cashew",
    "peanut",
    "walnut",
    "pistachio",
    "pecan",
    "hazelnut",
    "nut",
  ],
  noEggs: ["egg"],
  noSoy: ["soy", "tofu", "edamame", "tempeh", "miso"],
  noFish: ["fish", "anchovy", "salmon", "tuna", "cod", "shrimp", "prawn"],
  noPork: ["pork", "bacon", "ham", "prosciutto", "chorizo"],
  custom: [],
};

const LABELS: Partial<Record<keyof DietaryRestrictions, string>> = {
  noMeat: "meat",
  noDairy: "dairy",
  noGluten: "gluten",
  noNuts: "nuts",
  noEggs: "eggs",
  noSoy: "soy",
  noFish: "fish",
  noPork: "pork",
};

function recipeText(recipe: FoodLabRecipe, version: "veg" | "meat"): string {
  const variant = version === "veg" ? recipe.vegVersion : recipe.meatVersion;
  return [
    ...recipe.sharedBase,
    variant?.protein ?? "",
    ...(variant?.steps ?? []),
  ]
    .join(" ")
    .toLowerCase();
}

/**
 * Return human-readable labels for the restrictions a recipe appears to
 * violate, e.g. ["dairy", "gluten"]. Custom free-form restrictions are matched
 * verbatim against the recipe text.
 */
export function getDietaryConflicts(
  recipe: FoodLabRecipe,
  version: "veg" | "meat",
  restrictions: DietaryRestrictions,
): string[] {
  const text = recipeText(recipe, version);
  const conflicts: string[] = [];

  (Object.keys(CONFLICT_KEYWORDS) as (keyof DietaryRestrictions)[]).forEach(
    (key) => {
      if (key === "custom") return;
      if (!restrictions[key]) return;
      const hit = CONFLICT_KEYWORDS[key].some((kw) => text.includes(kw));
      if (hit && LABELS[key]) conflicts.push(LABELS[key]!);
    },
  );

  for (const c of restrictions.custom ?? []) {
    const term = c.trim().toLowerCase();
    if (term && text.includes(term)) conflicts.push(c.trim());
  }

  return conflicts;
}

/**
 * Average rating (1–5) for a dish across all members, or 0 if unrated.
 * Used to rank recipes so well-liked dishes surface first.
 */
export function averageRating(ratings: FoodLabRating[], dish: string): number {
  const forDish = ratings.filter((r) => r.dish === dish);
  if (forDish.length === 0) return 0;
  return forDish.reduce((sum, r) => sum + r.rating, 0) / forDish.length;
}

/** A single member's rating for a dish+version, or 0 if they haven't rated it. */
export function memberRating(
  ratings: FoodLabRating[],
  dish: string,
  version: "veg" | "meat",
  memberId: string | null | undefined,
): number {
  const found = ratings.find(
    (r) => r.dish === dish && r.version === version && r.memberId === memberId,
  );
  return found?.rating ?? 0;
}

import type { FoodLabRecipe } from "@/types/foodlab";
import type { Recipe, RecipeIngredient } from "@/types/family";

/**
 * Parse a FoodLab markdown recipe file into a structured FoodLabRecipe object.
 */
export function parseFoodLabRecipe(
  filename: string,
  content: string,
  category: "main" | "breakfast" = "main",
): FoodLabRecipe {
  const slug = filename.replace(/\.md$/, "");
  const lines = content.split("\n");

  // Title: first H1
  const titleLine = lines.find((l) => l.startsWith("# "));
  const title = titleLine ? titleLine.replace(/^#\s+/, "") : slug;

  // Metadata line: **Cuisine:** X | **Freezer-friendly:** Y | **Prep:** Z | **Cook:** W
  const metaLine = lines.find((l) => l.includes("**Cuisine:**"));
  let cuisine = "";
  // Only claim freezer-friendly when the recipe explicitly says so —
  // defaulting to true mislabels every recipe with missing metadata.
  let freezerFriendly = false;
  let prepTime = "";
  let cookTime = "";

  if (metaLine) {
    const cuisineMatch = metaLine.match(/\*\*Cuisine:\*\*\s*([^|]+)/);
    if (cuisineMatch) cuisine = cuisineMatch[1].trim();

    const freezerMatch = metaLine.match(/\*\*Freezer-friendly:\*\*\s*([^|]+)/);
    if (freezerMatch)
      freezerFriendly = !freezerMatch[1].trim().toLowerCase().startsWith("no");

    const prepMatch = metaLine.match(/\*\*Prep:\*\*\s*([^|]+)/);
    if (prepMatch) prepTime = prepMatch[1].trim();

    const cookMatch = metaLine.match(/\*\*Cook:\*\*\s*([^|]+)/);
    if (cookMatch) cookTime = cookMatch[1].trim();
  }

  // Split by --- separators to find sections
  const sections = content.split(/\n---\n/);

  // Shared base: collect all "- " lines before the first ---
  const baseSection = sections[0] || "";
  const sharedBase = baseSection
    .split("\n")
    .filter((l) => l.startsWith("- "))
    .map((l) => l.replace(/^-\s+/, ""));

  // Find vegetarian version section
  const vegSection = sections.find(
    (s) => s.includes("## Vegetarian Version") || s.includes("## Vegetarian"),
  );
  const vegProteinMatch = vegSection?.match(/\*\*Protein:\*\*\s*(.+)/);
  const vegProtein = vegProteinMatch ? vegProteinMatch[1].trim() : "";
  const vegSteps = extractNumberedSteps(vegSection || "");

  // Find meat version section
  const meatSection = sections.find(
    (s) => s.includes("## Meat Version") || s.includes("## Meat"),
  );
  const meatProteinMatch = meatSection?.match(/\*\*Protein:\*\*\s*(.+)/);
  const meatProtein = meatProteinMatch ? meatProteinMatch[1].trim() : "";
  const meatSteps = extractNumberedSteps(meatSection || "");

  // Source URLs
  const sourceUrls: string[] = [];
  const urlMatches = content.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g);
  for (const match of urlMatches) {
    if (
      match[2] &&
      !match[2].includes("recipes/") &&
      !match[2].includes("weeks/")
    ) {
      sourceUrls.push(match[2]);
    }
  }

  return {
    id: slug,
    slug,
    title,
    cuisine,
    freezerFriendly,
    prepTime,
    cookTime,
    category,
    sharedBase,
    vegVersion: { protein: vegProtein, steps: vegSteps },
    meatVersion: { protein: meatProtein, steps: meatSteps },
    sourceUrls,
  };
}

function extractNumberedSteps(section: string): string[] {
  return section
    .split("\n")
    .filter((l) => /^\d+\.\s/.test(l.trim()))
    .map((l) => l.trim().replace(/^\d+\.\s+/, ""));
}

/**
 * Convert a FoodLabRecipe into a homebase Recipe for the meal planner.
 */
export function foodlabToHomebaseRecipe(
  flRecipe: FoodLabRecipe,
  preference: "veg" | "meat",
): Recipe {
  const version =
    preference === "veg" ? flRecipe.vegVersion : flRecipe.meatVersion;
  const suffix = preference === "veg" ? "(Veg)" : "(Meat)";

  // Parse shared base ingredients into RecipeIngredient format
  const ingredients: RecipeIngredient[] = flRecipe.sharedBase.map((line) => {
    const parsed = parseIngredientLine(line);
    return parsed;
  });

  // Add the protein as an ingredient
  if (version.protein) {
    ingredients.unshift({
      name: version.protein,
      amount: "",
      unit: "",
      category: "Proteins",
    });
  }

  return {
    id: `foodlab-${flRecipe.slug}-${preference}`,
    title: `${flRecipe.title} ${suffix}`,
    description: `${flRecipe.cuisine} cuisine. ${flRecipe.freezerFriendly ? "Freezer-friendly." : ""}`,
    prepTime: parseTimeToMinutes(flRecipe.prepTime),
    cookTime: parseTimeToMinutes(flRecipe.cookTime),
    servings: 4,
    ingredients,
    steps: version.steps,
    tags: [
      flRecipe.cuisine.toLowerCase(),
      "foodlab",
      preference,
      ...(flRecipe.freezerFriendly ? ["freezer-friendly"] : []),
    ],
    sourceUrl: flRecipe.sourceUrls[0],
  };
}

function parseIngredientLine(line: string): RecipeIngredient {
  // Try to match "2 tbsp olive oil" or "1 can (15 oz) chickpeas"
  const match = line.match(
    /^([\d½¼¾⅓⅔⅛/]+(?:\s*[\d½¼¾⅓⅔⅛/]*)?)\s+([\w().\s]+?)\s+(.+)$/,
  );
  if (match) {
    return {
      name: match[3].trim(),
      amount: match[1].trim(),
      unit: match[2].trim(),
      category: guessCategory(match[3]),
    };
  }

  // Fallback: just use the whole line as name
  return {
    name: line,
    amount: "",
    unit: "",
    category: guessCategory(line),
  };
}

function guessCategory(ingredient: string): string {
  const lower = ingredient.toLowerCase();
  if (
    /onion|garlic|pepper|potato|carrot|spinach|kale|zucchini|mushroom|tomato|eggplant|broccoli|celery|ginger|lime|lemon|cilantro|parsley|sweet potato/.test(
      lower,
    )
  )
    return "Produce";
  if (/chicken|beef|pork|tofu|sausage|steak/.test(lower)) return "Proteins";
  if (/chickpea|lentil|bean|jackfruit/.test(lower)) return "Canned";
  if (
    /cumin|paprika|cinnamon|oregano|thyme|berbere|curry|gochujang|allspice/.test(
      lower,
    )
  )
    return "Spices";
  if (
    /oil|broth|coconut milk|tomato paste|soy sauce|coconut aminos/.test(lower)
  )
    return "Pantry";
  if (/rice|couscous|noodle|bread|tortilla/.test(lower)) return "Grains";
  if (/cheese|feta|yogurt|cream/.test(lower)) return "Dairy";
  return "Other";
}

function parseTimeToMinutes(timeStr: string): number | undefined {
  if (!timeStr) return undefined;
  const hrMatch = timeStr.match(/([\d.]+)\s*hr/);
  const minMatch = timeStr.match(/(\d+)\s*min/);
  let total = 0;
  if (hrMatch) total += parseFloat(hrMatch[1]) * 60;
  if (minMatch) total += parseInt(minMatch[1]);
  return total || undefined;
}

/**
 * Match user ingredients against FoodLab recipes.
 * Returns recipes ranked by how many user ingredients they use.
 */
export function matchRecipesByIngredients(
  recipes: FoodLabRecipe[],
  userIngredients: string[],
): { recipe: FoodLabRecipe; matched: string[]; missing: string[] }[] {
  // Drop empty/1-char tokens: "".includes() matches everything, so a stray
  // comma or space in the input would rank every recipe as a full match.
  const normalized = userIngredients
    .map((i) => i.toLowerCase().trim())
    .filter((i) => i.length >= 2);

  return recipes
    .map((recipe) => {
      const allIngredients = recipe.sharedBase.map((l) => l.toLowerCase());
      const matched: string[] = [];
      const missing: string[] = [];

      for (const ing of allIngredients) {
        const found = normalized.some(
          (u) => ing.includes(u) || u.includes(ing.split(",")[0].trim()),
        );
        if (found) matched.push(ing);
        else missing.push(ing);
      }

      return { recipe, matched, missing };
    })
    .filter((r) => r.matched.length > 0)
    .sort((a, b) => {
      // Sort by match ratio (highest first), then by fewest missing
      const ratioA = a.matched.length / (a.matched.length + a.missing.length);
      const ratioB = b.matched.length / (b.matched.length + b.missing.length);
      if (ratioB !== ratioA) return ratioB - ratioA;
      return a.missing.length - b.missing.length;
    });
}

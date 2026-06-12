import {
  parseFoodLabRecipe,
  foodlabToHomebaseRecipe,
  matchRecipesByIngredients,
} from "@/lib/foodlabParser";

const SAMPLE = `# Chickpea Tagine

**Cuisine:** Moroccan | **Freezer-friendly:** Yes | **Prep:** 15 min | **Cook:** 1 hr 10 min

- 2 tbsp olive oil
- 1 onion
- 1 can (15 oz) chickpeas

---

## Vegetarian Version

**Protein:** extra chickpeas

1. Sauté the onion.
2. Add chickpeas and simmer.

---

## Meat Version

**Protein:** chicken thighs

1. Brown the chicken.
2. Add everything and simmer.

[Original recipe](https://example.com/tagine)
`;

describe("parseFoodLabRecipe", () => {
  it("parses title, metadata, base ingredients, and both versions", () => {
    const recipe = parseFoodLabRecipe("chickpea-tagine.md", SAMPLE);
    expect(recipe.slug).toBe("chickpea-tagine");
    expect(recipe.title).toBe("Chickpea Tagine");
    expect(recipe.cuisine).toBe("Moroccan");
    expect(recipe.freezerFriendly).toBe(true);
    expect(recipe.sharedBase).toEqual([
      "2 tbsp olive oil",
      "1 onion",
      "1 can (15 oz) chickpeas",
    ]);
    expect(recipe.vegVersion.protein).toBe("extra chickpeas");
    expect(recipe.vegVersion.steps).toHaveLength(2);
    expect(recipe.meatVersion.protein).toBe("chicken thighs");
    expect(recipe.sourceUrls).toEqual(["https://example.com/tagine"]);
  });

  it("does not claim freezer-friendly when metadata is missing", () => {
    const recipe = parseFoodLabRecipe("bare.md", "# Bare Recipe\n- salt\n");
    expect(recipe.freezerFriendly).toBe(false);
  });

  it("survives malformed input without throwing", () => {
    const recipe = parseFoodLabRecipe("junk.md", "::: not markdown at all");
    expect(recipe.title).toBe("junk");
    expect(recipe.sharedBase).toEqual([]);
    expect(recipe.vegVersion.steps).toEqual([]);
  });
});

describe("foodlabToHomebaseRecipe", () => {
  const recipe = parseFoodLabRecipe("chickpea-tagine.md", SAMPLE);

  it("uses the veg version for vegetarian preference", () => {
    const hb = foodlabToHomebaseRecipe(recipe, "veg");
    expect(hb.title).toBe("Chickpea Tagine (Veg)");
    expect(hb.ingredients[0].name).toBe("extra chickpeas");
    expect(hb.steps).toEqual(recipe.vegVersion.steps);
  });

  it("uses the meat version otherwise and parses times to minutes", () => {
    const hb = foodlabToHomebaseRecipe(recipe, "meat");
    expect(hb.title).toBe("Chickpea Tagine (Meat)");
    expect(hb.prepTime).toBe(15);
    expect(hb.cookTime).toBe(70); // 1 hr 10 min
  });
});

describe("matchRecipesByIngredients", () => {
  const recipe = parseFoodLabRecipe("chickpea-tagine.md", SAMPLE);

  it("matches on ingredient substrings", () => {
    const results = matchRecipesByIngredients([recipe], ["chickpeas", "onion"]);
    expect(results).toHaveLength(1);
    expect(results[0].matched.length).toBeGreaterThanOrEqual(2);
  });

  it("ignores empty and one-character tokens instead of matching everything", () => {
    expect(matchRecipesByIngredients([recipe], ["", " ", "x"])).toHaveLength(0);
  });

  it("returns nothing when no ingredients match", () => {
    expect(matchRecipesByIngredients([recipe], ["durian"])).toHaveLength(0);
  });
});

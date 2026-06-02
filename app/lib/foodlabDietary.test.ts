import { describe, it, expect } from "vitest";
import {
  getDietaryConflicts,
  averageRating,
  memberRating,
} from "./foodlabDietary";
import {
  DEFAULT_DIETARY_RESTRICTIONS,
  type FoodLabRecipe,
  type FoodLabRating,
} from "@/types/foodlab";

const recipe: FoodLabRecipe = {
  id: "1",
  slug: "feta-pasta",
  title: "Feta Pasta",
  cuisine: "italian",
  freezerFriendly: false,
  prepTime: "10",
  cookTime: "20",
  category: "main",
  sharedBase: ["200 g pasta", "1 block feta cheese", "olive oil"],
  vegVersion: { protein: "chickpeas", steps: ["boil pasta", "bake feta"] },
  meatVersion: { protein: "chicken", steps: ["boil pasta", "bake feta"] },
  sourceUrls: [],
  raw: "",
};

describe("getDietaryConflicts", () => {
  it("flags dairy and gluten for the veg version", () => {
    const conflicts = getDietaryConflicts(recipe, "veg", {
      ...DEFAULT_DIETARY_RESTRICTIONS,
      noDairy: true,
      noGluten: true,
    });
    expect(conflicts).toContain("dairy");
    expect(conflicts).toContain("gluten");
  });

  it("flags meat only on the meat version", () => {
    const veg = getDietaryConflicts(recipe, "veg", {
      ...DEFAULT_DIETARY_RESTRICTIONS,
      noMeat: true,
    });
    const meat = getDietaryConflicts(recipe, "meat", {
      ...DEFAULT_DIETARY_RESTRICTIONS,
      noMeat: true,
    });
    expect(veg).not.toContain("meat");
    expect(meat).toContain("meat");
  });

  it("returns no conflicts when nothing is restricted", () => {
    expect(
      getDietaryConflicts(recipe, "veg", DEFAULT_DIETARY_RESTRICTIONS),
    ).toEqual([]);
  });

  it("matches custom free-form restrictions", () => {
    const conflicts = getDietaryConflicts(recipe, "veg", {
      ...DEFAULT_DIETARY_RESTRICTIONS,
      custom: ["olive oil"],
    });
    expect(conflicts).toContain("olive oil");
  });
});

describe("rating helpers", () => {
  const ratings: FoodLabRating[] = [
    {
      dish: "a",
      version: "veg",
      rating: 4,
      memberId: "m1",
      notes: "",
      date: "",
    },
    {
      dish: "a",
      version: "veg",
      rating: 2,
      memberId: "m2",
      notes: "",
      date: "",
    },
  ];

  it("averageRating averages across members", () => {
    expect(averageRating(ratings, "a")).toBe(3);
    expect(averageRating(ratings, "missing")).toBe(0);
  });

  it("memberRating returns the member's own rating", () => {
    expect(memberRating(ratings, "a", "veg", "m1")).toBe(4);
    expect(memberRating(ratings, "a", "veg", "nobody")).toBe(0);
  });
});

export interface FoodLabRecipe {
  id: string;
  slug: string; // kebab-case filename without .md
  title: string;
  cuisine: string;
  freezerFriendly: boolean;
  prepTime: string;
  cookTime: string;
  category: "main" | "breakfast";
  sharedBase: string[]; // ingredient lines
  vegVersion: {
    protein: string;
    steps: string[];
  };
  meatVersion: {
    protein: string;
    steps: string[];
  };
  sourceUrls: string[];
}

export interface FoodLabRating {
  dish: string; // slug
  rating: number; // 1-5
  version: "veg" | "meat";
  memberId?: string; // which family member rated it
  notes: string;
  date: string;
}

/** Dietary restrictions that can be assigned per family member */
export interface DietaryRestrictions {
  noSoy: boolean;
  noDairy: boolean;
  noGluten: boolean;
  noNuts: boolean;
  noEggs: boolean;
  noMeat: boolean; // vegetarian
  noFish: boolean;
  noPork: boolean;
  custom: string[]; // free-form restrictions like "no shellfish"
}

export const DEFAULT_DIETARY_RESTRICTIONS: DietaryRestrictions = {
  noSoy: false,
  noDairy: false,
  noGluten: false,
  noNuts: false,
  noEggs: false,
  noMeat: false,
  noFish: false,
  noPork: false,
  custom: [],
};

/** Per-member dietary profile, keyed by member ID */
export type MemberDietaryMap = Record<string, DietaryRestrictions>;

export interface FoodLabState {
  foodlabRecipes: FoodLabRecipe[];
  foodlabRatings: FoodLabRating[];
  memberDietary: MemberDietaryMap;
  foodlabLastSynced: string | null;
}

export interface FoodLabActions {
  setFoodlabRecipes: (recipes: FoodLabRecipe[]) => void;
  addFoodlabRating: (rating: FoodLabRating) => void;
  setMemberDietary: (
    memberId: string,
    restrictions: DietaryRestrictions,
  ) => void;
  setFoodlabLastSynced: (date: string) => void;
  importFoodlabToMeals: (recipe: FoodLabRecipe, memberId: string) => void;
  getRecipeVersionForMember: (
    recipe: FoodLabRecipe,
    memberId: string,
  ) => "veg" | "meat";
}

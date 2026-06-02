export type MemberRole = "adult" | "child";

export interface FamilyMember {
  id: string;
  name: string;
  role: MemberRole;
  email?: string;
  colorIndex: number; // 1-6, maps to member-1 through member-6
  avatar?: string;
  isCurrentUser?: boolean; // true for the person doing onboarding
  inviteStatus?: "pending" | "accepted"; // for other adults
  dietaryRestrictions?: import("./foodlab").DietaryRestrictions;
}

export interface CalendarConnection {
  id: string;
  provider: "google" | "outlook" | "apple" | "homebase";
  email: string;
  connected: boolean;
  memberId: string;
  externalEmail?: string;
  lastSyncedAt?: string;
  syncError?: string;
}

export type Recurrence = "none" | "daily" | "weekly" | "monthly";

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string; // ISO date
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  memberId: string;
  recurrence: Recurrence;
  isTask?: boolean;
  taskId?: string;
  source?: "homebase" | "google" | "outlook";
  allDay?: boolean;
  location?: string;
}

export type TaskStatus = "todo" | "in-progress" | "done";

export interface TaskCategory {
  id: string;
  name: string;
  icon?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  categoryId: string;
  assignedTo: string[]; // member IDs
  deadline?: string; // ISO date
  deadlineTime?: string; // HH:mm
  recurrence: Recurrence;
  status: TaskStatus;
  createdAt: string;
}

export interface Recipe {
  id: string;
  title: string;
  description?: string;
  prepTime?: number; // minutes
  cookTime?: number; // minutes
  servings?: number;
  ingredients: RecipeIngredient[];
  steps: string[];
  imageUrl?: string;
  tags: string[];
  sourceUrl?: string;
}

export interface RecipeIngredient {
  name: string;
  amount: string;
  unit: string;
  category?: string;
}

export type MealType = "breakfast" | "lunch" | "dinner";

export interface MealPlanEntry {
  id: string;
  date: string; // ISO date
  mealType: MealType;
  recipeId: string;
}

export interface ShoppingListItem {
  id: string;
  name: string;
  amount: string;
  unit: string;
  category: string;
  checked: boolean;
}

export interface BankAccount {
  id: string;
  name: string;
  institution: string;
  balance: number;
  isFeatured: boolean;
  savingsGoal?: number;
  monthlyBalances: { month: string; balance: number }[];
}

export interface Transaction {
  id: string;
  accountId: string;
  description: string;
  amount: number;
  date: string;
  category: string;
}

export interface Budget {
  category: string;
  monthlyLimit: number;
}

export interface FamilyData {
  familyId: string | null; // Database family ID (set after onboarding)
  familyName: string;
  members: FamilyMember[];
  currentUserId: string | null; // ID of the member doing onboarding
  calendarConnections: CalendarConnection[];
  events: CalendarEvent[];
  taskCategories: TaskCategory[];
  tasks: Task[];
  recipes: Recipe[];
  mealPlan: MealPlanEntry[];
  shoppingList: ShoppingListItem[];
  bankAccounts: BankAccount[];
  transactions: Transaction[];
  budgets: Budget[];
  onboardingComplete: boolean;
  onboardingStep: number;
  // FoodLab state (recipes are a client-side cache; ratings + dietary persist)
  foodlabRecipes: import("./foodlab").FoodLabRecipe[];
  foodlabRatings: import("./foodlab").FoodLabRating[];
  memberDietary: import("./foodlab").MemberDietaryMap;
  foodlabLastSynced: string | null;
}

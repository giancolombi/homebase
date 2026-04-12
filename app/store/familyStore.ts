import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  FamilyData,
  FamilyMember,
  CalendarConnection,
  CalendarEvent,
  Task,
  TaskCategory,
  Recipe,
  MealPlanEntry,
  ShoppingListItem,
  BankAccount,
  Transaction,
} from "@/types/family";
import type {
  FoodLabRecipe,
  FoodLabRating,
  DietaryRestrictions,
  MemberDietaryMap,
} from "@/types/foodlab";
import { DEFAULT_DIETARY_RESTRICTIONS } from "@/types/foodlab";
import { foodlabToHomebaseRecipe } from "@/lib/foodlabParser";
import { mockBankAccounts, mockTransactions } from "@/data/mockFinance";

const initialState: FamilyData = {
  familyId: null,
  familyName: "",
  members: [],
  currentUserId: null,
  calendarConnections: [],
  events: [],
  taskCategories: [
    { id: "cat-1", name: "Home" },
    { id: "cat-2", name: "School" },
    { id: "cat-3", name: "Work" },
    { id: "cat-4", name: "Health" },
    { id: "cat-5", name: "Errands" },
  ],
  tasks: [],
  recipes: [],
  mealPlan: [],
  shoppingList: [],
  bankAccounts: mockBankAccounts,
  transactions: mockTransactions,
  onboardingComplete: false,
  // FoodLab state
  foodlabRecipes: [] as FoodLabRecipe[],
  foodlabRatings: [] as FoodLabRating[],
  memberDietary: {} as MemberDietaryMap,
  foodlabLastSynced: null as string | null,
};

interface FamilyStore extends FamilyData {
  setFamilyId: (id: string) => void;
  setFamilyName: (name: string) => void;
  setCurrentUserId: (id: string) => void;
  addMember: (member: FamilyMember) => void;
  removeMember: (id: string) => void;
  updateMember: (id: string, updates: Partial<FamilyMember>) => void;
  addCalendarConnection: (conn: CalendarConnection) => void;
  toggleCalendarConnection: (id: string) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;

  addEvent: (event: CalendarEvent) => void;
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;

  addTaskCategory: (cat: TaskCategory) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;

  addRecipe: (recipe: Recipe) => void;
  updateRecipe: (id: string, updates: Partial<Recipe>) => void;
  deleteRecipe: (id: string) => void;

  addMealPlanEntry: (entry: MealPlanEntry) => void;
  removeMealPlanEntry: (id: string) => void;

  updateShoppingList: (items: ShoppingListItem[]) => void;
  toggleShoppingItem: (id: string) => void;

  updateBankAccount: (id: string, updates: Partial<BankAccount>) => void;
  addBankAccount: (account: BankAccount) => void;
  removeBankAccount: (id: string) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;

  // FoodLab
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

  // Helpers
  getCurrentUser: () => FamilyMember | undefined;
  getChildMembers: () => FamilyMember[];
}

export const useFamilyStore = create<FamilyStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setFamilyId: (id) => set({ familyId: id }),
      setFamilyName: (name) => set({ familyName: name }),
      setCurrentUserId: (id) => set({ currentUserId: id }),

      addMember: (member) =>
        set((s) => {
          const newMembers = [...s.members, member];
          // Auto-create a Homebase-managed calendar for children
          if (member.role === "child") {
            const homebaseCal: CalendarConnection = {
              id: `hb-${member.id}`,
              provider: "homebase",
              email: "",
              connected: true,
              memberId: member.id,
            };
            return {
              members: newMembers,
              calendarConnections: [...s.calendarConnections, homebaseCal],
            };
          }
          return { members: newMembers };
        }),

      removeMember: (id) =>
        set((s) => ({ members: s.members.filter((m) => m.id !== id) })),

      updateMember: (id, updates) =>
        set((s) => ({
          members: s.members.map((m) =>
            m.id === id ? { ...m, ...updates } : m,
          ),
        })),

      addCalendarConnection: (conn) =>
        set((s) => ({ calendarConnections: [...s.calendarConnections, conn] })),

      toggleCalendarConnection: (id) =>
        set((s) => ({
          calendarConnections: s.calendarConnections.map((c) =>
            c.id === id ? { ...c, connected: !c.connected } : c,
          ),
        })),

      completeOnboarding: () => set({ onboardingComplete: true }),
      resetOnboarding: () =>
        set({ ...initialState, onboardingComplete: false }),

      addEvent: (event) => set((s) => ({ events: [...s.events, event] })),

      updateEvent: (id, updates) =>
        set((s) => ({
          events: s.events.map((e) => (e.id === id ? { ...e, ...updates } : e)),
        })),

      deleteEvent: (id) =>
        set((s) => ({ events: s.events.filter((e) => e.id !== id) })),

      addTaskCategory: (cat) =>
        set((s) => ({ taskCategories: [...s.taskCategories, cat] })),

      addTask: (task) => set((s) => ({ tasks: [...s.tasks, task] })),

      updateTask: (id, updates) =>
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        })),

      deleteTask: (id) =>
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

      addRecipe: (recipe) => set((s) => ({ recipes: [...s.recipes, recipe] })),

      updateRecipe: (id, updates) =>
        set((s) => ({
          recipes: s.recipes.map((r) =>
            r.id === id ? { ...r, ...updates } : r,
          ),
        })),

      deleteRecipe: (id) =>
        set((s) => ({ recipes: s.recipes.filter((r) => r.id !== id) })),

      addMealPlanEntry: (entry) =>
        set((s) => ({ mealPlan: [...s.mealPlan, entry] })),

      removeMealPlanEntry: (id) =>
        set((s) => ({ mealPlan: s.mealPlan.filter((e) => e.id !== id) })),

      updateShoppingList: (items) => set({ shoppingList: items }),

      toggleShoppingItem: (id) =>
        set((s) => ({
          shoppingList: s.shoppingList.map((i) =>
            i.id === id ? { ...i, checked: !i.checked } : i,
          ),
        })),

      updateBankAccount: (id, updates) =>
        set((s) => ({
          bankAccounts: s.bankAccounts.map((a) =>
            a.id === id ? { ...a, ...updates } : a,
          ),
        })),

      addBankAccount: (account) =>
        set((s) => ({ bankAccounts: [...s.bankAccounts, account] })),

      removeBankAccount: (id) =>
        set((s) => ({
          bankAccounts: s.bankAccounts.filter((a) => a.id !== id),
        })),

      updateTransaction: (id, updates) =>
        set((s) => ({
          transactions: s.transactions.map((t) =>
            t.id === id ? { ...t, ...updates } : t,
          ),
        })),

      // FoodLab actions
      setFoodlabRecipes: (recipes) => set({ foodlabRecipes: recipes }),

      addFoodlabRating: (rating) =>
        set((s) => ({ foodlabRatings: [...s.foodlabRatings, rating] })),

      setMemberDietary: (memberId, restrictions) =>
        set((s) => ({
          memberDietary: { ...s.memberDietary, [memberId]: restrictions },
        })),

      setFoodlabLastSynced: (date) => set({ foodlabLastSynced: date }),

      importFoodlabToMeals: (recipe, memberId) => {
        const state = get();
        const version = state.getRecipeVersionForMember(recipe, memberId);
        const homebaseRecipe = foodlabToHomebaseRecipe(recipe, version);
        // Only add if not already imported
        const exists = state.recipes.some((r) => r.id === homebaseRecipe.id);
        if (!exists) {
          set((s) => ({ recipes: [...s.recipes, homebaseRecipe] }));
        }
      },

      getRecipeVersionForMember: (recipe, memberId) => {
        const state = get();
        const restrictions =
          state.memberDietary[memberId] || DEFAULT_DIETARY_RESTRICTIONS;
        // If member is vegetarian (noMeat), use veg version
        if (restrictions.noMeat) return "veg";
        // Otherwise use meat version
        return "meat";
      },

      getCurrentUser: () => {
        const state = get();
        return state.members.find((m) => m.id === state.currentUserId);
      },

      getChildMembers: () => {
        return get().members.filter((m) => m.role === "child");
      },
    }),
    { name: "homebase-family-data" },
  ),
);

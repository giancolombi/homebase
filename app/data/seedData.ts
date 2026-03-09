/**
 * Sample data that populates every page of the app.
 *
 * This seeds the Zustand store (persisted to localStorage) so designers and
 * PMs can see realistic content without needing a database or backend.
 *
 * Usage:
 *   pnpm seed        — writes the data to localStorage via a Node script
 *   In the app       — a "Load sample data" button appears on the auth page
 */

import type {
  FamilyMember,
  CalendarConnection,
  CalendarEvent,
  TaskCategory,
  Task,
  Recipe,
  MealPlanEntry,
  ShoppingListItem,
  BankAccount,
  Transaction,
} from "@/types/family";
import { mockBankAccounts, mockTransactions } from "./mockFinance";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const today = new Date();
const yyyy = today.getFullYear();
const mm = String(today.getMonth() + 1).padStart(2, "0");
const dd = String(today.getDate()).padStart(2, "0");
const isoToday = `${yyyy}-${mm}-${dd}`;

function offsetDate(days: number): string {
  const d = new Date(today);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

// ---------------------------------------------------------------------------
// Family Members
// ---------------------------------------------------------------------------

export const seedMembers: FamilyMember[] = [
  {
    id: "m-1",
    name: "Alex Johnson",
    role: "adult",
    email: "alex@example.com",
    colorIndex: 1,
    isCurrentUser: true,
  },
  {
    id: "m-2",
    name: "Jordan Johnson",
    role: "adult",
    email: "jordan@example.com",
    colorIndex: 2,
    inviteStatus: "accepted",
  },
  {
    id: "m-3",
    name: "Emma Johnson",
    role: "child",
    colorIndex: 3,
  },
  {
    id: "m-4",
    name: "Liam Johnson",
    role: "child",
    colorIndex: 4,
  },
];

// ---------------------------------------------------------------------------
// Calendar Connections
// ---------------------------------------------------------------------------

export const seedCalendarConnections: CalendarConnection[] = [
  {
    id: "cc-1",
    provider: "google",
    email: "alex@example.com",
    connected: true,
    memberId: "m-1",
  },
  {
    id: "cc-2",
    provider: "outlook",
    email: "jordan@example.com",
    connected: true,
    memberId: "m-2",
  },
  {
    id: "hb-m-3",
    provider: "homebase",
    email: "",
    connected: true,
    memberId: "m-3",
  },
  {
    id: "hb-m-4",
    provider: "homebase",
    email: "",
    connected: true,
    memberId: "m-4",
  },
];

// ---------------------------------------------------------------------------
// Calendar Events (spread around today)
// ---------------------------------------------------------------------------

export const seedEvents: CalendarEvent[] = [
  {
    id: "ev-1",
    title: "Team standup",
    date: isoToday,
    startTime: "09:00",
    endTime: "09:30",
    memberId: "m-1",
    recurrence: "daily",
  },
  {
    id: "ev-2",
    title: "Dentist appointment",
    date: isoToday,
    startTime: "10:00",
    endTime: "11:00",
    memberId: "m-3",
    recurrence: "none",
  },
  {
    id: "ev-3",
    title: "Yoga class",
    date: isoToday,
    startTime: "07:00",
    endTime: "08:00",
    memberId: "m-2",
    recurrence: "weekly",
  },
  {
    id: "ev-4",
    title: "Soccer practice",
    date: isoToday,
    startTime: "16:00",
    endTime: "17:30",
    memberId: "m-4",
    recurrence: "weekly",
  },
  {
    id: "ev-5",
    title: "Grocery run",
    date: offsetDate(1),
    startTime: "11:00",
    endTime: "12:00",
    memberId: "m-1",
    recurrence: "none",
  },
  {
    id: "ev-6",
    title: "Piano lesson",
    date: offsetDate(1),
    startTime: "15:00",
    endTime: "16:00",
    memberId: "m-3",
    recurrence: "weekly",
  },
  {
    id: "ev-7",
    title: "Date night",
    date: offsetDate(2),
    startTime: "19:00",
    endTime: "22:00",
    memberId: "m-1",
    recurrence: "none",
  },
  {
    id: "ev-8",
    title: "Client meeting",
    date: offsetDate(2),
    startTime: "14:00",
    endTime: "15:00",
    memberId: "m-2",
    recurrence: "none",
  },
  {
    id: "ev-9",
    title: "School play rehearsal",
    date: offsetDate(3),
    startTime: "13:00",
    endTime: "15:00",
    memberId: "m-3",
    recurrence: "none",
  },
  {
    id: "ev-10",
    title: "Swimming lesson",
    date: offsetDate(4),
    startTime: "10:00",
    endTime: "11:00",
    memberId: "m-4",
    recurrence: "weekly",
  },
];

// ---------------------------------------------------------------------------
// Task Categories & Tasks
// ---------------------------------------------------------------------------

export const seedTaskCategories: TaskCategory[] = [
  { id: "cat-1", name: "Home" },
  { id: "cat-2", name: "School" },
  { id: "cat-3", name: "Work" },
  { id: "cat-4", name: "Health" },
  { id: "cat-5", name: "Errands" },
];

export const seedTasks: Task[] = [
  {
    id: "t-1",
    title: "Clean out garage",
    categoryId: "cat-1",
    assignedTo: ["m-1", "m-2"],
    deadline: offsetDate(3),
    recurrence: "none",
    status: "todo",
    createdAt: offsetDate(-2),
  },
  {
    id: "t-2",
    title: "Mow the lawn",
    categoryId: "cat-1",
    assignedTo: ["m-1"],
    deadline: offsetDate(1),
    recurrence: "weekly",
    status: "todo",
    createdAt: offsetDate(-5),
  },
  {
    id: "t-3",
    title: "Science fair project",
    categoryId: "cat-2",
    assignedTo: ["m-3"],
    deadline: offsetDate(7),
    recurrence: "none",
    status: "in-progress",
    createdAt: offsetDate(-3),
  },
  {
    id: "t-4",
    title: "Book pediatrician checkup",
    categoryId: "cat-4",
    assignedTo: ["m-2"],
    deadline: offsetDate(5),
    recurrence: "none",
    status: "todo",
    createdAt: offsetDate(-1),
  },
  {
    id: "t-5",
    title: "Submit quarterly report",
    categoryId: "cat-3",
    assignedTo: ["m-1"],
    deadline: offsetDate(2),
    deadlineTime: "17:00",
    recurrence: "none",
    status: "in-progress",
    createdAt: offsetDate(-4),
  },
  {
    id: "t-6",
    title: "Pick up dry cleaning",
    categoryId: "cat-5",
    assignedTo: ["m-2"],
    deadline: isoToday,
    recurrence: "none",
    status: "todo",
    createdAt: offsetDate(-1),
  },
  {
    id: "t-7",
    title: "Pack school lunches",
    categoryId: "cat-2",
    assignedTo: ["m-1", "m-2"],
    recurrence: "daily",
    status: "done",
    createdAt: offsetDate(-7),
  },
  {
    id: "t-8",
    title: "Fix leaky faucet",
    categoryId: "cat-1",
    assignedTo: ["m-1"],
    deadline: offsetDate(10),
    recurrence: "none",
    status: "todo",
    createdAt: offsetDate(-6),
  },
  {
    id: "t-9",
    title: "Renew car insurance",
    categoryId: "cat-5",
    assignedTo: ["m-2"],
    deadline: offsetDate(14),
    recurrence: "none",
    status: "todo",
    createdAt: offsetDate(-2),
  },
  {
    id: "t-10",
    title: "Read 20 minutes",
    categoryId: "cat-2",
    assignedTo: ["m-3", "m-4"],
    recurrence: "daily",
    status: "todo",
    createdAt: offsetDate(-10),
  },
];

// ---------------------------------------------------------------------------
// Recipes
// ---------------------------------------------------------------------------

export const seedRecipes: Recipe[] = [
  {
    id: "r-1",
    title: "Spaghetti Bolognese",
    description: "Classic family pasta with meat sauce",
    prepTime: 15,
    cookTime: 45,
    servings: 6,
    ingredients: [
      { name: "Spaghetti", amount: "500", unit: "g", category: "Pasta" },
      { name: "Ground beef", amount: "500", unit: "g", category: "Meat" },
      { name: "Onion", amount: "1", unit: "large", category: "Produce" },
      { name: "Garlic", amount: "3", unit: "cloves", category: "Produce" },
      {
        name: "Crushed tomatoes",
        amount: "800",
        unit: "ml",
        category: "Canned",
      },
      { name: "Olive oil", amount: "2", unit: "tbsp", category: "Pantry" },
      {
        name: "Parmesan cheese",
        amount: "100",
        unit: "g",
        category: "Dairy",
      },
    ],
    steps: [
      "Cook spaghetti according to package instructions",
      "Saute onion and garlic in olive oil until soft",
      "Brown the ground beef, then add crushed tomatoes",
      "Simmer for 30 minutes, season to taste",
      "Serve sauce over spaghetti with parmesan",
    ],
    tags: ["Italian", "Pasta", "Kid-friendly"],
  },
  {
    id: "r-2",
    title: "Chicken Stir-Fry",
    description: "Quick weeknight dinner with veggies",
    prepTime: 10,
    cookTime: 15,
    servings: 4,
    ingredients: [
      {
        name: "Chicken breast",
        amount: "400",
        unit: "g",
        category: "Meat",
      },
      { name: "Broccoli", amount: "2", unit: "cups", category: "Produce" },
      { name: "Bell pepper", amount: "2", unit: "medium", category: "Produce" },
      { name: "Soy sauce", amount: "3", unit: "tbsp", category: "Pantry" },
      { name: "Sesame oil", amount: "1", unit: "tbsp", category: "Pantry" },
      { name: "Rice", amount: "2", unit: "cups", category: "Grains" },
      { name: "Ginger", amount: "1", unit: "tbsp", category: "Produce" },
    ],
    steps: [
      "Cook rice according to package instructions",
      "Slice chicken and vegetables",
      "Stir-fry chicken in sesame oil until cooked through",
      "Add vegetables, ginger, and soy sauce",
      "Cook 5 more minutes, serve over rice",
    ],
    tags: ["Asian", "Quick", "Healthy"],
  },
  {
    id: "r-3",
    title: "Pancakes",
    description: "Fluffy weekend breakfast pancakes",
    prepTime: 10,
    cookTime: 20,
    servings: 4,
    ingredients: [
      { name: "Flour", amount: "2", unit: "cups", category: "Pantry" },
      { name: "Eggs", amount: "2", unit: "large", category: "Dairy" },
      { name: "Milk", amount: "1.5", unit: "cups", category: "Dairy" },
      { name: "Butter", amount: "3", unit: "tbsp", category: "Dairy" },
      {
        name: "Baking powder",
        amount: "2",
        unit: "tsp",
        category: "Pantry",
      },
      { name: "Maple syrup", amount: "1", unit: "bottle", category: "Pantry" },
    ],
    steps: [
      "Mix dry ingredients together",
      "Whisk eggs, milk, and melted butter",
      "Combine wet and dry ingredients (don't over-mix)",
      "Cook on a buttered griddle until bubbles form, then flip",
      "Serve with maple syrup and fresh fruit",
    ],
    tags: ["Breakfast", "Kid-friendly"],
  },
  {
    id: "r-4",
    title: "Tacos",
    description: "Build-your-own taco night",
    prepTime: 15,
    cookTime: 20,
    servings: 6,
    ingredients: [
      { name: "Ground turkey", amount: "500", unit: "g", category: "Meat" },
      { name: "Taco shells", amount: "12", unit: "shells", category: "Pantry" },
      { name: "Lettuce", amount: "1", unit: "head", category: "Produce" },
      { name: "Tomatoes", amount: "3", unit: "medium", category: "Produce" },
      {
        name: "Cheddar cheese",
        amount: "200",
        unit: "g",
        category: "Dairy",
      },
      { name: "Sour cream", amount: "1", unit: "cup", category: "Dairy" },
      {
        name: "Taco seasoning",
        amount: "1",
        unit: "packet",
        category: "Pantry",
      },
    ],
    steps: [
      "Brown ground turkey and add taco seasoning",
      "Chop lettuce and tomatoes",
      "Grate cheese",
      "Warm taco shells in the oven",
      "Set up toppings and let everyone build their own tacos",
    ],
    tags: ["Mexican", "Kid-friendly", "Fun"],
  },
];

// ---------------------------------------------------------------------------
// Meal Plan (this week)
// ---------------------------------------------------------------------------

export const seedMealPlan: MealPlanEntry[] = [
  { id: "mp-1", date: offsetDate(0), mealType: "dinner", recipeId: "r-1" },
  { id: "mp-2", date: offsetDate(1), mealType: "dinner", recipeId: "r-2" },
  { id: "mp-3", date: offsetDate(2), mealType: "breakfast", recipeId: "r-3" },
  { id: "mp-4", date: offsetDate(3), mealType: "dinner", recipeId: "r-4" },
  { id: "mp-5", date: offsetDate(4), mealType: "dinner", recipeId: "r-1" },
  { id: "mp-6", date: offsetDate(5), mealType: "breakfast", recipeId: "r-3" },
  { id: "mp-7", date: offsetDate(6), mealType: "dinner", recipeId: "r-2" },
];

// ---------------------------------------------------------------------------
// Shopping List
// ---------------------------------------------------------------------------

export const seedShoppingList: ShoppingListItem[] = [
  {
    id: "sl-1",
    name: "Spaghetti",
    amount: "500",
    unit: "g",
    category: "Pasta",
    checked: false,
  },
  {
    id: "sl-2",
    name: "Ground beef",
    amount: "500",
    unit: "g",
    category: "Meat",
    checked: true,
  },
  {
    id: "sl-3",
    name: "Chicken breast",
    amount: "400",
    unit: "g",
    category: "Meat",
    checked: false,
  },
  {
    id: "sl-4",
    name: "Broccoli",
    amount: "2",
    unit: "cups",
    category: "Produce",
    checked: false,
  },
  {
    id: "sl-5",
    name: "Bell peppers",
    amount: "2",
    unit: "medium",
    category: "Produce",
    checked: false,
  },
  {
    id: "sl-6",
    name: "Milk",
    amount: "1.5",
    unit: "cups",
    category: "Dairy",
    checked: true,
  },
  {
    id: "sl-7",
    name: "Eggs",
    amount: "2",
    unit: "large",
    category: "Dairy",
    checked: false,
  },
  {
    id: "sl-8",
    name: "Parmesan cheese",
    amount: "100",
    unit: "g",
    category: "Dairy",
    checked: false,
  },
];

// ---------------------------------------------------------------------------
// Full seed payload — matches the Zustand store shape
// ---------------------------------------------------------------------------

export const seedState = {
  state: {
    familyName: "The Johnsons",
    members: seedMembers,
    currentUserId: "m-1",
    calendarConnections: seedCalendarConnections,
    events: seedEvents,
    taskCategories: seedTaskCategories,
    tasks: seedTasks,
    recipes: seedRecipes,
    mealPlan: seedMealPlan,
    shoppingList: seedShoppingList,
    bankAccounts: mockBankAccounts,
    transactions: mockTransactions,
    onboardingComplete: true,
  },
  version: 0,
};

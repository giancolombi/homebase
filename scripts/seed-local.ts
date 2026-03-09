/**
 * Seed the app with a demo account and sample data for every page.
 *
 * If the API server is running, this creates a real user account and returns
 * a valid JWT so auth works end-to-end. If the API is not running, it falls
 * back to demo mode (no backend needed).
 *
 * Usage:
 *   pnpm seed                    # prints JS to paste into the browser console
 *   pnpm seed | pbcopy           # copies it to clipboard (macOS)
 *
 * Or just click "Load sample data" on the login page — no terminal needed.
 */

const API_URL = process.env.API_URL || "http://localhost:3001";
const DEMO_EMAIL = "alex@example.com";
const DEMO_PASSWORD = "password123";
const DEMO_NAME = "Alex Johnson";

// ---------------------------------------------------------------------------
// Build the Zustand store payload (same data the in-app button uses)
// ---------------------------------------------------------------------------

const today = new Date();

function offsetDate(days: number): string {
  const d = new Date(today);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

const isoToday = offsetDate(0);

const storePayload = {
  state: {
    familyName: "The Johnsons",
    members: [
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
      { id: "m-3", name: "Emma Johnson", role: "child", colorIndex: 3 },
      { id: "m-4", name: "Liam Johnson", role: "child", colorIndex: 4 },
    ],
    currentUserId: "m-1",
    calendarConnections: [
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
    ],
    events: [
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
    ],
    taskCategories: [
      { id: "cat-1", name: "Home" },
      { id: "cat-2", name: "School" },
      { id: "cat-3", name: "Work" },
      { id: "cat-4", name: "Health" },
      { id: "cat-5", name: "Errands" },
    ],
    tasks: [
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
    ],
    recipes: [
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
          {
            name: "Garlic",
            amount: "3",
            unit: "cloves",
            category: "Produce",
          },
          {
            name: "Crushed tomatoes",
            amount: "800",
            unit: "ml",
            category: "Canned",
          },
          {
            name: "Olive oil",
            amount: "2",
            unit: "tbsp",
            category: "Pantry",
          },
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
          {
            name: "Broccoli",
            amount: "2",
            unit: "cups",
            category: "Produce",
          },
          {
            name: "Bell pepper",
            amount: "2",
            unit: "medium",
            category: "Produce",
          },
          {
            name: "Soy sauce",
            amount: "3",
            unit: "tbsp",
            category: "Pantry",
          },
          {
            name: "Sesame oil",
            amount: "1",
            unit: "tbsp",
            category: "Pantry",
          },
          { name: "Rice", amount: "2", unit: "cups", category: "Grains" },
          {
            name: "Ginger",
            amount: "1",
            unit: "tbsp",
            category: "Produce",
          },
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
          {
            name: "Maple syrup",
            amount: "1",
            unit: "bottle",
            category: "Pantry",
          },
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
          {
            name: "Ground turkey",
            amount: "500",
            unit: "g",
            category: "Meat",
          },
          {
            name: "Taco shells",
            amount: "12",
            unit: "shells",
            category: "Pantry",
          },
          {
            name: "Lettuce",
            amount: "1",
            unit: "head",
            category: "Produce",
          },
          {
            name: "Tomatoes",
            amount: "3",
            unit: "medium",
            category: "Produce",
          },
          {
            name: "Cheddar cheese",
            amount: "200",
            unit: "g",
            category: "Dairy",
          },
          {
            name: "Sour cream",
            amount: "1",
            unit: "cup",
            category: "Dairy",
          },
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
    ],
    mealPlan: [
      {
        id: "mp-1",
        date: offsetDate(0),
        mealType: "dinner",
        recipeId: "r-1",
      },
      {
        id: "mp-2",
        date: offsetDate(1),
        mealType: "dinner",
        recipeId: "r-2",
      },
      {
        id: "mp-3",
        date: offsetDate(2),
        mealType: "breakfast",
        recipeId: "r-3",
      },
      {
        id: "mp-4",
        date: offsetDate(3),
        mealType: "dinner",
        recipeId: "r-4",
      },
      {
        id: "mp-5",
        date: offsetDate(4),
        mealType: "dinner",
        recipeId: "r-1",
      },
      {
        id: "mp-6",
        date: offsetDate(5),
        mealType: "breakfast",
        recipeId: "r-3",
      },
      {
        id: "mp-7",
        date: offsetDate(6),
        mealType: "dinner",
        recipeId: "r-2",
      },
    ],
    shoppingList: [
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
    ],
    bankAccounts: [
      {
        id: "acc-1",
        name: "Joint Checking",
        institution: "Chase",
        balance: 8450.32,
        isFeatured: true,
        monthlyBalances: [
          { month: "2025-10", balance: 7200 },
          { month: "2025-11", balance: 7800 },
          { month: "2025-12", balance: 8100 },
          { month: "2026-01", balance: 7900 },
          { month: "2026-02", balance: 8200 },
          { month: "2026-03", balance: 8450 },
        ],
      },
      {
        id: "acc-2",
        name: "Emergency Fund",
        institution: "Marcus",
        balance: 15230.0,
        isFeatured: true,
        savingsGoal: 25000,
        monthlyBalances: [
          { month: "2025-10", balance: 12000 },
          { month: "2025-11", balance: 12800 },
          { month: "2025-12", balance: 13500 },
          { month: "2026-01", balance: 14100 },
          { month: "2026-02", balance: 14700 },
          { month: "2026-03", balance: 15230 },
        ],
      },
      {
        id: "acc-3",
        name: "Kids College",
        institution: "Vanguard",
        balance: 42100.0,
        isFeatured: false,
        savingsGoal: 100000,
        monthlyBalances: [
          { month: "2025-10", balance: 39500 },
          { month: "2025-11", balance: 40200 },
          { month: "2025-12", balance: 40800 },
          { month: "2026-01", balance: 41200 },
          { month: "2026-02", balance: 41700 },
          { month: "2026-03", balance: 42100 },
        ],
      },
    ],
    transactions: [
      {
        id: "tx-1",
        accountId: "acc-1",
        description: "Whole Foods",
        amount: -145.32,
        date: "2026-03-07",
        category: "Groceries",
      },
      {
        id: "tx-2",
        accountId: "acc-1",
        description: "Shell Gas",
        amount: -52.0,
        date: "2026-03-06",
        category: "Transportation",
      },
      {
        id: "tx-3",
        accountId: "acc-1",
        description: "Netflix",
        amount: -15.99,
        date: "2026-03-05",
        category: "Entertainment",
      },
      {
        id: "tx-4",
        accountId: "acc-1",
        description: "Salary Deposit",
        amount: 4200.0,
        date: "2026-03-01",
        category: "Income",
      },
      {
        id: "tx-5",
        accountId: "acc-1",
        description: "Mortgage",
        amount: -2100.0,
        date: "2026-03-01",
        category: "Housing",
      },
      {
        id: "tx-6",
        accountId: "acc-1",
        description: "Pediatrician",
        amount: -75.0,
        date: "2026-03-04",
        category: "Healthcare",
      },
      {
        id: "tx-7",
        accountId: "acc-1",
        description: "Target",
        amount: -89.45,
        date: "2026-03-03",
        category: "Shopping",
      },
      {
        id: "tx-8",
        accountId: "acc-1",
        description: "Electric Bill",
        amount: -125.0,
        date: "2026-03-02",
        category: "Utilities",
      },
      {
        id: "tx-9",
        accountId: "acc-1",
        description: "Starbucks",
        amount: -12.5,
        date: "2026-03-07",
        category: "Dining",
      },
      {
        id: "tx-10",
        accountId: "acc-1",
        description: "Amazon",
        amount: -67.89,
        date: "2026-03-06",
        category: "Shopping",
      },
      {
        id: "tx-11",
        accountId: "acc-1",
        description: "Gym Membership",
        amount: -49.99,
        date: "2026-03-01",
        category: "Health & Fitness",
      },
      {
        id: "tx-12",
        accountId: "acc-1",
        description: "Daycare",
        amount: -850.0,
        date: "2026-03-01",
        category: "Childcare",
      },
    ],
    onboardingComplete: true,
  },
  version: 0,
};

// ---------------------------------------------------------------------------
// Try to create a real account via the API, fall back to demo-token
// ---------------------------------------------------------------------------

async function tryCreateAccount(): Promise<string> {
  try {
    // Try sign up first
    let res = await fetch(`${API_URL}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        full_name: DEMO_NAME,
      }),
    });

    // If account already exists, sign in instead
    if (res.status === 409) {
      res = await fetch(`${API_URL}/api/auth/signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD }),
      });
    }

    if (res.ok) {
      const data = await res.json();
      return data.token;
    }
  } catch {
    // API not reachable — that's fine
  }
  return "demo-token";
}

async function main() {
  const token = await tryCreateAccount();
  const isReal = token !== "demo-token";

  const storeJson = JSON.stringify(storePayload);
  const tokenJson = JSON.stringify(token);

  // Output a JS snippet to paste into the browser console
  console.log(
    `localStorage.setItem("homebase-family-data", '${storeJson}'); localStorage.setItem("homebase-auth-token", ${tokenJson}); location.reload();`,
  );

  console.error("");
  if (isReal) {
    console.error(`Account created: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  } else {
    console.error("API not running — using demo mode (no backend needed).");
  }
  console.error("");
  console.error("Paste the output above into the browser console (F12),");
  console.error("or pipe to clipboard:  pnpm seed 2>/dev/null | pbcopy");
  console.error("");
}

main();

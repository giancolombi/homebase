// Backend sync layer. The Zustand store is the in-memory source of truth;
// these helpers hydrate the store from the backend on load and mirror local
// mutations to the backend as fire-and-forget side effects.

import { tasks, meals, finance, family, calendar } from "./api";
import type {
  FamilyData,
  FamilyMember,
  CalendarConnection,
  CalendarEvent,
  MemberRole,
  Task,
  Recipe,
  MealPlanEntry,
  ShoppingListItem,
  BankAccount,
  Transaction,
} from "@/types/family";

// How far back / forward to hydrate Homebase calendar events on load.
const EVENT_WINDOW_DAYS_BACK = 180;
const EVENT_WINDOW_DAYS_FORWARD = 365;

function isoDateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

type StorePatch = Partial<FamilyData>;
type ApplyFn = (patch: StorePatch) => void;

/**
 * Pull every backend-backed domain for this family and apply to the store.
 * Called once after auth resolves with a familyId. Errors are logged but
 * don't surface — if sync is down, users still see whatever is persisted in
 * localStorage.
 *
 * `currentUserEmail` is used to identify which DB family_member row is the
 * current user (their member.email matches the auth user's email). Without
 * it, currentUserId stays whatever localStorage had — empty on a fresh
 * browser, which makes Settings/Calendar look blank.
 */
export async function pullAllData(
  familyId: string,
  apply: ApplyFn,
  currentUserEmail?: string | null,
): Promise<void> {
  try {
    const [
      memberList,
      taskList,
      categoryList,
      recipeList,
      planList,
      shoppingList,
      accountList,
      transactionList,
      eventList,
    ] = await Promise.all([
      family.getMembers(familyId).catch(() => null),
      tasks.list(familyId).catch(() => null),
      tasks.listCategories(familyId).catch(() => null),
      meals.listRecipes(familyId).catch(() => null),
      meals.listPlan(familyId).catch(() => null),
      meals.listShopping(familyId).catch(() => null),
      finance.listAccounts(familyId).catch(() => null),
      finance.listTransactions(familyId).catch(() => null),
      calendar
        .getEvents(
          familyId,
          isoDateOffset(-EVENT_WINDOW_DAYS_BACK),
          isoDateOffset(EVENT_WINDOW_DAYS_FORWARD),
        )
        .catch(() => null),
    ]);

    const patch: StorePatch = {};

    if (memberList) {
      const members: FamilyMember[] = memberList.map((m) => ({
        id: m.id,
        name: m.name,
        role: (m.role as MemberRole) ?? "adult",
        email: m.email ?? undefined,
        colorIndex: m.colorIndex ?? 0,
        isCurrentUser: false,
        inviteStatus:
          (m.inviteStatus as "pending" | "accepted" | undefined) ?? undefined,
      }));

      // Find current user by email match (the only stable cross-device key).
      let currentUserId: string | null = null;
      if (currentUserEmail) {
        const me = members.find(
          (m) => m.email?.toLowerCase() === currentUserEmail.toLowerCase(),
        );
        if (me) {
          me.isCurrentUser = true;
          currentUserId = me.id;
        }
      }

      // Children get a Homebase-managed pseudo-connection (matches
      // familyStore.addMember). Without this, the calendar UI's "Children's
      // calendars" section won't render the green Homebase badge.
      const calendarConnections: CalendarConnection[] = members
        .filter((m) => m.role === "child")
        .map((m) => ({
          id: `hb-${m.id}`,
          provider: "homebase",
          email: "",
          connected: true,
          memberId: m.id,
        }));

      patch.members = members;
      if (currentUserId) patch.currentUserId = currentUserId;
      patch.calendarConnections = calendarConnections;
    }
    if (taskList) {
      patch.tasks = taskList.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description ?? undefined,
        categoryId: t.categoryId ?? "",
        assignedTo: t.assignedTo,
        deadline: t.deadline ?? undefined,
        deadlineTime: t.deadlineTime ?? undefined,
        recurrence: t.recurrence,
        status: t.status,
        createdAt: t.createdAt,
      }));
    }
    if (categoryList) {
      patch.taskCategories = categoryList.map((c) => ({
        id: c.id,
        name: c.name,
        icon: c.icon ?? undefined,
      }));
    }
    if (recipeList) {
      patch.recipes = recipeList.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description ?? undefined,
        prepTime: r.prepTime ?? undefined,
        cookTime: r.cookTime ?? undefined,
        servings: r.servings ?? undefined,
        ingredients: (r.ingredients ?? []) as Recipe["ingredients"],
        steps: r.steps ?? [],
        imageUrl: r.imageUrl ?? undefined,
        tags: r.tags ?? [],
        sourceUrl: r.sourceUrl ?? undefined,
      }));
    }
    if (planList) {
      patch.mealPlan = planList.map((p) => ({
        id: p.id,
        date: p.date,
        mealType: p.mealType,
        recipeId: p.recipeId,
      }));
    }
    if (shoppingList) {
      patch.shoppingList = shoppingList.map((i) => ({
        id: i.id,
        name: i.name,
        amount: i.amount,
        unit: i.unit,
        category: i.category,
        checked: i.checked,
      }));
    }
    if (accountList) {
      patch.bankAccounts = accountList.map((a) => ({
        id: a.id,
        name: a.name,
        institution: a.institution,
        balance: a.balance,
        isFeatured: a.isFeatured,
        savingsGoal: a.savingsGoal,
        monthlyBalances: a.monthlyBalances ?? [],
      }));
    }
    if (transactionList) {
      patch.transactions = transactionList.map((t) => ({
        id: t.id,
        accountId: t.accountId,
        description: t.description,
        amount: t.amount,
        date: t.date,
        category: t.category,
      }));
    }
    if (eventList) {
      // Only Homebase (family-owned) events live in the store. External
      // provider events (google/outlook/eventkit) are merged separately in
      // the calendar view straight from the API, so excluding them here keeps
      // each event from appearing twice.
      patch.events = eventList
        .filter((e) => e.source === "homebase")
        .map((e) => ({
          id: e.id,
          title: e.title,
          description: e.description ?? undefined,
          date: e.date,
          startTime: e.startTime,
          endTime: e.endTime,
          memberId: e.memberId,
          recurrence: e.recurrence as CalendarEvent["recurrence"],
        }));
    }

    apply(patch);
  } catch (err) {
    console.warn("Initial sync failed; continuing with local state:", err);
  }
}

// ---- Fire-and-forget push helpers ----
//
// The store has already updated the UI optimistically; we swallow errors
// with a console.warn so a transient network hiccup doesn't break the
// interaction. Mutations against a null familyId (pre-onboarding) are skipped.

function shouldSync(familyId: string | null | undefined): familyId is string {
  return !!familyId;
}

function ignore(err: unknown, label: string) {
  console.warn(`Sync ${label} failed:`, err);
}

export const push = {
  member: {
    update: (
      familyId: string | null,
      id: string,
      updates: Partial<FamilyMember>,
    ) => {
      if (!shouldSync(familyId)) return;
      // Only forward server-backed fields (avatar lives in localStorage only).
      const serverUpdates: {
        name?: string;
        email?: string | null;
        colorIndex?: number;
      } = {};
      if (updates.name !== undefined) serverUpdates.name = updates.name;
      if (updates.email !== undefined)
        serverUpdates.email = updates.email ?? null;
      if (updates.colorIndex !== undefined)
        serverUpdates.colorIndex = updates.colorIndex;
      if (Object.keys(serverUpdates).length === 0) return;
      family
        .updateMember(familyId, id, serverUpdates)
        .catch((e) => ignore(e, "member.update"));
    },
    remove: (id: string) => {
      family.removeMember(id).catch((e) => ignore(e, "member.remove"));
    },
  },
  event: {
    create: (familyId: string | null, event: CalendarEvent) => {
      if (!shouldSync(familyId)) return;
      // Skip task-derived and external pseudo-events — only real Homebase
      // events are persisted here.
      if (event.isTask || (event.source && event.source !== "homebase")) return;
      calendar
        .createEvent(familyId, {
          id: event.id,
          memberId: event.memberId,
          title: event.title,
          description: event.description ?? null,
          date: event.date,
          startTime: event.startTime,
          endTime: event.endTime,
          recurrence: event.recurrence ?? "none",
        })
        .catch((e) => ignore(e, "event.create"));
    },
    update: (
      familyId: string | null,
      id: string,
      updates: Partial<CalendarEvent>,
    ) => {
      if (!shouldSync(familyId)) return;
      calendar
        .updateEvent(familyId, id, {
          memberId: updates.memberId,
          title: updates.title,
          description: updates.description ?? undefined,
          date: updates.date,
          startTime: updates.startTime,
          endTime: updates.endTime,
          recurrence: updates.recurrence,
        })
        .catch((e) => ignore(e, "event.update"));
    },
    remove: (familyId: string | null, id: string) => {
      if (!shouldSync(familyId)) return;
      calendar
        .deleteEvent(familyId, id)
        .catch((e) => ignore(e, "event.remove"));
    },
  },
  task: {
    create: (familyId: string | null, task: Task) => {
      if (!shouldSync(familyId)) return;
      tasks
        .create(familyId, {
          title: task.title,
          description: task.description ?? null,
          categoryId: task.categoryId || null,
          deadline: task.deadline ?? null,
          deadlineTime: task.deadlineTime ?? null,
          recurrence: task.recurrence ?? "none",
          status: task.status ?? "todo",
          assignedTo: task.assignedTo ?? [],
        })
        .catch((e) => ignore(e, "task.create"));
    },
    update: (familyId: string | null, id: string, updates: Partial<Task>) => {
      if (!shouldSync(familyId)) return;
      tasks
        .update(familyId, id, {
          ...updates,
          categoryId: updates.categoryId ?? undefined,
        })
        .catch((e) => ignore(e, "task.update"));
    },
    remove: (familyId: string | null, id: string) => {
      if (!shouldSync(familyId)) return;
      tasks.remove(familyId, id).catch((e) => ignore(e, "task.remove"));
    },
    createCategory: (familyId: string | null, name: string, icon?: string) => {
      if (!shouldSync(familyId)) return;
      tasks
        .createCategory(familyId, name, icon)
        .catch((e) => ignore(e, "task.createCategory"));
    },
  },
  recipe: {
    create: (familyId: string | null, r: Recipe) => {
      if (!shouldSync(familyId)) return;
      meals
        .createRecipe(familyId, {
          title: r.title,
          description: r.description ?? null,
          prepTime: r.prepTime ?? null,
          cookTime: r.cookTime ?? null,
          servings: r.servings ?? null,
          imageUrl: r.imageUrl ?? null,
          sourceUrl: r.sourceUrl ?? null,
          tags: r.tags ?? [],
          ingredients: r.ingredients ?? [],
          steps: r.steps ?? [],
        })
        .catch((e) => ignore(e, "recipe.create"));
    },
    update: (familyId: string | null, id: string, updates: Partial<Recipe>) => {
      if (!shouldSync(familyId)) return;
      meals
        .updateRecipe(familyId, id, updates)
        .catch((e) => ignore(e, "recipe.update"));
    },
    remove: (familyId: string | null, id: string) => {
      if (!shouldSync(familyId)) return;
      meals.removeRecipe(familyId, id).catch((e) => ignore(e, "recipe.remove"));
    },
  },
  mealPlan: {
    add: (familyId: string | null, entry: MealPlanEntry) => {
      if (!shouldSync(familyId)) return;
      meals
        .addPlanEntry(familyId, {
          recipeId: entry.recipeId,
          date: entry.date,
          mealType: entry.mealType,
        })
        .catch((e) => ignore(e, "mealPlan.add"));
    },
    remove: (familyId: string | null, id: string) => {
      if (!shouldSync(familyId)) return;
      meals
        .removePlanEntry(familyId, id)
        .catch((e) => ignore(e, "mealPlan.remove"));
    },
  },
  shopping: {
    replace: (familyId: string | null, items: ShoppingListItem[]) => {
      if (!shouldSync(familyId)) return;
      meals
        .replaceShopping(
          familyId,
          items.map((i) => ({
            name: i.name,
            amount: i.amount,
            unit: i.unit,
            category: i.category,
            checked: i.checked,
          })),
        )
        .catch((e) => ignore(e, "shopping.replace"));
    },
    toggle: (familyId: string | null, id: string, checked: boolean) => {
      if (!shouldSync(familyId)) return;
      meals
        .toggleShopping(familyId, id, checked)
        .catch((e) => ignore(e, "shopping.toggle"));
    },
  },
  bankAccount: {
    create: (familyId: string | null, a: BankAccount) => {
      if (!shouldSync(familyId)) return;
      finance
        .createAccount(familyId, {
          name: a.name,
          institution: a.institution,
          balance: a.balance ?? 0,
          isFeatured: a.isFeatured ?? false,
          savingsGoal: a.savingsGoal,
          monthlyBalances: a.monthlyBalances ?? [],
        })
        .catch((e) => ignore(e, "account.create"));
    },
    update: (
      familyId: string | null,
      id: string,
      updates: Partial<BankAccount>,
    ) => {
      if (!shouldSync(familyId)) return;
      finance
        .updateAccount(familyId, id, updates)
        .catch((e) => ignore(e, "account.update"));
    },
    remove: (familyId: string | null, id: string) => {
      if (!shouldSync(familyId)) return;
      finance
        .removeAccount(familyId, id)
        .catch((e) => ignore(e, "account.remove"));
    },
  },
  transaction: {
    update: (
      familyId: string | null,
      id: string,
      updates: Partial<Transaction>,
    ) => {
      if (!shouldSync(familyId)) return;
      finance
        .updateTransaction(familyId, id, updates)
        .catch((e) => ignore(e, "transaction.update"));
    },
  },
};

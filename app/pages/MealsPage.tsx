import { useState, useMemo } from "react";
import { format, startOfWeek, addDays, addWeeks } from "date-fns";
import { useFamilyStore } from "@/store/familyStore";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  Plus,
  Trash2,
  ShoppingCart,
  ExternalLink,
  BookOpen,
  UtensilsCrossed,
} from "lucide-react";
import AddRecipeDialog from "@/components/meals/AddRecipeDialog";
import FoodLabPanel from "@/components/foodlab/FoodLabPanel";
import type { MealType, Recipe } from "@/types/family";
import { generateId } from "@/lib/memberColors";

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner"];
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "🌅 Breakfast",
  lunch: "☀️ Lunch",
  dinner: "🌙 Dinner",
};

export default function MealsPage() {
  const {
    recipes,
    mealPlan,
    addMealPlanEntry,
    removeMealPlanEntry,
    shoppingList,
    updateShoppingList,
    toggleShoppingItem,
    deleteRecipe,
  } = useFamilyStore();

  const [showAddRecipe, setShowAddRecipe] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [showShopping, setShowShopping] = useState(false);

  const weekStart = startOfWeek(addWeeks(new Date(), weekOffset), {
    weekStartsOn: 1,
  });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getRecipeForSlot = (date: string, mealType: MealType) => {
    const entry = mealPlan.find(
      (e) => e.date === date && e.mealType === mealType,
    );
    if (!entry) return null;
    return { entry, recipe: recipes.find((r) => r.id === entry.recipeId) };
  };

  const handleAssignRecipe = (
    date: string,
    mealType: MealType,
    recipeId: string,
  ) => {
    // Remove existing entry for this slot
    const existing = mealPlan.find(
      (e) => e.date === date && e.mealType === mealType,
    );
    if (existing) removeMealPlanEntry(existing.id);
    addMealPlanEntry({ id: generateId(), date, mealType, recipeId });
  };

  const generateShoppingList = () => {
    const weekDates = weekDays.map((d) => format(d, "yyyy-MM-dd"));
    const weekEntries = mealPlan.filter((e) => weekDates.includes(e.date));
    const ingredientMap: Record<
      string,
      { amount: string; unit: string; category: string }
    > = {};

    for (const entry of weekEntries) {
      const recipe = recipes.find((r) => r.id === entry.recipeId);
      if (!recipe) continue;
      for (const ing of recipe.ingredients) {
        const key = ing.name.toLowerCase();
        if (ingredientMap[key]) {
          ingredientMap[key].amount += `, ${ing.amount}`;
        } else {
          ingredientMap[key] = {
            amount: ing.amount,
            unit: ing.unit,
            category: ing.category || "Other",
          };
        }
      }
    }

    const items = Object.entries(ingredientMap).map(([name, info]) => ({
      id: generateId(),
      name,
      amount: info.amount,
      unit: info.unit,
      category: info.category,
      checked: false,
    }));
    updateShoppingList(items);
    setShowShopping(true);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 md:px-6 md:py-4 bg-card border-b border-border">
        <h2 className="text-lg md:text-xl font-bold text-foreground">
          Meal Planning
        </h2>
      </div>

      <Tabs defaultValue="plan" className="flex-1 flex flex-col">
        <TabsList className="mx-4 md:mx-6 mt-3 grid grid-cols-4 md:w-fit md:grid-cols-4">
          <TabsTrigger value="plan">Weekly Plan</TabsTrigger>
          <TabsTrigger value="foodlab">FoodLab</TabsTrigger>
          <TabsTrigger value="recipes">Recipes</TabsTrigger>
          <TabsTrigger value="shopping">Shopping</TabsTrigger>
        </TabsList>

        <TabsContent
          value="plan"
          className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 md:space-y-4 max-w-4xl"
        >
          <div className="flex items-center justify-between">
            <div className="flex gap-1 bg-muted rounded-lg p-0.5">
              <button
                onClick={() => setWeekOffset(0)}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-medium",
                  weekOffset === 0
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground",
                )}
              >
                This Week
              </button>
              <button
                onClick={() => setWeekOffset(1)}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-medium",
                  weekOffset === 1
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground",
                )}
              >
                Next Week
              </button>
            </div>
            <Button size="sm" variant="outline" onClick={generateShoppingList}>
              <ShoppingCart className="h-4 w-4 mr-1" /> List
            </Button>
          </div>

          {weekDays.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            return (
              <div key={dateStr} className="space-y-1.5 md:space-y-2">
                <p className="text-xs md:text-sm font-semibold text-muted-foreground">
                  {format(day, "EEE, MMM d")}
                </p>
                {MEAL_TYPES.map((mt) => {
                  const data = getRecipeForSlot(dateStr, mt);
                  return (
                    <div
                      key={mt}
                      className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-lg bg-card border border-border"
                    >
                      <span className="text-xs md:text-sm w-24 md:w-28 text-muted-foreground">
                        {MEAL_LABELS[mt]}
                      </span>
                      {data?.recipe ? (
                        <div className="flex-1 flex items-center justify-between">
                          <span className="text-xs font-medium text-foreground truncate">
                            {data.recipe.title}
                          </span>
                          <button
                            onClick={() => removeMealPlanEntry(data.entry.id)}
                            className="p-1 hover:bg-destructive/10 rounded"
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </button>
                        </div>
                      ) : (
                        <select
                          className="flex-1 text-xs bg-transparent text-muted-foreground border-none outline-none"
                          value=""
                          onChange={(e) =>
                            e.target.value &&
                            handleAssignRecipe(dateStr, mt, e.target.value)
                          }
                        >
                          <option value="">+ Add recipe</option>
                          {recipes.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.title}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </TabsContent>

        <TabsContent
          value="foodlab"
          className="flex-1 overflow-y-auto p-4 md:p-6"
        >
          <FoodLabPanel />
        </TabsContent>

        <TabsContent
          value="recipes"
          className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3"
        >
          <Button
            onClick={() => setShowAddRecipe(true)}
            className="w-full md:w-auto"
          >
            <Plus className="h-4 w-4 mr-1" /> Add Recipe
          </Button>
          {recipes.length === 0 && (
            <div className="text-center text-muted-foreground text-sm md:text-base py-12">
              <BookOpen className="h-8 w-8 md:h-10 md:w-10 mx-auto mb-2 text-muted-foreground/50" />
              No recipes yet. Add your first recipe!
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {recipes.map((r) => (
              <Card key={r.id} className="overflow-hidden">
                <div className="h-24 md:h-32 bg-muted flex items-center justify-center text-2xl md:text-3xl">
                  🍽️
                </div>
                <CardContent className="p-3 md:p-4 space-y-1">
                  <p className="text-sm md:text-base font-semibold text-foreground truncate">
                    {r.title}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] md:text-xs text-muted-foreground">
                    {r.prepTime && <span>⏱ {r.prepTime}m prep</span>}
                    {r.servings && <span>👥 {r.servings}</span>}
                  </div>
                  <div className="flex gap-1 pt-1">
                    <button
                      onClick={() => deleteRecipe(r.id)}
                      className="text-[10px] md:text-xs text-destructive hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent
          value="shopping"
          className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 max-w-4xl"
        >
          {shoppingList.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-12">
              <ShoppingCart className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              Generate a shopping list from your weekly plan
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">
                  {shoppingList.length} items
                </p>
                <Button size="sm" variant="outline">
                  <ExternalLink className="h-4 w-4 mr-1" /> Amazon Groceries
                </Button>
              </div>
              {Object.entries(
                shoppingList.reduce<Record<string, typeof shoppingList>>(
                  (acc, item) => {
                    const cat = item.category || "Other";
                    if (!acc[cat]) acc[cat] = [];
                    acc[cat].push(item);
                    return acc;
                  },
                  {},
                ),
              ).map(([cat, items]) => (
                <div key={cat} className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">
                    {cat}
                  </p>
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 p-2 rounded-lg bg-card border border-border"
                    >
                      <Checkbox
                        checked={item.checked}
                        onCheckedChange={() => toggleShoppingItem(item.id)}
                      />
                      <span
                        className={cn(
                          "text-sm flex-1",
                          item.checked && "line-through text-muted-foreground",
                        )}
                      >
                        {item.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {item.amount} {item.unit}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </>
          )}
        </TabsContent>
      </Tabs>

      <AddRecipeDialog open={showAddRecipe} onOpenChange={setShowAddRecipe} />
    </div>
  );
}

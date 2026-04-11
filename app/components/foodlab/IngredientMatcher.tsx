import { useState } from "react";
import { useFamilyStore } from "@/store/familyStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Import, Search, X } from "lucide-react";
import { matchRecipesByIngredients } from "@/lib/foodlabParser";

export default function IngredientMatcher() {
  const { foodlabRecipes, importFoodlabToMeals, currentUserId } =
    useFamilyStore();
  const [input, setInput] = useState("");
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [results, setResults] = useState<
    ReturnType<typeof matchRecipesByIngredients>
  >([]);

  const addIngredient = () => {
    const trimmed = input.trim();
    if (trimmed && !ingredients.includes(trimmed.toLowerCase())) {
      const updated = [...ingredients, trimmed.toLowerCase()];
      setIngredients(updated);
      setResults(matchRecipesByIngredients(foodlabRecipes, updated));
    }
    setInput("");
  };

  const removeIngredient = (ing: string) => {
    const updated = ingredients.filter((i) => i !== ing);
    setIngredients(updated);
    setResults(
      updated.length > 0
        ? matchRecipesByIngredients(foodlabRecipes, updated)
        : [],
    );
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Enter ingredients you have and we'll find matching recipes.
      </p>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addIngredient()}
          placeholder="e.g. chicken, sweet potato, coconut milk..."
          className="flex-1 h-8 text-xs"
        />
        <Button
          size="sm"
          onClick={addIngredient}
          disabled={!input.trim()}
          className="h-8"
        >
          <Search className="h-3 w-3" />
        </Button>
      </div>

      {ingredients.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {ingredients.map((ing) => (
            <Badge
              key={ing}
              variant="secondary"
              className="text-[10px] cursor-pointer"
              onClick={() => removeIngredient(ing)}
            >
              {ing} <X className="h-2.5 w-2.5 ml-1" />
            </Badge>
          ))}
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">
            {results.length} recipe{results.length !== 1 ? "s" : ""} found
          </p>
          {results.slice(0, 5).map(({ recipe, matched, missing }) => (
            <Card key={recipe.slug}>
              <CardContent className="p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{recipe.title}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-[10px]"
                    onClick={() => {
                      if (currentUserId) {
                        importFoodlabToMeals(recipe, currentUserId);
                      }
                    }}
                  >
                    <Import className="h-3 w-3 mr-1" /> Add
                  </Button>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {recipe.cuisine}
                </Badge>
                <div className="text-[10px] text-muted-foreground">
                  <span className="text-green-600">
                    {matched.length} matched
                  </span>
                  {missing.length > 0 && (
                    <span className="ml-2 text-orange-500">
                      {missing.length} missing
                    </span>
                  )}
                </div>
                {missing.length > 0 && (
                  <p className="text-[10px] text-muted-foreground">
                    Need: {missing.slice(0, 3).join(", ")}
                    {missing.length > 3 && ` +${missing.length - 3} more`}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {ingredients.length > 0 && results.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">
          No matching recipes found. Try different ingredients.
        </p>
      )}
    </div>
  );
}

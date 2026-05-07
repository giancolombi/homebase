import { useState, useMemo } from "react";
import { useFamilyStore } from "@/store/familyStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Settings2,
  RefreshCw,
  UtensilsCrossed,
  BookOpen,
} from "lucide-react";
import FoodLabRecipeCard from "./FoodLabRecipeCard";
import IngredientMatcher from "./IngredientMatcher";
import DietaryEditor from "./DietaryEditor";
import type { FoodLabRating } from "@/types/foodlab";
import { fetchFoodlabRecipes } from "@/lib/foodlabSync";
import { toast } from "@/hooks/use-toast";

export default function FoodLabPanel() {
  const {
    foodlabRecipes,
    foodlabRatings,
    addFoodlabRating,
    currentUserId,
    foodlabLastSynced,
    setFoodlabRecipes,
    setFoodlabLastSynced,
  } = useFamilyStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [showDietary, setShowDietary] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const recipes = await fetchFoodlabRecipes();
      if (recipes.length === 0) {
        toast({
          title: "No recipes found",
          description:
            "The FoodLab repository returned no recipes. Try again later.",
          variant: "destructive",
        });
        return;
      }
      setFoodlabRecipes(recipes);
      setFoodlabLastSynced(new Date().toISOString().split("T")[0]);
      toast({
        title: "Synced",
        description: `Loaded ${recipes.length} recipes from FoodLab.`,
      });
    } catch (err) {
      toast({
        title: "Sync failed",
        description: err?.message ?? "Could not reach the FoodLab repository.",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const filteredRecipes = useMemo(() => {
    if (!searchQuery.trim()) return foodlabRecipes;
    const q = searchQuery.toLowerCase();
    return foodlabRecipes.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.cuisine.toLowerCase().includes(q) ||
        r.sharedBase.some((b) => b.toLowerCase().includes(q)),
    );
  }, [foodlabRecipes, searchQuery]);

  const getAverageRating = (slug: string): number => {
    const ratings = foodlabRatings.filter((r) => r.dish === slug);
    if (ratings.length === 0) return 0;
    return Math.round(
      ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length,
    );
  };

  const handleRate = (slug: string, rating: number) => {
    const newRating: FoodLabRating = {
      dish: slug,
      rating,
      version: "veg",
      memberId: currentUserId || undefined,
      notes: "",
      date: new Date().toISOString().split("T")[0],
    };
    addFoodlabRating(newRating);
  };

  if (foodlabRecipes.length === 0) {
    return (
      <div className="text-center py-12">
        <UtensilsCrossed className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground mb-1">
          No FoodLab recipes loaded yet
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          Pull the latest recipes straight from the{" "}
          <a
            href="https://github.com/giancolombi/foodlab"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            FoodLab repo
          </a>
          .
        </p>
        <Button size="sm" onClick={handleSync} disabled={syncing}>
          <RefreshCw
            className={`h-3.5 w-3.5 mr-1.5 ${syncing ? "animate-spin" : ""}`}
          />
          {syncing ? "Syncing..." : "Sync from GitHub"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search recipes, cuisines, ingredients..."
            className="h-8 text-xs pl-7"
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-8"
          onClick={handleSync}
          disabled={syncing}
          title="Sync from GitHub"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`}
          />
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8"
          onClick={() => setShowDietary(true)}
        >
          <Settings2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {foodlabLastSynced && (
        <p className="text-[10px] text-muted-foreground">
          {foodlabRecipes.length} recipes from FoodLab. Last synced:{" "}
          {foodlabLastSynced}
        </p>
      )}

      <Tabs defaultValue="browse">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="browse" className="text-xs">
            <BookOpen className="h-3 w-3 mr-1" /> Browse
          </TabsTrigger>
          <TabsTrigger value="match" className="text-xs">
            <UtensilsCrossed className="h-3 w-3 mr-1" /> What Can I Make?
          </TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-3 mt-3">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredRecipes.map((recipe) => (
              <FoodLabRecipeCard
                key={recipe.slug}
                recipe={recipe}
                onRate={handleRate}
                averageRating={getAverageRating(recipe.slug)}
              />
            ))}
          </div>
          {filteredRecipes.length === 0 && searchQuery && (
            <p className="text-xs text-muted-foreground text-center py-8">
              No recipes match "{searchQuery}"
            </p>
          )}
        </TabsContent>

        <TabsContent value="match" className="mt-3">
          <IngredientMatcher />
        </TabsContent>
      </Tabs>

      <DietaryEditor open={showDietary} onOpenChange={setShowDietary} />
    </div>
  );
}

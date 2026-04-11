import { useState } from "react";
import { useFamilyStore } from "@/store/familyStore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Import, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import StarRating from "./StarRating";
import type { FoodLabRecipe } from "@/types/foodlab";

interface Props {
  recipe: FoodLabRecipe;
  onRate: (slug: string, rating: number) => void;
  averageRating?: number;
}

export default function FoodLabRecipeCard({
  recipe,
  onRate,
  averageRating,
}: Props) {
  const {
    members,
    importFoodlabToMeals,
    currentUserId,
    getRecipeVersionForMember,
  } = useFamilyStore();
  const [expanded, setExpanded] = useState(false);

  const currentMember = members.find((m) => m.id === currentUserId);
  const version = currentMember
    ? getRecipeVersionForMember(recipe, currentMember.id)
    : "veg";
  const versionData =
    version === "veg" ? recipe.vegVersion : recipe.meatVersion;

  const cuisineEmoji: Record<string, string> = {
    moroccan: "🇲🇦",
    cuban: "🇨🇺",
    ethiopian: "🇪🇹",
    greek: "🇬🇷",
    korean: "🇰🇷",
    japanese: "🇯🇵",
    lebanese: "🇱🇧",
    peruvian: "🇵🇪",
    caribbean: "🇯🇲",
    thai: "🇹🇭",
    italian: "🇮🇹",
    turkish: "🇹🇷",
    tunisian: "🇹🇳",
    mexican: "🇲🇽",
  };

  const emoji =
    Object.entries(cuisineEmoji).find(([key]) =>
      recipe.cuisine.toLowerCase().includes(key),
    )?.[1] || "🍽️";

  return (
    <Card className="overflow-hidden">
      <div className="h-20 bg-muted flex items-center justify-center text-3xl">
        {emoji}
      </div>
      <CardContent className="p-3 space-y-2">
        <p className="text-sm font-semibold text-foreground truncate">
          {recipe.title}
        </p>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-[10px]">
            {recipe.cuisine}
          </Badge>
          {recipe.freezerFriendly && (
            <Badge variant="secondary" className="text-[10px]">
              Freezer OK
            </Badge>
          )}
          <Badge
            variant={version === "veg" ? "default" : "outline"}
            className="text-[10px]"
          >
            {version === "veg" ? "Veg" : "Meat"}
          </Badge>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          {recipe.prepTime && <span>Prep: {recipe.prepTime}</span>}
          {recipe.cookTime && <span>Cook: {recipe.cookTime}</span>}
        </div>

        <div className="flex items-center justify-between">
          <StarRating
            rating={averageRating || 0}
            onRate={(r) => onRate(recipe.slug, r)}
            size="sm"
          />
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[10px]"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-2 text-[10px]"
              onClick={() => {
                if (currentMember) {
                  importFoodlabToMeals(recipe, currentMember.id);
                }
              }}
            >
              <Import className="h-3 w-3 mr-1" /> Add
            </Button>
          </div>
        </div>

        {expanded && (
          <div className="border-t border-border pt-2 space-y-2 text-xs">
            <div>
              <p className="font-semibold text-muted-foreground mb-1">
                Protein ({version}):
              </p>
              <p>{versionData.protein}</p>
            </div>
            <div>
              <p className="font-semibold text-muted-foreground mb-1">
                Base ingredients:
              </p>
              <ul className="space-y-0.5 text-muted-foreground">
                {recipe.sharedBase.slice(0, 8).map((ing, i) => (
                  <li key={i}>- {ing}</li>
                ))}
                {recipe.sharedBase.length > 8 && (
                  <li className="text-[10px]">
                    +{recipe.sharedBase.length - 8} more...
                  </li>
                )}
              </ul>
            </div>
            <div>
              <p className="font-semibold text-muted-foreground mb-1">Steps:</p>
              <ol className="space-y-1 text-muted-foreground list-decimal list-inside">
                {versionData.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>
            {recipe.sourceUrls.length > 0 && (
              <a
                href={recipe.sourceUrls[0]}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
              >
                <ExternalLink className="h-2.5 w-2.5" /> Source
              </a>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

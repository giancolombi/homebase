import { useState } from "react";
import { useFamilyStore } from "@/store/familyStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { generateId } from "@/lib/memberColors";
import { Plus, Trash2 } from "lucide-react";
import type { RecipeIngredient } from "@/types/family";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AddRecipeDialog({ open, onOpenChange }: Props) {
  const { addRecipe } = useFamilyStore();
  const [title, setTitle] = useState("");
  const [prepTime, setPrepTime] = useState("");
  const [cookTime, setCookTime] = useState("");
  const [servings, setServings] = useState("");
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([
    { name: "", amount: "", unit: "", category: "Produce" },
  ]);
  const [steps, setSteps] = useState<string[]>([""]);
  const [sourceUrl, setSourceUrl] = useState("");

  const handleSave = () => {
    if (!title.trim()) return;
    addRecipe({
      id: generateId(),
      title: title.trim(),
      prepTime: prepTime ? parseInt(prepTime) : undefined,
      cookTime: cookTime ? parseInt(cookTime) : undefined,
      servings: servings ? parseInt(servings) : undefined,
      ingredients: ingredients.filter((i) => i.name.trim()),
      steps: steps.filter((s) => s.trim()),
      tags: [],
      sourceUrl: sourceUrl.trim() || undefined,
    });
    reset();
    onOpenChange(false);
  };

  const addIngredient = () =>
    setIngredients([
      ...ingredients,
      { name: "", amount: "", unit: "", category: "Other" },
    ]);
  const removeIngredient = (i: number) =>
    setIngredients(ingredients.filter((_, idx) => idx !== i));
  const updateIngredient = (
    i: number,
    field: keyof RecipeIngredient,
    value: string,
  ) => {
    const updated = [...ingredients];
    updated[i] = { ...updated[i], [field]: value };
    setIngredients(updated);
  };

  const addStep = () => setSteps([...steps, ""]);
  const updateStep = (i: number, value: string) => {
    const updated = [...steps];
    updated[i] = value;
    setSteps(updated);
  };

  const reset = () => {
    setTitle("");
    setPrepTime("");
    setCookTime("");
    setServings("");
    setIngredients([{ name: "", amount: "", unit: "", category: "Produce" }]);
    setSteps([""]);
    setSourceUrl("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Recipe</DialogTitle>
          <DialogDescription className="sr-only">
            Add a new recipe to your collection
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Recipe URL (optional)</Label>
            <Input
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Recipe name"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Prep (min)</Label>
              <Input
                type="number"
                value={prepTime}
                onChange={(e) => setPrepTime(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Cook (min)</Label>
              <Input
                type="number"
                value={cookTime}
                onChange={(e) => setCookTime(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Servings</Label>
              <Input
                type="number"
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Ingredients</Label>
            {ingredients.map((ing, i) => (
              <div key={i} className="flex gap-1.5">
                <Input
                  value={ing.amount}
                  onChange={(e) =>
                    updateIngredient(i, "amount", e.target.value)
                  }
                  placeholder="Amt"
                  className="h-8 text-xs w-14"
                />
                <Input
                  value={ing.unit}
                  onChange={(e) => updateIngredient(i, "unit", e.target.value)}
                  placeholder="Unit"
                  className="h-8 text-xs w-14"
                />
                <Input
                  value={ing.name}
                  onChange={(e) => updateIngredient(i, "name", e.target.value)}
                  placeholder="Ingredient"
                  className="h-8 text-xs flex-1"
                />
                <button
                  onClick={() => removeIngredient(i)}
                  className="p-1 hover:bg-destructive/10 rounded"
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </button>
              </div>
            ))}
            <Button
              size="sm"
              variant="outline"
              onClick={addIngredient}
              className="w-full"
            >
              <Plus className="h-3 w-3 mr-1" /> Ingredient
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Steps</Label>
            {steps.map((step, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="text-xs text-muted-foreground mt-2 w-4">
                  {i + 1}.
                </span>
                <Textarea
                  value={step}
                  onChange={(e) => updateStep(i, e.target.value)}
                  placeholder="Step..."
                  rows={2}
                  className="flex-1 text-xs"
                />
              </div>
            ))}
            <Button
              size="sm"
              variant="outline"
              onClick={addStep}
              className="w-full"
            >
              <Plus className="h-3 w-3 mr-1" /> Step
            </Button>
          </div>

          <Button
            onClick={handleSave}
            className="w-full"
            disabled={!title.trim()}
          >
            Save Recipe
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { useFamilyStore } from "@/store/familyStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, X } from "lucide-react";
import {
  DEFAULT_DIETARY_RESTRICTIONS,
  type DietaryRestrictions,
} from "@/types/foodlab";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RESTRICTION_LABELS: {
  key: keyof Omit<DietaryRestrictions, "custom">;
  label: string;
}[] = [
  { key: "noMeat", label: "No meat (vegetarian)" },
  { key: "noSoy", label: "No soy" },
  { key: "noDairy", label: "No dairy" },
  { key: "noGluten", label: "No gluten" },
  { key: "noNuts", label: "No nuts" },
  { key: "noEggs", label: "No eggs" },
  { key: "noFish", label: "No fish" },
  { key: "noPork", label: "No pork" },
];

export default function DietaryEditor({ open, onOpenChange }: Props) {
  const { members, memberDietary, setMemberDietary } = useFamilyStore();
  const [customInput, setCustomInput] = useState<Record<string, string>>({});

  const getRestrictions = (memberId: string): DietaryRestrictions =>
    memberDietary[memberId] || { ...DEFAULT_DIETARY_RESTRICTIONS };

  const toggleRestriction = (
    memberId: string,
    key: keyof Omit<DietaryRestrictions, "custom">,
  ) => {
    const current = getRestrictions(memberId);
    setMemberDietary(memberId, { ...current, [key]: !current[key] });
  };

  const addCustom = (memberId: string) => {
    const value = customInput[memberId]?.trim();
    if (!value) return;
    const current = getRestrictions(memberId);
    setMemberDietary(memberId, {
      ...current,
      custom: [...current.custom, value],
    });
    setCustomInput({ ...customInput, [memberId]: "" });
  };

  const removeCustom = (memberId: string, index: number) => {
    const current = getRestrictions(memberId);
    setMemberDietary(memberId, {
      ...current,
      custom: current.custom.filter((_, i) => i !== index),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dietary Restrictions</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Set dietary restrictions for each family member. FoodLab will show the
          right recipe version for each person.
        </p>
        <div className="space-y-6 mt-2">
          {members.map((member) => {
            const restrictions = getRestrictions(member.id);
            return (
              <div key={member.id} className="space-y-2">
                <p className="text-sm font-semibold text-foreground">
                  {member.name}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {RESTRICTION_LABELS.map(({ key, label }) => (
                    <label
                      key={key}
                      className="flex items-center gap-2 text-xs cursor-pointer"
                    >
                      <Checkbox
                        checked={restrictions[key]}
                        onCheckedChange={() =>
                          toggleRestriction(member.id, key)
                        }
                      />
                      {label}
                    </label>
                  ))}
                </div>
                {restrictions.custom.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {restrictions.custom.map((c, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs"
                      >
                        {c}
                        <button onClick={() => removeCustom(member.id, i)}>
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-1">
                  <Input
                    value={customInput[member.id] || ""}
                    onChange={(e) =>
                      setCustomInput({
                        ...customInput,
                        [member.id]: e.target.value,
                      })
                    }
                    onKeyDown={(e) => e.key === "Enter" && addCustom(member.id)}
                    placeholder="Add custom restriction..."
                    className="h-7 text-xs flex-1"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addCustom(member.id)}
                    className="h-7 px-2"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

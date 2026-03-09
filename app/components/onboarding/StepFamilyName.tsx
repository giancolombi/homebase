import { useState } from "react";
import { useFamilyStore } from "@/store/familyStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Home } from "lucide-react";

export default function StepFamilyName({ onNext }: { onNext: () => void }) {
  const { familyName, setFamilyName } = useFamilyStore();
  const [name, setName] = useState(familyName);

  const handleNext = () => {
    if (name.trim()) {
      setFamilyName(name.trim());
      onNext();
    }
  };

  return (
    <div className="flex flex-col items-center text-center gap-8 pt-8">
      <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Home className="h-7 w-7 text-primary" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Welcome to Homebase</h2>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
          Your family's command center for calendars, tasks, meals, and finances.
        </p>
      </div>
      <div className="w-full space-y-2">
        <label className="text-sm font-medium text-foreground text-left block">
          Family name
        </label>
        <Input
          placeholder="e.g. The Johnsons"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleNext()}
          autoFocus
        />
      </div>
      <Button onClick={handleNext} disabled={!name.trim()} className="w-full" size="lg">
        Continue
      </Button>
    </div>
  );
}

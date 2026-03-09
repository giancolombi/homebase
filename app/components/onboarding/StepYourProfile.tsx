import { useState } from "react";
import { useFamilyStore } from "@/store/familyStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateId } from "@/lib/memberColors";
import { ArrowLeft, UserCircle } from "lucide-react";

export default function StepYourProfile({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  const { members, addMember, setCurrentUserId, currentUserId } =
    useFamilyStore();

  // If current user already exists, pre-populate
  const existingUser = members.find((m) => m.id === currentUserId);
  const [name, setName] = useState(existingUser?.name || "");
  const [email, setEmail] = useState(existingUser?.email || "");

  const handleNext = () => {
    if (!name.trim()) return;

    if (existingUser) {
      // Already created, just proceed
      onNext();
      return;
    }

    const id = generateId();
    addMember({
      id,
      name: name.trim(),
      role: "adult",
      email: email.trim() || undefined,
      colorIndex: 1,
      isCurrentUser: true,
    });
    setCurrentUserId(id);
    onNext();
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-1.5 hover:bg-muted rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Your Profile
          </h2>
          <p className="text-sm text-muted-foreground">
            Set up your account first
          </p>
        </div>
      </div>

      <div className="flex justify-center">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <UserCircle className="h-10 w-10 text-primary" />
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Your name</Label>
          <Input
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input
            placeholder="you@example.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Used for your account and notifications
          </p>
        </div>
      </div>

      <Button
        onClick={handleNext}
        disabled={!name.trim()}
        className="w-full"
        size="lg"
      >
        Continue
      </Button>
    </div>
  );
}

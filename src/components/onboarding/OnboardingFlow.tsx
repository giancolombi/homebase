import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFamilyStore } from "@/store/familyStore";
import { useAuth } from "@/contexts/AuthContext";
import { onboarding } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import StepFamilyName from "./StepFamilyName";
import StepYourProfile from "./StepYourProfile";
import StepMembers from "./StepMembers";
import StepCalendarConnect from "./StepCalendarConnect";

export default function OnboardingFlow() {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const store = useFamilyStore();

  const handleComplete = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const currentMember = store.members.find((m) => m.id === store.currentUserId);

      // Build the members array for the API
      const ownerPayload = {
        local_id: store.currentUserId || "",
        name: currentMember?.name || user.email || "Me",
        role: "adult",
        email: currentMember?.email || user.email || "",
        color_index: currentMember?.colorIndex ?? 1,
        is_owner: true,
      };

      const otherMembers = store.members
        .filter((m) => m.id !== store.currentUserId)
        .map((m) => ({
          local_id: m.id,
          name: m.name,
          role: m.role,
          email: m.email || undefined,
          color_index: m.colorIndex,
          is_owner: false,
        }));

      // Build calendar connections
      const calConnections = store.calendarConnections
        .filter((c) => c.connected)
        .map((c) => ({
          member_id: c.memberId,
          provider: c.provider,
          email: c.email || "",
          connected: true,
        }));

      await onboarding.complete({
        profile: {
          display_name: currentMember?.name || user.full_name || "",
          color_index: currentMember?.colorIndex ?? 0,
        },
        familyName: store.familyName,
        members: [ownerPayload, ...otherMembers],
        calendarConnections: calConnections,
      });

      // Mark onboarding complete locally
      store.completeOnboarding();
      navigate("/calendar");
    } catch (err: any) {
      console.error("Onboarding save error:", err);
      toast({
        title: "Error saving data",
        description: err?.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const totalSteps = 4;

  return (
    <div className="flex flex-col min-h-screen bg-background max-w-lg mx-auto px-6 py-8">
      {/* Progress */}
      <div className="flex items-center gap-1.5 mb-8">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} className="flex-1 flex items-center">
            <div
              className={`h-1 w-full rounded-full transition-all duration-300 ${
                i < step ? "bg-primary" : i === step ? "bg-primary/70" : "bg-border"
              }`}
            />
          </div>
        ))}
      </div>

      <div className="flex-1 animate-fade-in" key={step}>
        {step === 0 && <StepFamilyName onNext={() => setStep(1)} />}
        {step === 1 && (
          <StepYourProfile onNext={() => setStep(2)} onBack={() => setStep(0)} />
        )}
        {step === 2 && (
          <StepMembers onNext={() => setStep(3)} onBack={() => setStep(1)} />
        )}
        {step === 3 && (
          <StepCalendarConnect onComplete={handleComplete} onBack={() => setStep(2)} saving={saving} />
        )}
      </div>

      {/* Step indicator */}
      <div className="pt-4 text-center">
        <p className="text-xs text-muted-foreground">
          Step {step + 1} of {totalSteps}
        </p>
      </div>
    </div>
  );
}

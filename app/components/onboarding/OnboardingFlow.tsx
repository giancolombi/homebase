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
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const store = useFamilyStore();
  const step = useFamilyStore((s) => s.onboardingStep);
  const setStep = useFamilyStore((s) => s.setOnboardingStep);

  // Called when transitioning from Step 2 (Members) → Step 3 (Calendar).
  // Creates the family + members in the DB so the calendar step has a real
  // familyId to use with the OAuth flow. Idempotent on the server.
  const handleSetupAndAdvance = async () => {
    if (!user) return;
    if (store.familyId) {
      // Family already created (e.g. user navigated back and forward) — skip.
      setStep(3);
      return;
    }
    setSaving(true);
    try {
      const currentMember = store.members.find(
        (m) => m.id === store.currentUserId,
      );

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

      const result = await onboarding.complete({
        profile: {
          display_name: currentMember?.name || user.full_name || "",
          color_index: currentMember?.colorIndex ?? 0,
        },
        familyName: store.familyName,
        members: [ownerPayload, ...otherMembers],
        calendarConnections: [],
      });

      if (result?.familyId) {
        store.setFamilyId(result.familyId);
      }
      setStep(3);
    } catch (err: any) {
      console.error("Onboarding setup error:", err);
      toast({
        title: "Error setting up family",
        description: err?.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Called from the final calendar step. Calendar connections were written
  // by the OAuth callback as the user clicked "Connect" — nothing to save here
  // beyond marking onboarding complete on the server so future logins don't
  // bounce the user back into the wizard.
  const handleComplete = async () => {
    try {
      await onboarding.finish();
    } catch (err: any) {
      // Non-fatal — mark complete locally regardless. Worst case the user
      // sees the wizard once more on their next login.
      console.error("onboarding.finish failed:", err);
    }
    store.completeOnboarding();
    setStep(0);
    navigate("/calendar");
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
                i < step
                  ? "bg-primary"
                  : i === step
                    ? "bg-primary/70"
                    : "bg-border"
              }`}
            />
          </div>
        ))}
      </div>

      <div className="flex-1 animate-fade-in" key={step}>
        {step === 0 && <StepFamilyName onNext={() => setStep(1)} />}
        {step === 1 && (
          <StepYourProfile
            onNext={() => setStep(2)}
            onBack={() => setStep(0)}
          />
        )}
        {step === 2 && (
          <StepMembers
            onNext={handleSetupAndAdvance}
            onBack={() => setStep(1)}
            saving={saving}
          />
        )}
        {step === 3 && (
          <StepCalendarConnect
            onComplete={handleComplete}
            onBack={() => setStep(2)}
          />
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

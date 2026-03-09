import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFamilyStore } from "@/store/familyStore";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
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
      // 1. Update profile
      const currentMember = store.members.find((m) => m.id === store.currentUserId);
      if (currentMember) {
        await supabase.from("profiles").upsert({
          id: user.id,
          display_name: currentMember.name,
          color_index: currentMember.colorIndex,
        });
      }

      // 2. Create family
      const { data: family, error: familyErr } = await supabase
        .from("families")
        .insert({ name: store.familyName, owner_id: user.id })
        .select()
        .single();

      if (familyErr || !family) throw familyErr || new Error("Failed to create family");

      // 3. Create family members (owner first, then others)
      const ownerMember = {
        family_id: family.id,
        user_id: user.id,
        name: currentMember?.name || user.email || "Me",
        role: "adult" as const,
        email: currentMember?.email || user.email || "",
        color_index: currentMember?.colorIndex || 1,
        is_owner: true,
        invite_status: "accepted" as const,
      };

      const { data: ownerRow, error: ownerErr } = await supabase
        .from("family_members")
        .insert(ownerMember)
        .select()
        .single();

      if (ownerErr || !ownerRow) throw ownerErr || new Error("Failed to create owner member");

      // Map old local IDs to new DB IDs
      const idMap = new Map<string, string>();
      if (store.currentUserId) {
        idMap.set(store.currentUserId, ownerRow.id);
      }

      // Other members
      const otherMembers = store.members.filter((m) => m.id !== store.currentUserId);
      if (otherMembers.length > 0) {
        const memberRows = otherMembers.map((m) => ({
          family_id: family.id,
          name: m.name,
          role: m.role,
          email: m.email || null,
          color_index: m.colorIndex,
          invite_status: m.role === "adult" ? ("pending" as const) : null,
          is_owner: false,
        }));

        const { data: insertedMembers, error: membersErr } = await supabase
          .from("family_members")
          .insert(memberRows)
          .select();

        if (membersErr) throw membersErr;

        // Map old IDs to new IDs by position
        insertedMembers?.forEach((dbMember, i) => {
          idMap.set(otherMembers[i].id, dbMember.id);
        });
      }

      // 4. Create calendar connections
      const calConnections = store.calendarConnections
        .filter((c) => c.connected)
        .map((c) => ({
          family_id: family.id,
          member_id: idMap.get(c.memberId) || "",
          provider: c.provider,
          email: c.email || "",
          connected: true,
        }))
        .filter((c) => c.member_id);

      if (calConnections.length > 0) {
        const { error: calErr } = await supabase
          .from("calendar_connections")
          .insert(calConnections);
        if (calErr) console.error("Calendar connections error:", calErr);
      }

      // 5. Create default task categories
      const defaultCategories = [
        { family_id: family.id, name: "Home" },
        { family_id: family.id, name: "School" },
        { family_id: family.id, name: "Work" },
        { family_id: family.id, name: "Health" },
        { family_id: family.id, name: "Errands" },
      ];

      await supabase.from("task_categories").insert(defaultCategories);

      // 6. Mark onboarding complete locally
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

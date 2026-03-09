import { useState } from "react";
import { useFamilyStore } from "@/store/familyStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MEMBER_COLORS, getMemberInitials, generateId } from "@/lib/memberColors";
import type { MemberRole } from "@/types/family";
import { Plus, Trash2, ArrowLeft, Users, Mail, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

export default function StepMembers({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  const { members, currentUserId, addMember, removeMember } = useFamilyStore();
  const [name, setName] = useState("");
  const [role, setRole] = useState<MemberRole>("child");
  const [email, setEmail] = useState("");

  // Don't show current user in the "add more" list header but show them as "You"
  const otherMembers = members.filter((m) => m.id !== currentUserId);

  const handleAdd = () => {
    if (!name.trim()) return;
    // Current user is colorIndex 1, so start others from 2
    const usedColors = members.map((m) => m.colorIndex);
    let colorIndex = 2;
    while (usedColors.includes(colorIndex) && colorIndex <= 6) colorIndex++;
    if (colorIndex > 6) colorIndex = ((members.length - 1) % 6) + 1;

    addMember({
      id: generateId(),
      name: name.trim(),
      role,
      email: role === "adult" && email.trim() ? email.trim() : undefined,
      colorIndex,
      inviteStatus: role === "adult" ? "pending" : undefined,
    });
    setName("");
    setEmail("");
    setRole("child");
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Family Members</h2>
          <p className="text-sm text-muted-foreground">Add your partner, kids, and other household members</p>
        </div>
      </div>

      {/* Current user shown as "You" */}
      {members.filter((m) => m.id === currentUserId).map((m) => (
        <div
          key={m.id}
          className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20"
        >
          <Avatar className="h-9 w-9">
            <AvatarFallback className={cn("text-xs font-semibold text-primary-foreground", MEMBER_COLORS[m.colorIndex])}>
              {getMemberInitials(m.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-foreground truncate">{m.name}</p>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">You</Badge>
            </div>
            <p className="text-xs text-muted-foreground">Admin</p>
          </div>
        </div>
      ))}

      {/* Other members list */}
      {otherMembers.length > 0 && (
        <div className="space-y-2">
          {otherMembers.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border"
            >
              <Avatar className="h-9 w-9">
                <AvatarFallback className={cn("text-xs font-semibold text-primary-foreground", MEMBER_COLORS[m.colorIndex])}>
                  {getMemberInitials(m.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground truncate">{m.name}</p>
                  {m.role === "adult" && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5">
                      <Mail className="h-2.5 w-2.5" /> Invite pending
                    </Badge>
                  )}
                  {m.role === "child" && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5">
                      <Shield className="h-2.5 w-2.5" /> Managed
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground capitalize">{m.role}{m.email ? ` · ${m.email}` : ""}</p>
              </div>
              <button
                onClick={() => removeMember(m.id)}
                className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      <div className="space-y-3 p-4 rounded-lg border border-dashed border-border bg-card">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Users className="h-4 w-4" />
          Add a family member
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Name</Label>
          <Input
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Role</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={role === "adult" ? "default" : "outline"}
              size="sm"
              onClick={() => setRole("adult")}
              className="flex-1"
            >
              Adult
            </Button>
            <Button
              type="button"
              variant={role === "child" ? "default" : "outline"}
              size="sm"
              onClick={() => setRole("child")}
              className="flex-1"
            >
              Child
            </Button>
          </div>
          {role === "adult" && (
            <p className="text-[11px] text-muted-foreground">
              Adults will receive an email invite to connect their own calendars and collaborate.
            </p>
          )}
          {role === "child" && (
            <p className="text-[11px] text-muted-foreground">
              Children's profiles are managed by you — you can add their calendars and activities.
            </p>
          )}
        </div>
        {role === "adult" && (
          <div className="space-y-1.5">
            <Label className="text-xs">Email for invite</Label>
            <Input
              placeholder="partner@example.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        )}
        <Button
          onClick={handleAdd}
          disabled={!name.trim()}
          variant="secondary"
          className="w-full"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-1" /> Add Member
        </Button>
      </div>

      <Button onClick={onNext} className="w-full" size="lg">
        Continue
      </Button>
    </div>
  );
}

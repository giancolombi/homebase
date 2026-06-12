import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useFamilyStore } from "@/store/familyStore";
import { generateId } from "@/lib/memberColors";
import { family } from "@/lib/api";
import { Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import type { MemberRole } from "@/types/family";

export function AddMemberDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("adult");
  const { members, addMember } = useFamilyStore();
  const familyId = useFamilyStore((s) => s.familyId);
  const queryClient = useQueryClient();

  const handleAdd = async () => {
    if (!name.trim()) return;

    const colorIndex = (members.length % 6) + 1;
    const memberData = {
      name: name.trim(),
      role,
      email: role === "adult" ? email.trim() || undefined : undefined,
      colorIndex,
      inviteStatus: role === "adult" ? ("pending" as const) : undefined,
    };

    // Save to local store
    const localId = generateId();
    addMember({ id: localId, ...memberData });

    // Also save to database if we have a familyId
    if (familyId) {
      try {
        const created = await family.addMember({
          familyId,
          name: memberData.name,
          role: memberData.role,
          email: memberData.email,
          colorIndex,
        });
        // Adopt the server-assigned id (and remap the child's pseudo
        // calendar connection) so later edits/removals target the real row
        // instead of 404ing on the local id.
        useFamilyStore.setState((s) => ({
          members: s.members.map((m) =>
            m.id === localId ? { ...m, id: created.id } : m,
          ),
          calendarConnections: s.calendarConnections.map((c) =>
            c.memberId === localId
              ? { ...c, id: `hb-${created.id}`, memberId: created.id }
              : c,
          ),
        }));
        queryClient.invalidateQueries({ queryKey: ["family-members"] });
      } catch (err) {
        console.error("Failed to save member to API:", err);
      }
    }

    setName("");
    setEmail("");
    setRole("adult");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-1" /> Add Member
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Family Member</DialogTitle>
          <DialogDescription className="sr-only">
            Add a new member to your family
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter name"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <RadioGroup
              value={role}
              onValueChange={(v) => setRole(v as MemberRole)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="adult" id="role-adult" />
                <Label
                  htmlFor="role-adult"
                  className="font-normal cursor-pointer"
                >
                  Adult (will receive invite)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="child" id="role-child" />
                <Label
                  htmlFor="role-child"
                  className="font-normal cursor-pointer"
                >
                  Child (managed account)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {role === "adult" && (
            <div className="space-y-2">
              <Label htmlFor="email">Email (optional)</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleAdd}
              disabled={!name.trim()}
            >
              Add Member
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { generateId } from "@/lib/memberColors";
import type { Recurrence } from "@/types/family";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: string;
  defaultTime?: string;
}

function plusOneHour(time: string): string {
  const [hours, minutes] = time.split(":").map((n) => parseInt(n, 10));
  return `${String(Math.min((hours || 0) + 1, 23)).padStart(2, "0")}:${String(
    minutes || 0,
  ).padStart(2, "0")}`;
}

export default function AddEventDialog({
  open,
  onOpenChange,
  defaultDate,
  defaultTime,
}: Props) {
  const { members, addEvent } = useFamilyStore();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(
    defaultDate || new Date().toISOString().split("T")[0],
  );
  const [startTime, setStartTime] = useState(defaultTime || "09:00");
  const [endTime, setEndTime] = useState(
    defaultTime ? plusOneHour(defaultTime) : "10:00",
  );
  // Derived fallback: members may load after mount, and the parent remounts
  // this dialog (via key) when the preselected slot changes.
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const memberId = selectedMemberId || members[0]?.id || "";
  const [recurrence, setRecurrence] = useState<Recurrence>("none");

  const handleSave = () => {
    if (!title.trim() || !memberId) return;
    addEvent({
      id: generateId(),
      title: title.trim(),
      description: description.trim() || undefined,
      date,
      startTime,
      endTime,
      memberId,
      recurrence,
    });
    resetAndClose();
  };

  const resetAndClose = () => {
    setTitle("");
    setDescription("");
    setRecurrence("none");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle>Add Event</DialogTitle>
          <DialogDescription className="sr-only">
            Add a new calendar event
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Assign to</Label>
              <Select value={memberId} onValueChange={setSelectedMemberId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>End</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Recurrence</Label>
            <Select
              value={recurrence}
              onValueChange={(v) => setRecurrence(v as Recurrence)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleSave}
            className="w-full"
            disabled={!title.trim()}
          >
            Add Event
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { generateId } from "@/lib/memberColors";
import type { Recurrence } from "@/types/family";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AddTaskDialog({ open, onOpenChange }: Props) {
  const { members, taskCategories, addTask, addTaskCategory } =
    useFamilyStore();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  // selectedCategoryId tracks the user's explicit choice; we fall back to the
  // first available category when nothing is selected. This makes the dialog
  // submittable even if categories hydrate after the dialog mounts.
  const [selectedCategoryId, setCategoryId] = useState("");
  const categoryId = selectedCategoryId || taskCategories[0]?.id || "";
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [deadline, setDeadline] = useState("");
  const [recurrence, setRecurrence] = useState<Recurrence>("none");
  const [newCategory, setNewCategory] = useState("");

  const handleSave = () => {
    if (!title.trim() || !categoryId) return;
    addTask({
      id: generateId(),
      title: title.trim(),
      description: description.trim() || undefined,
      categoryId,
      assignedTo,
      deadline: deadline || undefined,
      recurrence,
      status: "todo",
      createdAt: new Date().toISOString(),
    });
    reset();
    onOpenChange(false);
  };

  const handleAddCategory = () => {
    if (!newCategory.trim()) return;
    const id = generateId();
    addTaskCategory({ id, name: newCategory.trim() });
    setCategoryId(id);
    setNewCategory("");
  };

  const toggleMember = (id: string) => {
    setAssignedTo((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  };

  const reset = () => {
    setTitle("");
    setDescription("");
    setAssignedTo([]);
    setDeadline("");
    setRecurrence("none");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle>Add Task</DialogTitle>
          <DialogDescription className="sr-only">
            Create a new task for your family
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
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
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {taskCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="New category"
                className="h-8 text-xs"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddCategory}
                disabled={!newCategory.trim()}
              >
                Add
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Assign to</Label>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => (
                <label key={m.id} className="flex items-center gap-1.5 text-sm">
                  <Checkbox
                    checked={assignedTo.includes(m.id)}
                    onCheckedChange={() => toggleMember(m.id)}
                  />
                  {m.name}
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Deadline</Label>
              <Input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
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
          </div>
          <Button
            onClick={handleSave}
            className="w-full"
            disabled={!title.trim()}
          >
            Add Task
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

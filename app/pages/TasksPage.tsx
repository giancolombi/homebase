import { useState, useMemo } from "react";
import { useFamilyStore } from "@/store/familyStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  MEMBER_COLORS,
  MEMBER_BG_LIGHT,
  getMemberInitials,
  generateId,
} from "@/lib/memberColors";
import { cn } from "@/lib/utils";
import { Plus, Filter, Calendar as CalIcon, Tag } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import AddTaskDialog from "@/components/tasks/AddTaskDialog";

export default function TasksPage() {
  const { tasks, taskCategories, members, updateTask, addTaskCategory } =
    useFamilyStore();
  const [showAdd, setShowAdd] = useState(false);
  const [filterMember, setFilterMember] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [catPopoverOpen, setCatPopoverOpen] = useState(false);

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    addTaskCategory({ id: generateId(), name: newCatName.trim() });
    setNewCatName("");
    setCatPopoverOpen(false);
  };

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (filterMember !== "all" && !t.assignedTo.includes(filterMember))
        return false;
      if (filterCategory !== "all" && t.categoryId !== filterCategory)
        return false;
      return true;
    });
  }, [tasks, filterMember, filterCategory]);

  const grouped = useMemo(() => {
    const map: Record<string, typeof filtered> = {};
    for (const t of filtered) {
      const cat =
        taskCategories.find((c) => c.id === t.categoryId)?.name ||
        "Uncategorized";
      if (!map[cat]) map[cat] = [];
      map[cat].push(t);
    }
    return map;
  }, [filtered, taskCategories]);

  const toggleDone = (taskId: string, currentStatus: string) => {
    updateTask(taskId, { status: currentStatus === "done" ? "todo" : "done" });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 bg-card border-b border-border flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Tasks</h2>
        <div className="flex gap-2">
          <Popover open={catPopoverOpen} onOpenChange={setCatPopoverOpen}>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline">
                <Tag className="h-4 w-4 mr-1" /> Add Category
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3" align="end">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                New Category
              </p>
              <div className="flex gap-2">
                <Input
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Category name"
                  className="h-8 text-xs"
                  onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                />
                <Button
                  size="sm"
                  onClick={handleAddCategory}
                  disabled={!newCatName.trim()}
                >
                  Add
                </Button>
              </div>
              {taskCategories.length > 0 && (
                <div className="mt-2 pt-2 border-t border-border">
                  <div className="flex flex-wrap gap-1">
                    {taskCategories.map((c) => (
                      <span
                        key={c.id}
                        className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground"
                      >
                        {c.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </PopoverContent>
          </Popover>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4 mr-1" /> Task
          </Button>
        </div>
      </div>

      {showFilters && (
        <div className="px-4 py-2 bg-muted/30 border-b border-border flex gap-2">
          <Select value={filterMember} onValueChange={setFilterMember}>
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue placeholder="Member" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Members</SelectItem>
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {taskCategories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {Object.keys(grouped).length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-12">
            No tasks yet. Add your first task!
          </div>
        )}
        {Object.entries(grouped).map(([cat, catTasks]) => (
          <div key={cat} className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {cat}
            </h3>
            {catTasks.map((task) => {
              const isDone = task.status === "done";
              const isOverdue =
                task.deadline &&
                new Date(task.deadline) < new Date() &&
                !isDone;
              return (
                <div
                  key={task.id}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg bg-card border border-border transition-opacity",
                    isDone && "opacity-60",
                  )}
                >
                  <Checkbox
                    checked={isDone}
                    onCheckedChange={() => toggleDone(task.id, task.status)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-sm font-medium text-foreground",
                        isDone && "line-through",
                      )}
                    >
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {task.deadline && (
                        <span
                          className={cn(
                            "text-[10px] flex items-center gap-0.5",
                            isOverdue
                              ? "text-destructive"
                              : "text-muted-foreground",
                          )}
                        >
                          <CalIcon className="h-3 w-3" />
                          {task.deadline}
                        </span>
                      )}
                      {task.recurrence !== "none" && (
                        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          🔄 {task.recurrence}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex -space-x-1">
                    {task.assignedTo.map((mId) => {
                      const m = members.find((m) => m.id === mId);
                      if (!m) return null;
                      return (
                        <Avatar
                          key={m.id}
                          className="h-6 w-6 border border-card"
                        >
                          <AvatarFallback
                            className={cn(
                              "text-[8px] font-bold text-primary-foreground",
                              MEMBER_COLORS[m.colorIndex],
                            )}
                          >
                            {getMemberInitials(m.name)}
                          </AvatarFallback>
                        </Avatar>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <AddTaskDialog open={showAdd} onOpenChange={setShowAdd} />
    </div>
  );
}

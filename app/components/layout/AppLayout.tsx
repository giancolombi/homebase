import { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Calendar,
  CheckSquare,
  UtensilsCrossed,
  Wallet,
  Settings,
} from "lucide-react";
import { useFamilyStore } from "@/store/familyStore";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getMemberInitials, MEMBER_COLORS } from "@/lib/memberColors";
import { cn } from "@/lib/utils";

const tabs = [
  { path: "/calendar", label: "Calendar", icon: Calendar },
  { path: "/tasks", label: "Tasks", icon: CheckSquare },
  { path: "/meals", label: "Meals", icon: UtensilsCrossed },
  { path: "/finance", label: "Finance", icon: Wallet },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { familyName, members } = useFamilyStore();

  return (
    <div className="flex flex-col min-h-screen bg-background max-w-lg mx-auto relative">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-card/95 backdrop-blur-sm border-b border-border">
        <div>
          <h1 className="text-base font-semibold tracking-tight text-foreground">
            {familyName || "Homebase"}
          </h1>
          <p className="text-[11px] text-muted-foreground">
            Family Command Center
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex -space-x-1.5">
            {members.slice(0, 4).map((m) => (
              <Avatar key={m.id} className="h-7 w-7 border-2 border-card">
                <AvatarFallback
                  className={cn(
                    "text-[10px] font-semibold text-primary-foreground",
                    MEMBER_COLORS[m.colorIndex] || "bg-muted",
                  )}
                >
                  {getMemberInitials(m.name)}
                </AvatarFallback>
              </Avatar>
            ))}
            {members.length > 4 && (
              <Avatar className="h-7 w-7 border-2 border-card">
                <AvatarFallback className="text-[10px] font-semibold bg-muted text-muted-foreground">
                  +{members.length - 4}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
          <button
            onClick={() => navigate("/settings")}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <Settings className="h-4.5 w-4.5 text-muted-foreground" />
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-20">{children}</main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-card/95 backdrop-blur-sm border-t border-border z-30 safe-area-bottom">
        <div className="flex items-center justify-around py-1.5 px-2">
          {tabs.map((tab) => {
            const isActive =
              location.pathname === tab.path ||
              location.pathname.startsWith(tab.path + "/");
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-all min-w-[56px]",
                  isActive
                    ? "text-primary bg-primary/8"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <tab.icon
                  className={cn("h-5 w-5", isActive && "stroke-[2.5]")}
                />
                <span
                  className={cn(
                    "text-[10px]",
                    isActive ? "font-semibold" : "font-medium",
                  )}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

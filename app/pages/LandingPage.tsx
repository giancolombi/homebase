import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Home,
  Calendar,
  CheckSquare,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-16 space-y-16">
        {/* Hero */}
        <div className="text-center space-y-4">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Home className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Homebase
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Your family's command center. Calendars, tasks, meals, and finances
            — all in one place.
          </p>
          <div className="flex gap-3 justify-center pt-4">
            <Link to="/auth">
              <Button size="lg">Sign In</Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline">
                Create Account
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="p-6 rounded-xl border border-border bg-card">
            <Calendar className="h-6 w-6 text-primary mb-3" />
            <h3 className="font-semibold text-foreground mb-1">
              Shared Calendar
            </h3>
            <p className="text-sm text-muted-foreground">
              See everyone's schedule in one view. Connect Google Calendar and
              Outlook for automatic sync.
            </p>
          </div>
          <div className="p-6 rounded-xl border border-border bg-card">
            <CheckSquare className="h-6 w-6 text-primary mb-3" />
            <h3 className="font-semibold text-foreground mb-1">Family Tasks</h3>
            <p className="text-sm text-muted-foreground">
              Assign chores, track homework, and manage to-dos for the whole
              family.
            </p>
          </div>
          <div className="p-6 rounded-xl border border-border bg-card">
            <UtensilsCrossed className="h-6 w-6 text-primary mb-3" />
            <h3 className="font-semibold text-foreground mb-1">
              Meal Planning
            </h3>
            <p className="text-sm text-muted-foreground">
              Plan weekly meals, browse recipes, and generate shopping lists
              automatically.
            </p>
          </div>
          <div className="p-6 rounded-xl border border-border bg-card">
            <Wallet className="h-6 w-6 text-primary mb-3" />
            <h3 className="font-semibold text-foreground mb-1">
              Family Finances
            </h3>
            <p className="text-sm text-muted-foreground">
              Track accounts, view spending, and stay on top of your family's
              financial health.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground space-y-2">
          <p className="space-x-3">
            <Link to="/privacy" className="underline hover:text-foreground">
              Privacy Policy
            </Link>
            <span aria-hidden>·</span>
            <Link to="/terms" className="underline hover:text-foreground">
              Terms of Service
            </Link>
          </p>
          <p>Built for families, by families.</p>
        </div>
      </div>
    </div>
  );
}

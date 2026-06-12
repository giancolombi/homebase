import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

// Catches render-time errors anywhere in the tree so one broken component
// shows a recoverable error screen instead of blanking the whole SPA.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("Unhandled render error:", error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
          <h1 className="text-xl font-semibold text-foreground">
            Something went wrong
          </h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            An unexpected error occurred. Reloading usually fixes it — your data
            is safe.
          </p>
          <Button onClick={() => window.location.reload()}>Reload</Button>
        </div>
      );
    }
    return this.props.children;
  }
}

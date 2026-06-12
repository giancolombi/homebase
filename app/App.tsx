import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useFamilyStore } from "@/store/familyStore";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";
import AppLayout from "@/components/layout/AppLayout";
import CalendarPage from "@/pages/CalendarPage";
import TasksPage from "@/pages/TasksPage";
import MealsPage from "@/pages/MealsPage";
import SettingsPage from "@/pages/SettingsPage";
import AuthPage from "@/pages/AuthPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import AcceptInvitePage from "@/pages/AcceptInvitePage";
import PrivacyPage from "@/pages/PrivacyPage";
import TermsPage from "@/pages/TermsPage";
import LandingPage from "@/pages/LandingPage";
import NotFound from "@/pages/NotFound";

// FinancePage pulls in recharts (+ react-plaid-link) — by far the heaviest
// route. Split it out so calendar-only users never download it.
const FinancePage = lazy(() => import("@/pages/FinancePage"));

const queryClient = new QueryClient();

function PageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();
  const storeOnboardingComplete = useFamilyStore((s) => s.onboardingComplete);
  // The server's flag (from /api/auth/me) is authoritative; the persisted
  // store starts false on a fresh browser and only catches up async. OR-ing
  // them prevents a returning user from flashing the onboarding wizard.
  const onboardingComplete =
    storeOnboardingComplete || !!user?.onboardingComplete;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Not logged in → public pages + auth
  if (!user) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/accept-invite" element={<AcceptInvitePage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  // Logged in but hasn't completed onboarding
  if (!onboardingComplete) {
    return (
      <Routes>
        <Route path="*" element={<OnboardingFlow />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/calendar" replace />} />
      <Route path="/auth" element={<Navigate to="/calendar" replace />} />
      <Route
        path="/calendar"
        element={
          <AppLayout>
            <CalendarPage />
          </AppLayout>
        }
      />
      <Route
        path="/tasks"
        element={
          <AppLayout>
            <TasksPage />
          </AppLayout>
        }
      />
      <Route
        path="/meals"
        element={
          <AppLayout>
            <MealsPage />
          </AppLayout>
        }
      />
      <Route
        path="/finance"
        element={
          <AppLayout>
            <Suspense fallback={<PageSpinner />}>
              <FinancePage />
            </Suspense>
          </AppLayout>
        }
      />
      <Route
        path="/settings"
        element={
          <AppLayout>
            <SettingsPage />
          </AppLayout>
        }
      />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;

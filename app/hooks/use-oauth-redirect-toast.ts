import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { formatCalendarError } from "@/lib/calendarErrors";

// After the OAuth popup finishes, the API redirects the opener back with
// ?calendarConnected=<provider> or ?calendarError=... — surface the result
// as a toast and scrub the params from the URL. Shared by the Settings page
// and the onboarding calendar step.
export function useOAuthRedirectToast() {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const connected = searchParams.get("calendarConnected");
    const error = searchParams.get("calendarError");
    if (connected) {
      toast({
        title: "Calendar connected",
        description: `Your ${connected} calendar has been connected.`,
      });
      setSearchParams({}, { replace: true });
    }
    if (error) {
      const t = formatCalendarError({
        error,
        description: searchParams.get("calendarErrorDescription"),
        subcode: searchParams.get("calendarErrorSubcode"),
      });
      toast({ ...t, variant: "destructive" });
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);
}

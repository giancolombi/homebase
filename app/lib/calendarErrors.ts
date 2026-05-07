// Map raw OAuth callback error params (set in api/calendar.ts) into a
// user-facing toast payload. Detects a few well-known Azure AD error codes
// (AADSTS*) so we can give enterprise users actionable guidance instead of
// dumping a raw provider message.

export interface CalendarErrorToast {
  title: string;
  description: string;
}

interface RawError {
  error: string;
  description?: string | null;
  subcode?: string | null;
}

export function formatCalendarError(raw: RawError): CalendarErrorToast {
  const description = raw.description ?? "";
  const aadsts = description.match(/AADSTS(\d+)/)?.[1];

  // Admin consent required — most common enterprise blocker.
  if (aadsts === "65001" || raw.subcode === "consent_required") {
    return {
      title: "Your IT admin needs to approve Homebase",
      description:
        "Microsoft requires an admin in your organization to grant Homebase " +
        "access before you can connect your work calendar. Forward this to " +
        "IT, or use a personal Microsoft account.",
    };
  }

  // External tenant blocked — app is single-tenant or user is from a tenant
  // not allowed by the app registration.
  if (aadsts === "50020" || aadsts === "90072" || aadsts === "50194") {
    return {
      title: "Work account not allowed",
      description:
        "Homebase isn't currently approved to sign in users from your " +
        "organization's Microsoft tenant. We're working on broader support — " +
        "in the meantime, a personal Microsoft account will work.",
    };
  }

  if (raw.error === "access_denied") {
    return {
      title: "Calendar connection cancelled",
      description: description || "You cancelled the sign-in.",
    };
  }

  return {
    title: "Calendar connection failed",
    description: description || `Could not connect calendar (${raw.error}).`,
  };
}

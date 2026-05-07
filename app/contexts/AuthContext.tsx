import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { auth, type AuthUser } from "@/lib/api";
import { pullAllData } from "@/lib/sync";

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
  setUser: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount.
  useEffect(() => {
    auth.getSession().then((session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for storage events (login/logout in other tabs)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "homebase-auth-token") {
        if (e.newValue) {
          auth.getSession().then((session) => {
            setUser(session?.user ?? null);
          });
        } else {
          setUser(null);
        }
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // Keep the family store in sync with the authenticated user's server-side
  // state. The persisted store is browser-local, so without this a user who
  // signs in on a new device (or after clearing storage) would get routed to
  // onboarding even though their family already exists on the server.
  useEffect(() => {
    // Lazy import to avoid a circular dep with the store.
    import("@/store/familyStore").then(({ useFamilyStore }) => {
      const store = useFamilyStore.getState();

      if (!user) {
        // Signed out — clear per-family state so the next user on this
        // browser doesn't inherit it. Auth token is already cleared by signOut.
        if (store.familyId || store.onboardingComplete) {
          store.resetOnboarding();
        }
        return;
      }

      // The server is the source of truth for onboarding state — derive it
      // from /api/auth/me.onboardingComplete, not the persisted local flag.
      const serverComplete = !!user.onboardingComplete;

      if (user.familyId) {
        store.setFamilyId(user.familyId);
        pullAllData(
          user.familyId,
          (patch) => useFamilyStore.setState(patch as any),
          user.email,
        );
      }

      if (store.onboardingComplete !== serverComplete) {
        useFamilyStore.setState({ onboardingComplete: serverComplete });
      }
    });
  }, [user]);

  const signOut = async () => {
    await auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

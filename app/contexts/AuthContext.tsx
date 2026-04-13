import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { auth, type AuthUser } from "@/lib/api";

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for an existing session on mount
    auth.getSession().then((session) => {
      setUser(session?.user ?? null);
      // Sync familyId from backend into Zustand store (lazy import to avoid circular dep)
      if (session?.user?.familyId) {
        import("@/store/familyStore").then(({ useFamilyStore }) => {
          useFamilyStore.getState().setFamilyId(session.user.familyId!);
        });
      }
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

  const signOut = async () => {
    await auth.signOut();
    setUser(null);
  };

  // Expose a way for sign-in/sign-up to update the user in context
  // We attach it to window so the auth pages can call it after login
  useEffect(() => {
    (window as any).__setAuthUser = setUser;
    return () => {
      delete (window as any).__setAuthUser;
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

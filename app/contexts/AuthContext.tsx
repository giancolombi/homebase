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

  useEffect(() => {
    // Check for an existing session on mount
    auth.getSession().then((session) => {
      setUser(session?.user ?? null);
      // Sync familyId from backend into Zustand store (lazy import to avoid circular dep)
      if (session?.user?.familyId) {
        import("@/store/familyStore").then(({ useFamilyStore }) => {
          const store = useFamilyStore.getState();
          store.setFamilyId(session.user.familyId!);
          // Hydrate tasks / meals / finance from the backend. No-op in demo mode.
          pullAllData(session.user.familyId!, (patch) =>
            useFamilyStore.setState(patch as any),
          );
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

  return (
    <AuthContext.Provider value={{ user, loading, signOut, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

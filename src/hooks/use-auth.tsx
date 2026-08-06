import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { backend, type Session } from "@/services";

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signUp: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = backend.auth.onAuthStateChange(setSession);
    backend.auth
      .getSession()
      .then(setSession)
      .finally(() => setLoading(false));
    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      signIn: async (username, password) => {
        await backend.auth.signIn(username, password);
      },
      signUp: async (username, password) => {
        await backend.auth.signUp(username, password);
      },
      signOut: async () => {
        await backend.auth.signOut();
      },
    }),
    [session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}

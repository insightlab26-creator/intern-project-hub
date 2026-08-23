import { createContext, useContext } from "react";
import type { UserProfile } from "../../services/authService";

export type AuthContextValue = {
  profile: UserProfile | null;
  isLoading: boolean;
  signInCurrentUser: (email: string, password: string) => Promise<UserProfile>;
  signOutCurrentUser: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider.");
  return context;
}

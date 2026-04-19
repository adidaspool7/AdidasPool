"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";

// ============================================
// ROLE TYPES
// ============================================

export type UserRole = "candidate" | "hr";

interface RoleContextType {
  role: UserRole | null;
  setRole: (role: UserRole) => void;
  clearRole: () => void;
  isLoading: boolean;
  userEmail: string | null;
  userName: string | null;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

// ============================================
// ROLE PROVIDER
// Sources role from Supabase app_metadata.role (server-set, immutable from client).
// Falls back to user_metadata.role for backwards compatibility.
// clearRole → supabase.auth.signOut()
// ============================================

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<UserRole | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate from Supabase session on mount
  useEffect(() => {
    const supabase = createClient();

    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const rawRole = user.app_metadata?.role ?? user.user_metadata?.role;
        if (rawRole === "candidate" || rawRole === "hr") {
          setRoleState(rawRole);
        }
        setUserEmail(user.email ?? null);
        setUserName(
          user.user_metadata?.full_name ??
          user.user_metadata?.name ??
          user.email ??
          null
        );
      }
      setIsLoading(false);
    }

    loadUser();

    // Listen for auth state changes (sign-in, sign-out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const rawRole =
          session.user.app_metadata?.role ?? session.user.user_metadata?.role;
        setRoleState(
          rawRole === "candidate" || rawRole === "hr" ? rawRole : null
        );
        setUserEmail(session.user.email ?? null);
        setUserName(
          session.user.user_metadata?.full_name ??
          session.user.user_metadata?.name ??
          session.user.email ??
          null
        );
      } else {
        setRoleState(null);
        setUserEmail(null);
        setUserName(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const setRole = useCallback(
    async (newRole: UserRole) => {
      const res = await fetch("/api/me/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        setRoleState(newRole);
      }
    },
    []
  );

  const clearRole = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setRoleState(null);
    setUserEmail(null);
    setUserName(null);
    // Hard navigation to clear all stale cookies / middleware cache
    window.location.href = "/";
  }, []);

  return (
    <RoleContext.Provider
      value={{ role, setRole, clearRole, isLoading, userEmail, userName }}
    >
      {children}
    </RoleContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

export function useRole() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return context;
}

"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

// ============================================
// ROLE TYPES
// ============================================

export type UserRole = "candidate" | "hr";

interface RoleContextType {
  role: UserRole | null;
  setRole: (role: UserRole) => void;
  clearRole: () => void;
  isLoading: boolean;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

const STORAGE_KEY = "ti_platform_role";

// ============================================
// ROLE PROVIDER
// Persists the selected role in localStorage.
// Will be replaced by proper RBAC auth later.
// ============================================

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Hydrate from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "candidate" || stored === "hr") {
      setRoleState(stored);
    }
    setIsLoading(false);
  }, []);

  const setRole = (newRole: UserRole) => {
    localStorage.setItem(STORAGE_KEY, newRole);
    setRoleState(newRole);
  };

  const clearRole = () => {
    localStorage.removeItem(STORAGE_KEY);
    setRoleState(null);
    router.push("/");
  };

  return (
    <RoleContext.Provider value={{ role, setRole, clearRole, isLoading }}>
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

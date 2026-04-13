"use client";

import type { ReactNode } from "react";
import { RoleProvider } from "@client/components/providers/role-provider";

/**
 * Client-side providers wrapper.
 * Add new providers here as the app grows (e.g., auth, theme).
 */
export function Providers({ children }: { children: ReactNode }) {
  return <RoleProvider>{children}</RoleProvider>;
}

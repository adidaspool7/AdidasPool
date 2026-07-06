"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { RoleProvider } from "@client/components/providers/role-provider";

/**
 * Client-side providers wrapper.
 * Add new providers here as the app grows (e.g., auth, theme).
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <RoleProvider>{children}</RoleProvider>
    </ThemeProvider>
  );
}

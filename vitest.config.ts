import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      reportsDirectory: "./coverage",
      include: ["src/server/**/*.ts", "src/lib/**/*.ts"],
      exclude: [
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/*.d.ts",
        "src/server/infrastructure/database/supabase-client.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@server": path.resolve(__dirname, "./src/server"),
      "@client": path.resolve(__dirname, "./src/client"),
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

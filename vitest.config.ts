import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      // Frontend: jsdom + testing-library matchers, vitest globals.
      {
        plugins: [react()],
        test: {
          name: "app",
          environment: "jsdom",
          globals: true,
          setupFiles: ["./app/test/setup.ts"],
          include: ["app/**/*.{test,spec}.{ts,tsx}"],
        },
        resolve: {
          alias: { "@": path.resolve(import.meta.dirname!, "./app") },
        },
      },
      // Backend: plain node environment; tests import from "vitest"
      // explicitly (api/tsconfig.json doesn't load vitest globals types).
      {
        test: {
          name: "api",
          environment: "node",
          include: ["api/**/*.{test,spec}.ts"],
        },
      },
    ],
  },
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname!, "./app") },
  },
});

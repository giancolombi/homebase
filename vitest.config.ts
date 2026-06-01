import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./app/test/setup.ts"],
    include: ["app/**/*.{test,spec}.{ts,tsx}", "api/**/*.{test,spec}.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname!, "./app") },
  },
});

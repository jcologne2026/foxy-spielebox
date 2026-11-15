import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// base: Die App läuft später unter https://jcologne2026.github.io/foxy-spielebox/ (SPEC §10)
export default defineConfig({
  base: "/foxy-spielebox/",
  plugins: [react()],
  test: {
    environment: "node",
  },
});

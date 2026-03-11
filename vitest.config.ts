import { defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    include: ["server/**/*.test.ts", "server/**/*.spec.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      include: ["server/**/*.ts"],
      exclude: [
        // Test files themselves
        "server/**/*.test.ts",
        "server/**/*.spec.ts",
        // Server entry-point — only exercises at integration level
        "server/_core/index.ts",
        "server/_core/vite.ts",
        // External-dependency glue that requires live services to test
        "server/_core/oauth.ts",
        "server/_core/dataApi.ts",
        "server/_core/imageGeneration.ts",
        "server/_core/map.ts",
        "server/_core/notification.ts",
        "server/_core/patchedFetch.ts",
        "server/_core/voiceTranscription.ts",
        "server/storage.ts",
        // Pure type / declaration files
        "server/_core/types/**",
      ],
      thresholds: {
        lines: 60,
        functions: 55,
        branches: 75,
        statements: 60,
      },
    },
  },
});

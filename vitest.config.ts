import { defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    include: ["lib/server/**/*.test.ts", "lib/server/**/*.spec.ts"],
    exclude: [
      "lib/server/_core/chat.test.ts",
      "lib/server/_core/bodyLimit.test.ts",
      "lib/server/_core/metrics.test.ts",
      "lib/server/_core/rateLimiter.test.ts",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      include: ["lib/server/**/*.ts"],
      exclude: [
        // Test files themselves
        "lib/server/**/*.test.ts",
        "lib/server/**/*.spec.ts",
        // Server entry-point — only exercises at integration level
        "lib/server/_core/index.ts",
        "lib/server/_core/vite.ts",
        // External-dependency glue that requires live services to test
        "lib/server/_core/chat.ts",
        "lib/server/_core/metrics.ts",
        "lib/server/_core/rateLimiter.ts",
        "lib/server/_core/oauth.ts",
        "lib/server/_core/dataApi.ts",
        "lib/server/_core/imageGeneration.ts",
        "lib/server/_core/map.ts",
        "lib/server/_core/notification.ts",
        "lib/server/_core/patchedFetch.ts",
        "lib/server/_core/sdk.ts",
        "lib/server/_core/voiceTranscription.ts",
        "lib/server/storage.ts",
        "lib/server/controllers/chatController.ts",
        "lib/server/services/conversationMemory.ts",
        // Pure type / declaration files
        "lib/server/_core/types/**",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});

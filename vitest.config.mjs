import { defineConfig } from "vitest/config";

// React testleri: jsdom + Testing Library (görsel/ekran görüntüsü testi yok).
export default defineConfig({
  esbuild: { jsx: "automatic" },
  test: {
    environment: "jsdom",
    include: ["tests/react/**/*.test.{js,jsx}"],
    setupFiles: ["tests/react/setup.js"],
    restoreMocks: true,
    testTimeout: 10000
  }
});

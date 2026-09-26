import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals:     true,
    environment: 'node',
    exclude: [
      '**/node_modules/**',
      '**/.kilo/**',        // ← exclude kilo folder
      '**/dist/**',
    ],
    coverage: {
      reporter: ['text', 'json', 'html'],
    },
  },
});
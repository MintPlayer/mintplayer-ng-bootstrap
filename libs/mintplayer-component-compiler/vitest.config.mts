import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'mintplayer-component-compiler',
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    reporters: ['default'],
  },
});

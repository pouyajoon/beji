import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    globals: true,
    passWithNoTests: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'tests/**',
        '**/*.config.{ts,js}',
        '**/*.d.ts',
        '**/proto/**',
        '**/proto-generate.sh',
        '**/scripts/**',
        '**/.next/**',
        '**/dist/**',
        '**/build/**',
      ],
      include: [
        'app/**/*.{ts,tsx}',
        'components/**/*.{ts,tsx}',
        'hooks/**/*.ts',
        'lib/**/*.{ts,tsx}',
        'src/**/*.{ts,tsx}',
      ],
    },
  },
  resolve: {
    extensionAlias: {
      '.js': ['.ts', '.tsx', '.js'],
    },
  },
});



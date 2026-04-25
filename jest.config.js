const nextJest = require('next/jest');
const createJestConfig = nextJest({ dir: './' });

module.exports = createJestConfig({
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['**/__tests__/**/*.test.tsx', '**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'components/**/*.tsx',
    'lib/**/*.ts',
    '!**/*.d.ts',
  ],
  coverageThreshold: {
    global: { lines: 80 },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
});

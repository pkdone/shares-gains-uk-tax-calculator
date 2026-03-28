const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

const isIntegration = process.env.JEST_INTEGRATION === '1';

/** @type {import('jest').Config} */
const customJestConfig = {
  coverageProvider: 'v8',
  modulePathIgnorePatterns: ['<rootDir>/.next/'],
  setupFiles: ['<rootDir>/src/test/jest-setup.ts'],
  testEnvironment: 'node',
  testMatch: isIntegration
    ? ['<rootDir>/src/test/integration/**/*.int.test.ts']
    : ['<rootDir>/src/test/unit/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};

module.exports = createJestConfig(customJestConfig);

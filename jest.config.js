/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  testMatch: ['**/*.test.ts'],
  setupFiles: ['<rootDir>/src/tests/setup.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: './tsconfig.test.json',
      useESM: false
    }]
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx']
}; 
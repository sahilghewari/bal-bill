module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'controllers/**/*.js',
    'models/**/*.js',
    'utils/**/*.js',
    'middleware/**/*.js',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      branches: 8,
      functions: 10,
      lines: 15,
      statements: 15,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
};

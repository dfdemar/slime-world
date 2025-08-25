module.exports = {
  // Test environment configuration
  projects: [
    {
      displayName: 'unit',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/src/tests/unit/**/*.test.js'],
      setupFilesAfterEnv: ['<rootDir>/src/tests/setup/jest.setup.js'],
      collectCoverageFrom: [
        '<rootDir>/src/js/**/*.js',
        '!<rootDir>/src/js/events.js',
        '!<rootDir>/src/js/main.js'
      ]
    },
    {
      displayName: 'browser',
      preset: 'jest-puppeteer',
      testMatch: ['<rootDir>/src/tests/browser/**/*.test.js'],
      setupFilesAfterEnv: ['<rootDir>/src/tests/setup/jest.setup.js']
    }
  ],

  // Coverage configuration
  collectCoverage: false, // Disable initially to focus on setup
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'html', 'lcov'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },

  // Test execution settings
  testTimeout: 30000,
  verbose: true,
  bail: false,

  // Root directory
  rootDir: '.'
};

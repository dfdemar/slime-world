module.exports = {
  // Use jsdom environment to simulate browser DOM
  testEnvironment: 'jsdom',
  
  // Test file patterns
  testMatch: [
    '<rootDir>/src/tests/**/*.test.js',
    '<rootDir>/src/tests/**/*.spec.js'
  ],
  
  // Module paths for easier imports
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  
  // Setup files to run before tests
  setupFilesAfterEnv: [],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/js/**/*.js',
    '!src/js/main.js',
    '!src/js/events.js'
  ],
  
  // Coverage output directory
  coverageDirectory: 'coverage',
  
  // Coverage reporters
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/tests/'
  ],
  
  // Transform configuration for ES modules
  transform: {},
  
  // Verbose output
  verbose: true
};
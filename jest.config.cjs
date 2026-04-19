module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/server'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.js', '**/?(*.)+(spec|test).ts', '**/?(*.)+(spec|test).js'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    'server/**/*.{js,cjs,mjs}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!server/server.js',
  ],
};

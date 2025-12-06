module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/integration/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/__tests__/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  testTimeout: 30000, // Aumentar el tiempo de espera para las pruebas de integración
  
  // Configuración específica para pruebas de integración
  globalSetup: '<rootDir>/src/__tests__/integration/setup.ts',
  globalTeardown: '<rootDir>/src/__tests__/integration/teardown.ts',
  testEnvironment: '<rootDir>/src/__tests__/integration/test-environment.ts',
};

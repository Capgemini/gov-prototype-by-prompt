import type { Config } from 'jest';

const config: Config = {
    collectCoverage: true,
    collectCoverageFrom: [
        '**/*.{ts,tsx}',
        '!**/node_modules/**',
        '!**/vendor/**',
        '!**/test-connection.ts',
        '!jest.config.ts',
        '!**/jest/**',
        '!eslint.config.ts',
        '!**/data/**',
    ],
    coverageThreshold: {
        global: {
            branches: 85,
            functions: 85,
            lines: 85,
            statements: 85,
        },
    },
    globalSetup: '<rootDir>/jest/globalSetup.ts',
    globalTeardown: '<rootDir>/jest/globalTeardown.ts',
    maxWorkers: 1,
    preset: 'ts-jest',
    setupFilesAfterEnv: ['<rootDir>/jest/setupFile.ts'],
    silent: true,
    testTimeout: 30000,
    verbose: false,
};

export default config;

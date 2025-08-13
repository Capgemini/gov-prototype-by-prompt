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
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70,
        },
    },
    globalSetup: '<rootDir>/jest/globalSetup.ts',
    globalTeardown: '<rootDir>/jest/globalTeardown.ts',
    maxWorkers: 4,
    preset: 'ts-jest',
    setupFilesAfterEnv: ['<rootDir>/jest/setupFile.ts'],
    silent: false,
    testTimeout: 30000,
    verbose: false,
};

export default config;

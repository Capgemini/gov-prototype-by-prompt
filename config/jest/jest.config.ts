import type { Config } from 'jest';

const config: Config = {
    collectCoverage: true,
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!**/node_modules/**',
        '!**/vendor/**',
        '!**/test-connection.ts',
        '!jest.config.ts',
        '!**/config/**',
        '!eslint.config.ts',
        '!**/data/**',
        '!src/database/connection/mongoose.ts',
        '!server.ts',
    ],
    coverageThreshold: {
        global: {
            branches: 90,
            functions: 90,
            lines: 90,
            statements: 90,
        },
    },
    globalSetup: '<rootDir>/config/jest/globalSetup.ts',
    globalTeardown: '<rootDir>/config/jest/globalTeardown.ts',
    maxWorkers: 1,
    rootDir: '../../',
    setupFilesAfterEnv: ['<rootDir>/config/jest/setupFile.ts'],
    silent: true,
    testMatch: ['<rootDir>/src/**/*.test.ts'],
    testTimeout: 30000,
    // sanitize-html's htmlparser2 dependency ships ESM-only JS, so it needs
    // transpiling (transpile-only, not type-checked) like our own TS files
    transform: {
        '^.+\\.jsx?$': ['ts-jest', { isolatedModules: true }],
        '^.+\\.tsx?$': 'ts-jest',
    },
    transformIgnorePatterns: [
        '/node_modules/(?!(htmlparser2|domhandler|domutils|dom-serializer|entities|domelementtype)/)',
    ],
    verbose: false,
};

export default config;

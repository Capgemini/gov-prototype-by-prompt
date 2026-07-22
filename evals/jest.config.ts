import type { Config } from 'jest';

const config: Config = {
    maxWorkers: 4,
    setupFilesAfterEnv: ['dotenv/config', '<rootDir>/setupFile.ts'],
    silent: false,
    testMatch: ['<rootDir>/**/*.test.ts'],
    testTimeout: 60000,
    // sanitize-html's htmlparser2 dependency ships ESM-only JS, so it needs
    // transpiling (transpile-only, not type-checked) like our own TS files
    transform: {
        '^.+\\.jsx?$': ['ts-jest', { isolatedModules: true }],
        '^.+\\.tsx?$': 'ts-jest',
    },
    transformIgnorePatterns: [
        '/node_modules/(?!(htmlparser2|domhandler|domutils|dom-serializer|entities|domelementtype)/)',
    ],
    verbose: true,
};

export default config;

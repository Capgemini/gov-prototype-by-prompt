import type { Config } from 'jest';

const config: Config = {
    globals: {
        CACHE_FILE: `llm-cache-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
    },
    maxWorkers: 1,
    preset: 'ts-jest',
    setupFilesAfterEnv: ['dotenv/config', '<rootDir>/setupFile.ts'],
    silent: false,
    testMatch: ['<rootDir>/**/*.test.ts'],
    testTimeout: 60000,
    verbose: true,
};

export default config;

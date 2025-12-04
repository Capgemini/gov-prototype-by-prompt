import type { Config } from 'jest';

const config: Config = {
    maxWorkers: 1,
    preset: 'ts-jest',
    setupFilesAfterEnv: ['dotenv/config', '<rootDir>/setupFile.ts'],
    silent: false,
    testMatch: ['<rootDir>/**/*.test.ts'],
    testTimeout: 60000,
    verbose: true,
};

export default config;

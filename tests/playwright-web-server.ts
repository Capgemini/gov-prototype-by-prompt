import { MongoMemoryServer } from 'mongodb-memory-server';
import { ChildProcess, spawn } from 'node:child_process';

import { exampleEnvVars } from '../src/validationSchemas/env';
import {
    PLAYWRIGHT_MONGO_DB_NAME,
    PLAYWRIGHT_MONGO_PORT,
    PLAYWRIGHT_MONGODB_URI,
} from './playwright-test-env';

let appProcess: ChildProcess | null = null;
let mongoInstance: MongoMemoryServer | null = null;
let shuttingDown = false;

async function shutdown(exitCode = 0): Promise<never> {
    if (shuttingDown) {
        process.exit(exitCode);
    }

    shuttingDown = true;

    if (appProcess?.pid && !appProcess.killed) {
        appProcess.kill('SIGTERM');
    }

    if (mongoInstance) {
        await mongoInstance.stop();
        mongoInstance = null;
    }

    process.exit(exitCode);
}

async function start(): Promise<void> {
    mongoInstance = await MongoMemoryServer.create({
        instance: {
            dbName: PLAYWRIGHT_MONGO_DB_NAME,
            port: PLAYWRIGHT_MONGO_PORT,
        },
    });

    const env = {
        ...process.env,
        ...exampleEnvVars,
        MONGODB_URI: PLAYWRIGHT_MONGODB_URI,
        NODE_ENV: 'test',
    };

    appProcess = spawn('npm', ['run', 'start'], {
        env,
        stdio: 'inherit',
    });

    console.log(`Playwright MongoMemoryServer URI: ${PLAYWRIGHT_MONGODB_URI}`);

    appProcess.on('exit', (code, signal) => {
        if (shuttingDown) {
            return;
        }

        console.error(
            `App server exited unexpectedly (code=${String(code)} signal=${String(signal)})`
        );
        void shutdown(code ?? 1);
    });

    process.on('SIGINT', () => {
        void shutdown(0);
    });

    process.on('SIGTERM', () => {
        void shutdown(0);
    });
}

void start().catch(async (error: unknown) => {
    console.error('Failed to start Playwright web server:', error);
    await shutdown(1);
});

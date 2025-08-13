import { MongoMemoryServer } from 'mongodb-memory-server';

import { exampleEnvVars } from '../src/validationSchemas/env';

export = async function globalSetup() {
    // Config to decide if an mongodb-memory-server instance should be used
    // it's needed in global space, because we don't want to create a new instance every test-suite
    const instance = await MongoMemoryServer.create({});
    global.__MONGOINSTANCE = instance;

    // Setup initial environment variables
    process.env = {
        ...process.env,
        ...exampleEnvVars,
        MONGODB_URI: instance.getUri(),
        NODE_ENV: 'test',
    };
};

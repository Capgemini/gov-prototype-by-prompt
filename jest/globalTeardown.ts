import { MongoMemoryServer } from 'mongodb-memory-server';

declare global {
    var __MONGOINSTANCE: MongoMemoryServer;
}

export = async function globalTeardown() {
    const instance: MongoMemoryServer = global.__MONGOINSTANCE;
    await instance.stop();
};

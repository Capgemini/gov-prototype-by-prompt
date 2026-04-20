import mongoose from 'mongoose';

import { user1 } from '../jest/mockTestData';
import { UserModel } from '../src/database/models/user-model';
import { PLAYWRIGHT_MONGODB_URI } from './playwright-web-server';

export async function disconnectPlaywrightDb(): Promise<void> {
    if (
        mongoose.connection.readyState === mongoose.ConnectionStates.connected
    ) {
        await mongoose.disconnect();
    }
}

export async function resetDatabase(): Promise<void> {
    await connectToPlaywrightDb();
    await mongoose.connection.db?.dropDatabase();
    await UserModel.store(user1);
}

async function connectToPlaywrightDb(): Promise<void> {
    if (
        mongoose.connection.readyState === mongoose.ConnectionStates.connected
    ) {
        return;
    }

    await mongoose.connect(PLAYWRIGHT_MONGODB_URI);
}

import mongoose from 'mongoose';

import { UserModel } from '../../src/database/models/user-model';
import { WorkspaceModel } from '../../src/database/models/workspace-model';
import { user1, user1PersonalWorkspace } from '../mockTestData';
import { PLAYWRIGHT_MONGODB_URI } from './playwright-test-env';

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
    await WorkspaceModel.store(user1PersonalWorkspace);
}

async function connectToPlaywrightDb(): Promise<void> {
    if (
        mongoose.connection.readyState === mongoose.ConnectionStates.connected
    ) {
        return;
    }

    await mongoose.connect(PLAYWRIGHT_MONGODB_URI);
}

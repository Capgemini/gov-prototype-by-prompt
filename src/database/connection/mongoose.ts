import mongoose from 'mongoose';

import { getEnvironmentVariables } from '../../utils';

let isConnected = false;
const envVars = getEnvironmentVariables();

export async function connectToDatabase(): Promise<void> {
    if (isConnected) {
        if (envVars.NODE_ENV !== 'test') {
            console.log('Already connected to MongoDB');
        }
        return;
    }

    try {
        await mongoose.connect(envVars.MONGODB_URI);
        isConnected = true;
        console.log(
            'Successfully connected to MongoDB database:',
            mongoose.connection.name
        );
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        throw error;
    }
}

export async function disconnectFromDatabase(): Promise<void> {
    if (!isConnected) {
        console.log('Not connected to MongoDB');
        return;
    }

    try {
        await mongoose.disconnect();
        isConnected = false;
        console.log('Successfully disconnected from MongoDB');
    } catch (error) {
        console.error('Error disconnecting from MongoDB:', error);
        throw error;
    }
}

export async function dropDatabase(): Promise<boolean> {
    if (getConnectionStatus()) {
        return (await mongoose.connection.db?.dropDatabase()) ?? false;
    }
    return false;
}

export function getConnectionStatus(): boolean {
    return isConnected;
}

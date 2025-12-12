import { connectToDatabase } from '../src/database';
// import { Prototype, User, Workspace } from '../src/types/schemas/index';

export function down(): Promise<void> {
    throw new Error('Not implemented');
}

export async function up(): Promise<void> {
    void initializeDatabase();
    // Write migration here
}

async function initializeDatabase() {
    try {
        await connectToDatabase();
        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Failed to initialize database:', error);
        process.exit(1);
    }
}

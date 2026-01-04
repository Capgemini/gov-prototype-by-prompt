import { connectToDatabase } from '../src/database';
// import { Prototype, User, Workspace } from '../src/types/schemas/index';

export function down(): Promise<void> {
    throw new Error('Not implemented');
}

export async function up(): Promise<void> {
    await connectToDatabase();
    // Write migration here
}

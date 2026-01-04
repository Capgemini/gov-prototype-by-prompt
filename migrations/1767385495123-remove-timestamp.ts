import { connectToDatabase } from '../src/database';
import { Prototype } from '../src/types/schemas/index';

export function down(): Promise<void> {
    throw new Error('Not implemented');
}

export async function up(): Promise<void> {
    await connectToDatabase();
    await Prototype.updateMany(
        {},
        { $unset: { timestamp: '' } },
        { strict: false }
    );
}

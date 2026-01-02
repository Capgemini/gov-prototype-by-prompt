import { connectToDatabase } from '../src/database';
import { User } from '../src/types/schemas/index';

export function down(): Promise<void> {
    throw new Error('Not implemented');
}

export async function up(): Promise<void> {
    void initializeDatabase();
    const users = await User.find({});
    for (const user of users) {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        user.isActive ??= true;
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        user.isAdmin ??= false;
        await user.save({ timestamps: false, validateBeforeSave: false });
    }

    // Make sure there is at least one admin user
    const adminUserCount = await User.countDocuments({ isAdmin: true });
    if (adminUserCount === 0) {
        const firstUser = await User.findOne({});
        if (firstUser) {
            firstUser.isAdmin = true;
            await firstUser.save({
                timestamps: false,
                validateBeforeSave: false,
            });
            console.log(
                `No admin user found. Set user with email ${firstUser.email} as admin.`
            );
        } else {
            console.warn('No users found in the database to set as admin.');
        }
    } else {
        console.log(
            `There's already ${String(adminUserCount)} admin user${adminUserCount === 1 ? '' : 's'} in the database.`
        );
    }
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

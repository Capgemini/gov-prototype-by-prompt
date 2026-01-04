import { connectToDatabase } from '../src/database';
import { User } from '../src/types/schemas/index';

export function down(): Promise<void> {
    throw new Error('Not implemented');
}

export async function up(): Promise<void> {
    await connectToDatabase();
    await User.updateMany(
        {
            $or: [
                { isActive: { $exists: false } },
                { isAdmin: { $exists: false } },
            ],
        },
        [
            {
                $set: {
                    isActive: { $ifNull: ['$isActive', true] },
                    isAdmin: { $ifNull: ['$isAdmin', false] },
                },
            },
        ],
        { timestamps: false, updatePipeline: true }
    );

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

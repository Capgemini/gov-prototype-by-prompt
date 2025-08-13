import {
    connectToDatabase,
    disconnectFromDatabase,
} from './connection/mongoose';
import { PrototypeModel, UserModel, WorkspaceModel } from './models';

async function testDatabaseConnection() {
    try {
        console.log('Testing database connection...');

        // Connect to database
        await connectToDatabase();
        console.log('✅ Database connection successful');

        // Test User operations
        console.log('\nTesting User operations...');
        const testUser = await UserModel.store({
            email: 'test@example.com',
            name: 'Test User',
            passwordHash: 'hashed-password',
            personalWorkspaceId: 'test-workspace-1',
        });
        console.log('\nTesting User operations...');
        const testUser2 = await UserModel.store({
            email: 'test2@example.com',
            name: 'Test User 2',
            passwordHash: 'hashed-password',
            personalWorkspaceId: 'test-workspace-2',
        });
        console.log('✅ User created:', testUser.id);
        console.log('✅ User2 created:', testUser2.id);

        const foundUser = await UserModel.getByEmail('test@example.com');
        console.log('✅ User found by email:', foundUser?.name);

        // Test Workspace operations
        console.log('\nTesting Workspace operations...');
        const testWorkspace = await WorkspaceModel.store({
            isPersonalWorkspace: true,
            name: 'Test Workspace',
            userIds: [testUser.id],
        });
        console.log('✅ Workspace created:', testWorkspace.id);

        // Test Prototype operations
        console.log('\nTesting Prototype operations...');
        const testPrototype = await PrototypeModel.store({
            changesMade: '',
            chatHistory: [],
            creatorUserId: testUser.id,
            firstPrompt: 'Test form prompt',
            generatedFrom: 'text',
            json: {
                before_you_start: 'Before you start...',
                description: 'A test form',
                duration: 5,
                explanation: 'This is a test form',
                form_type: 'single',
                questions: [],
                title: 'Test Form',
                what_happens_next: 'What happens next...',
            },
            livePrototypePublic: false,
            livePrototypePublicPassword: '',
            sharedWithUserIds: [],
            timestamp: new Date().toISOString(),
            workspaceId: testWorkspace.id,
        });
        console.log('✅ Prototype created:', testPrototype.id);

        // Test access control
        console.log('\nTesting access control...');
        const canAccess = await PrototypeModel.canUserAccess(
            testUser.id,
            testPrototype.id
        );
        console.log('✅ User can access prototype:', canAccess);

        // Clean up test data
        console.log('\nCleaning up test data...');
        await PrototypeModel.deleteById(testPrototype.id);
        await WorkspaceModel.deleteById(testWorkspace.id);
        await UserModel.deleteById(testUser.id);
        await UserModel.deleteById(testUser2.id);
        console.log('✅ Test data cleaned up');

        console.log('\n🎉 All database tests passed!');
    } catch (error) {
        console.error('❌ Database test failed:', error);
    } finally {
        await disconnectFromDatabase();
        console.log('Database connection closed');
    }
}

// Run the test if this file is executed directly
if (require.main === module) {
    testDatabaseConnection().catch(console.error);
}

export { testDatabaseConnection };

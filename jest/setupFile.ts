import {
    connectToDatabase,
    disconnectFromDatabase,
    dropDatabase,
} from '../src/database';

beforeAll(async () => {
    await connectToDatabase();
});

afterAll(async () => {
    await disconnectFromDatabase();
});

beforeEach(async () => {
    await connectToDatabase();
    await dropDatabase();
});

afterEach(async () => {
    await dropDatabase();
});

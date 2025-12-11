import httpMocks from 'node-mocks-http';

import { allUsers, user1, user2 } from '../../../jest/mockTestData';

let getUserByIdMock: jest.Mock;
let updateUserMock: jest.Mock;

beforeEach(() => {
    jest.resetModules();
    getUserByIdMock = jest.fn().mockImplementation((id: string) => {
        return Promise.resolve(allUsers.find((user) => user.id === id) ?? null);
    });
    updateUserMock = jest.fn();
    jest.doMock('../middleware', () => ({
        verifyAdminUser: jest.fn(),
        verifyUser: jest.fn(),
    }));
    jest.doMock('../../database/mongoose-store', () => ({
        getUserById: getUserByIdMock,
        updateUser: updateUserMock,
    }));
});

afterEach(() => {
    jest.clearAllMocks();
});

describe('handleUpdateUser', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let handleUpdateUser: (req: any, res: any) => Promise<void>;
    beforeEach(async () => {
        ({ handleUpdateUser } = await import('../admin-routes'));
    });

    it('should return 404 if user does not exist', async () => {
        const request = httpMocks.createRequest({
            body: {
                name: 'Test',
                password1: '',
                password2: '',
            },
            method: 'POST',
            params: { id: 'bad-id' },
            user: user1,
        });
        const response = httpMocks.createResponse();
        await handleUpdateUser(request, response);
        expect(response.statusCode).toBe(404);
        expect(response._getJSONData()).toEqual({ message: 'User not found' });
        expect(updateUserMock).not.toHaveBeenCalled();
    });

    it('should return 404 if trying to update other user from non-admin user', async () => {
        const request = httpMocks.createRequest({
            body: {
                name: 'Test',
                password1: '',
                password2: '',
            },
            method: 'POST',
            params: { id: user2.id },
            user: user1,
        });
        const response = httpMocks.createResponse();
        await handleUpdateUser(request, response);
        expect(response.statusCode).toBe(404);
        expect(response._getJSONData()).toEqual({ message: 'User not found' });
        expect(updateUserMock).not.toHaveBeenCalled();
    });

    it.each([
        [{ name: '', password1: '', password2: '' }, 'Enter a name'],
        [{ name: '', password1: '', password2: '' }, 'Create new password'],
        [
            { name: 'A', password1: '', password2: '' },
            'Name must be at least 2 characters',
        ],
        [
            {
                name: '',
                password1: 'abc',
                password2: 'def',
            },
            'The passwords must match',
        ],
        [
            {
                name: '',
                password1: 'short',
                password2: 'short',
            },
            'The password must be at least 12 characters long',
        ],
        [
            {
                name: '',
                password1: 'tyrannosaurus',
                password2: 'tyrannosaurus',
            },
            'The password must contain at least one letter, one number, and one symbol',
        ],
    ])(
        'should validate input and return error: %s',
        async (body, expectedError) => {
            const request = httpMocks.createRequest({
                body,
                method: 'POST',
                params: { id: user1.id },
                user: user1,
            });
            const response = httpMocks.createResponse();
            await handleUpdateUser(request, response);
            expect(response.statusCode).toBe(400);
            expect(JSON.stringify(response._getJSONData())).toContain(
                expectedError
            );
            expect(updateUserMock).not.toHaveBeenCalled();
        }
    );

    it('should update user name successfully for current user', async () => {
        updateUserMock.mockResolvedValueOnce({ ...user1, name: 'New Name' });
        const request = httpMocks.createRequest({
            body: {
                name: 'New Name',
                password1: '',
                password2: '',
            },
            method: 'POST',
            params: { id: user1.id },
            user: user1,
        });
        const response = httpMocks.createResponse();
        await handleUpdateUser(request, response);
        expect(response.statusCode).toBe(200);
        expect(response._getJSONData()).toEqual({
            message: 'User updated successfully',
            name: 'New Name',
            pageTitle: 'Manage your account',
        });
        expect(updateUserMock).toHaveBeenCalled();
    });

    it('should update user name successfully for another user', async () => {
        updateUserMock.mockResolvedValueOnce({ ...user2, name: 'New Name' });
        const request = httpMocks.createRequest({
            body: {
                name: 'New Name',
                password1: '',
                password2: '',
            },
            method: 'POST',
            params: { id: user2.id },
            user: { ...user1, isAdmin: true },
        });
        const response = httpMocks.createResponse();
        await handleUpdateUser(request, response);
        expect(response.statusCode).toBe(200);
        expect(response._getJSONData()).toEqual({
            message: 'User updated successfully',
            name: 'New Name',
            pageTitle: "Manage New Name's account",
        });
        expect(updateUserMock).toHaveBeenCalled();
    });

    it('should update user password successfully', async () => {
        const request = httpMocks.createRequest({
            body: {
                name: '',
                password1: 'Password123!',
                password2: 'Password123!',
            },
            method: 'POST',
            params: { id: user1.id },
            user: user1,
        });
        const response = httpMocks.createResponse();
        await handleUpdateUser(request, response);
        expect(response.statusCode).toBe(200);
        expect(JSON.stringify(response._getJSONData())).toContain(
            'User updated successfully'
        );
        expect(updateUserMock).toHaveBeenCalled();
    });

    it('should reject common passwords', async () => {
        const request = httpMocks.createRequest({
            body: {
                name: '',
                password1: 'Password@123',
                password2: 'Password@123',
            },
            method: 'POST',
            params: { id: user1.id },
            user: user1,
        });
        const response = httpMocks.createResponse();
        await handleUpdateUser(request, response);
        expect(response.statusCode).toBe(400);
        expect(
            (response._getJSONData() as { errors: Record<string, string>[] })
                .errors
        ).toContainEqual(
            expect.objectContaining({
                msg: 'This password is too common',
                path: 'password1',
            })
        );
        expect(updateUserMock).not.toHaveBeenCalled();
    });
});

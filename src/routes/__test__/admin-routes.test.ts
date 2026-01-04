import httpMocks from 'node-mocks-http';

import {
    allUsers,
    user1,
    user2,
    userId1,
    userId2,
} from '../../../jest/mockTestData';

let countActiveAdminUsersMock: jest.Mock;
let countAllUsersMock: jest.Mock;
let countPrototypesByUserIdMock: jest.Mock;
let getAllUsersMock: jest.Mock;
let getUserByIdMock: jest.Mock;
let updateUserMock: jest.Mock;

beforeEach(() => {
    jest.resetModules();
    countActiveAdminUsersMock = jest.fn().mockResolvedValue(5);
    countAllUsersMock = jest.fn().mockResolvedValue(allUsers.length);
    countPrototypesByUserIdMock = jest
        .fn()
        .mockImplementation((userId: string) => {
            switch (userId) {
                case userId1.toString():
                    return Promise.resolve(3);
                case userId2.toString():
                    return Promise.resolve(2);
                default:
                    return Promise.resolve(0);
            }
        });
    getAllUsersMock = jest.fn().mockResolvedValue(allUsers);
    getUserByIdMock = jest.fn().mockImplementation((id: string) => {
        return Promise.resolve(allUsers.find((user) => user.id === id) ?? null);
    });
    updateUserMock = jest.fn();
    jest.doMock('../middleware', () => ({
        verifyAdminUser: jest.fn(),
        verifyUser: jest.fn(),
    }));
    jest.doMock('../../database/mongoose-store', () => ({
        countActiveAdminUsers: countActiveAdminUsersMock,
        countAllUsers: countAllUsersMock,
        countPrototypesByUserId: countPrototypesByUserIdMock,
        getAllUsers: getAllUsersMock,
        getUserById: getUserByIdMock,
        updateUser: updateUserMock,
    }));
});

afterEach(() => {
    jest.clearAllMocks();
});

describe('renderUsersPage', () => {
    const defaultQuery = {
        isActive: 'all',
        isAdmin: 'all',
        page: '1',
        perPage: '10',
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let renderUsersPage: (req: any, res: any) => Promise<void>;
    beforeEach(async () => {
        ({ renderUsersPage } = await import('../admin-routes'));
    });

    it('should render users.njk with correct user data', async () => {
        const request = httpMocks.createRequest({
            method: 'GET',
            query: defaultQuery,
            url: '/admin/user',
            user: user1,
        });
        const response = httpMocks.createResponse();

        await renderUsersPage(request, response);

        expect(response.statusCode).toBe(200);
        expect(response._getRenderView()).toBe('users.njk');
        const data = response._getRenderData() as {
            countUsers: number;
            header: { text: string }[];
            userRows: { html: string }[][];
        };
        expect(data.countUsers).toBe(2);
        expect(data.header[0].text).toBe('Name');
        expect(data.userRows[0][0].html).toContain(user1.email);
    });

    it('should redirect if query parameters are invalid', async () => {
        const request = httpMocks.createRequest({
            method: 'GET',
            query: {
                isActive: 'invalid',
                isAdmin: 'invalid',
                page: 'invalid',
                perPage: 'invalid',
            },
            url: '/admin/user',
            user: user1,
        });
        const response = httpMocks.createResponse();

        await renderUsersPage(request, response);

        expect(response.statusCode).toBe(302); // redirect
        expect(response._getRedirectUrl()).toContain('/admin/user?');
    });

    it('should redirect if query parameters are missing', async () => {
        const request = httpMocks.createRequest({
            method: 'GET',
            query: {},
            url: '/admin/user',
            user: user1,
        });
        const response = httpMocks.createResponse();

        await renderUsersPage(request, response);

        expect(response.statusCode).toBe(302); // redirect
        expect(response._getRedirectUrl()).toContain('/admin/user?');
    });

    it('should render users.njk with pagination', async () => {
        const request = httpMocks.createRequest({
            method: 'GET',
            query: {
                ...defaultQuery,
                page: '1',
                perPage: '1',
            },
            url: '/admin/user',
            user: user1,
        });
        const response = httpMocks.createResponse();

        await renderUsersPage(request, response);

        expect(response.statusCode).toBe(200);
        expect(response._getRenderView()).toBe('users.njk');
        const data = response._getRenderData() as {
            countUsers: number;
            itemsPerPage: string;
            paginationItems: object[];
            paginationNextHref: string;
            paginationPreviousHref: string;
            showPagination: boolean;
        };
        expect(data.countUsers).toBe(2);
        expect(data.itemsPerPage).toBe('1');
        expect(data.paginationItems.length).toBeGreaterThan(0);
        expect(data.paginationNextHref).toContain('page=2&perPage=1');
        expect(data.paginationPreviousHref).toBe('');
        expect(data.showPagination).toBe(true);
    });

    it('should render users.njk with no pagination', async () => {
        const request = httpMocks.createRequest({
            method: 'GET',
            query: {
                ...defaultQuery,
                page: '1',
                perPage: '10',
            },
            url: '/admin/user',
            user: user1,
        });
        const response = httpMocks.createResponse();

        await renderUsersPage(request, response);

        expect(response.statusCode).toBe(200);
        expect(response._getRenderView()).toBe('users.njk');
        const data = response._getRenderData() as {
            countUsers: number;
            itemsPerPage: string;
            paginationItems: object[];
            paginationNextHref: string;
            paginationPreviousHref: string;
            showPagination: boolean;
        };
        expect(data.countUsers).toBe(2);
        expect(data.itemsPerPage).toBe('10');
        expect(data.paginationItems.length).toBe(0);
        expect(data.paginationNextHref).toBe('');
        expect(data.paginationPreviousHref).toBe('');
        expect(data.showPagination).toBe(false);
    });

    it.each([
        ['all', 'all', 9],
        ['all', 'true', 3],
        ['all', 'false', 6],
        ['true', 'all', 6],
        ['true', 'true', 2],
        ['true', 'false', 4],
        ['false', 'all', 3],
        ['false', 'true', 1],
        ['false', 'false', 2],
    ])(
        'should render users.njk filtered on isActive=%s and isAdmin=%s',
        async (isActive, isAdmin, countUsers) => {
            getAllUsersMock.mockResolvedValueOnce([
                { ...user1, isActive: true, isAdmin: true },
                { ...user1, isActive: true, isAdmin: true },
                { ...user2, isActive: true, isAdmin: false },
                { ...user2, isActive: true, isAdmin: false },
                { ...user1, isActive: true, isAdmin: false },
                { ...user1, isActive: true, isAdmin: false },
                { ...user2, isActive: false, isAdmin: true },
                { ...user1, isActive: false, isAdmin: false },
                { ...user2, isActive: false, isAdmin: false },
            ]);
            const request = httpMocks.createRequest({
                method: 'GET',
                query: {
                    ...defaultQuery,
                    isActive: isActive,
                    isAdmin: isAdmin,
                },
                url: '/admin/user',
                user: user1,
            });
            const response = httpMocks.createResponse();

            await renderUsersPage(request, response);

            expect(response.statusCode).toBe(200);
            expect(response._getRenderView()).toBe('users.njk');
            const data = response._getRenderData() as {
                countUsers: number;
                isActive: string;
                isAdmin: string;
                totalUsers: number;
            };
            expect(data.countUsers).toBe(countUsers);
            expect(data.isActive).toBe(isActive);
            expect(data.isAdmin).toBe(isAdmin);
        }
    );
});

describe('renderManageUserPage', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let renderManageUserPage: (req: any, res: any) => Promise<void>;
    beforeEach(async () => {
        ({ renderManageUserPage } = await import('../admin-routes'));
    });

    it('should render the manage-user.njk template for the current user', async () => {
        const request = httpMocks.createRequest({
            method: 'GET',
            params: { id: user1.id },
            url: `/admin/user/${user1.id}`,
            user: user1,
        });
        const response = httpMocks.createResponse();

        await renderManageUserPage(request, response);

        expect(response.statusCode).toBe(200);
        expect(response._getRenderView()).toBe('manage-user.njk');
        expect(response._getRenderData()).toEqual({
            isSelf: true,
            user: user1,
        });
    });

    it('should render the manage-user.njk template for another user (admin)', async () => {
        const request = httpMocks.createRequest({
            method: 'GET',
            params: { id: user2.id },
            url: `/admin/user/${user2.id}`,
            user: { ...user1, isAdmin: true },
        });
        const response = httpMocks.createResponse();

        await renderManageUserPage(request, response);

        expect(response.statusCode).toBe(200);
        expect(response._getRenderView()).toBe('manage-user.njk');
        expect(response._getRenderData()).toEqual({
            isSelf: false,
            user: user2,
        });
    });

    it('should render user-not-found.njk if user does not exist', async () => {
        const request = httpMocks.createRequest({
            method: 'GET',
            params: { id: 'non-existent-id' },
            url: '/admin/user/non-existent-id',
            user: user1,
        });
        const response = httpMocks.createResponse();

        await renderManageUserPage(request, response);

        expect(response.statusCode).toBe(404);
        expect(response._getRenderView()).toBe('user-not-found.njk');
    });
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
        [
            {
                isActive: true,
                isAdmin: true,
                name: '',
                password1: '',
                password2: '',
            },
            'Enter a name',
        ],
        [{ name: '', password1: '', password2: '' }, 'Create a password'],
        [
            {
                isActive: true,
                isAdmin: true,
                name: '',
                password1: '',
                password2: '',
            },
            'Create a password',
        ],
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
        'should validate input and return error when updating self as non-admin user %s',
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

    it('should update user name only successfully for current non-admin user', async () => {
        updateUserMock.mockResolvedValueOnce({ ...user1, name: 'New Name' });
        const request = httpMocks.createRequest({
            body: {
                isActive: true,
                isAdmin: true,
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
        expect(updateUserMock).toHaveBeenCalledWith(user1.id, {
            name: 'New Name',
        });
    });

    it('should update user name and status successfully for another user', async () => {
        updateUserMock.mockResolvedValueOnce({ ...user2, name: 'New Name' });
        const request = httpMocks.createRequest({
            body: {
                isActive: true,
                isAdmin: true,
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
        expect(updateUserMock).toHaveBeenCalledWith(user2.id, {
            isActive: true,
            isAdmin: true,
            name: 'New Name',
        });
    });

    it.each([
        [true, true, undefined],
        [true, false, '/user/manage-account'],
        [false, true, '/'],
        [false, false, '/'],
    ])(
        'should redirect after updating current user status to isActive=%s and isAdmin=%s',
        async (isActive, isAdmin, redirect) => {
            updateUserMock.mockResolvedValueOnce(user1);
            const request = httpMocks.createRequest({
                body: {
                    isActive: isActive,
                    isAdmin: isAdmin,
                },
                method: 'POST',
                params: { id: user1.id },
                user: { ...user1, isAdmin: true },
            });
            const response = httpMocks.createResponse();
            await handleUpdateUser(request, response);
            expect(response.statusCode).toBe(200);
            expect(response._getJSONData()).toEqual({
                message: 'User updated successfully',
                name: user1.name,
                pageTitle: `Manage your account`,
                redirect: redirect,
            });
            expect(updateUserMock).toHaveBeenCalledWith(user1.id, {
                isActive: isActive,
                isAdmin: isAdmin,
            });
        }
    );

    it('should update current user password successfully', async () => {
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
        expect(updateUserMock).toHaveBeenCalledWith(user1.id, {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            passwordHash: expect.any(String),
        });
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

    it.each([
        [true, false],
        [false, true],
        [false, false],
        ['true', 'false'],
        ['false', 'true'],
        ['false', 'false'],
    ])(
        'should not allow setting the last admin user to isActive=%s and isAdmin=%s',
        async (isActive, isAdmin) => {
            getUserByIdMock.mockResolvedValueOnce({
                ...user1,
                isActive: true,
                isAdmin: true,
            });
            countActiveAdminUsersMock.mockResolvedValueOnce(1);
            const request = httpMocks.createRequest({
                body: {
                    isActive: isActive,
                    isAdmin: isAdmin,
                },
                method: 'POST',
                params: { id: user1.id },
                user: { ...user1, isAdmin: true },
            });
            const response = httpMocks.createResponse();
            await handleUpdateUser(request, response);
            expect(response.statusCode).toBe(400);
            const errors = (
                response._getJSONData() as {
                    errors: Record<string, string>[];
                }
            ).errors;
            expect(errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        msg: 'There must be at least one active admin user.',
                        path: 'isActive',
                    }),
                    expect.objectContaining({
                        msg: 'There must be at least one active admin user.',
                        path: 'isAdmin',
                    }),
                ])
            );
            expect(updateUserMock).not.toHaveBeenCalled();
        }
    );
});

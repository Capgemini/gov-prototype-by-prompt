import mongoose from 'mongoose';
import httpMocks from 'node-mocks-http';

import {
    allUsers,
    allWorkspaces,
    user1,
    user1PersonalWorkspaceId,
    user2,
    userId1,
    userId2,
    workspaceId3,
} from '../../../jest/mockTestData';
import { IUser, IWorkspace } from '../../types';

// Mocking middleware and utilities
let bcryptCompareMock: jest.Mock;
let getEnvironmentVariablesMock: jest.Mock;
let canUserAccessWorkspaceMock: jest.Mock;
let countActiveAdminUsersMock: jest.Mock;
let countPrototypesByUserIdAndWorkspaceIdMock: jest.Mock;
let countWorkspacesByUserIdMock: jest.Mock;
let getAllUsersMock: jest.Mock;
let getUserByEmailMock: jest.Mock;
let getUserByIdMock: jest.Mock;
let getWorkspaceByIdMock: jest.Mock;
let getWorkspacesByUserIdMock: jest.Mock;
let storeUserMock: jest.Mock;
let storeWorkspaceMock: jest.Mock;
let updateUserMock: jest.Mock;
let updateWorkspaceMock: jest.Mock;

beforeEach(() => {
    jest.resetModules();
    getEnvironmentVariablesMock = jest
        .fn()
        .mockReturnValue({ SUGGESTIONS_ENABLED: true });
    canUserAccessWorkspaceMock = jest.fn().mockResolvedValue(true);
    countActiveAdminUsersMock = jest.fn().mockResolvedValue(5);
    countPrototypesByUserIdAndWorkspaceIdMock = jest
        .fn()
        .mockImplementation((userId: string, wsId: string) => {
            if (userId === userId1.toString()) {
                if (wsId === workspaceId3.toString()) {
                    return Promise.resolve(2);
                } else if (wsId === user1PersonalWorkspaceId.toString()) {
                    return Promise.resolve(1);
                }
            } else if (userId === userId2.toString()) {
                if (wsId === workspaceId3.toString()) {
                    return Promise.resolve(1);
                }
            }
            return Promise.resolve(0);
        });
    countWorkspacesByUserIdMock = jest
        .fn()
        .mockImplementation((userId: string) => {
            switch (userId) {
                case userId1.toString():
                    return Promise.resolve(2);
                case userId2.toString():
                    return Promise.resolve(1);
                default:
                    return Promise.resolve(0);
            }
        });
    getAllUsersMock = jest.fn().mockResolvedValue(allUsers);
    getUserByEmailMock = jest.fn().mockImplementation((email: string) => {
        return Promise.resolve(
            allUsers.find((user) => user.email === email) ?? null
        );
    });
    getUserByIdMock = jest.fn().mockImplementation((id: string) => {
        return Promise.resolve(allUsers.find((user) => user.id === id) ?? null);
    });
    getWorkspaceByIdMock = jest.fn().mockImplementation((id: string) => {
        return Promise.resolve(
            allWorkspaces.find((ws) => ws.id === id) ?? null
        );
    });
    getWorkspacesByUserIdMock = jest
        .fn()
        .mockImplementation((userId: string) => {
            return Promise.resolve(
                allWorkspaces.filter((ws) => ws.userIds.includes(userId))
            );
        });
    storeUserMock = jest.fn().mockImplementation((data: IUser) => {
        return Promise.resolve({
            ...data,
            _id: userId2 as unknown as mongoose.Schema.Types.ObjectId,
        });
    });
    storeWorkspaceMock = jest.fn().mockImplementation((data: IWorkspace) => {
        return Promise.resolve({
            ...data,
            _id: workspaceId3 as unknown as mongoose.Schema.Types.ObjectId,
        });
    });
    updateUserMock = jest.fn();
    updateWorkspaceMock = jest.fn();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    jest.doMock('../../utils', () => ({
        ...jest.requireActual('../../utils'),
        getEnvironmentVariables: getEnvironmentVariablesMock,
    }));
    jest.doMock('../middleware', () => ({
        verifyNotUser: jest.fn(),
        verifyUser: jest.fn(),
    }));
    jest.doMock('../../database/mongoose-store', () => ({
        canUserAccessWorkspace: canUserAccessWorkspaceMock,
        countActiveAdminUsers: countActiveAdminUsersMock,
        countPrototypesByUserIdAndWorkspaceId:
            countPrototypesByUserIdAndWorkspaceIdMock,
        countWorkspacesByUserId: countWorkspacesByUserIdMock,
        getAllUsers: getAllUsersMock,
        getUserByEmail: getUserByEmailMock,
        getUserById: getUserByIdMock,
        getWorkspaceById: getWorkspaceByIdMock,
        getWorkspacesByUserId: getWorkspacesByUserIdMock,
        storeUser: storeUserMock,
        storeWorkspace: storeWorkspaceMock,
        updateUser: updateUserMock,
        updateWorkspace: updateWorkspaceMock,
    }));
    bcryptCompareMock = jest.fn().mockResolvedValue(true);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    jest.doMock('bcryptjs', () => ({
        ...jest.requireActual('bcryptjs'),
        compare: bcryptCompareMock,
    }));
});

afterEach(() => {
    jest.clearAllMocks();
});

describe('redirectLogin', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let redirectLogin: (req: any, res: any) => void;
    beforeEach(async () => {
        ({ redirectLogin } = await import('../user-routes'));
    });

    it('should redirect permanently to sign-in page', () => {
        const request = httpMocks.createRequest({
            method: 'GET',
            url: '/login',
        });
        const response = httpMocks.createResponse();

        redirectLogin(request, response);

        expect(response.statusCode).toBe(301);
        expect(response._getRedirectUrl()).toBe('/user/sign-in');
    });
});

describe('redirectLogout', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let redirectLogout: (req: any, res: any) => void;
    beforeEach(async () => {
        ({ redirectLogout } = await import('../user-routes'));
    });

    it('should redirect permanently to log-out page', () => {
        const request = httpMocks.createRequest({
            method: 'GET',
            url: '/logout',
        });
        const response = httpMocks.createResponse();

        redirectLogout(request, response);

        expect(response.statusCode).toBe(301);
        expect(response._getRedirectUrl()).toBe('/user/log-out');
    });
});

describe('renderManageAccountPage', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let renderManageAccountPage: (req: any, res: any) => void;
    beforeEach(async () => {
        ({ renderManageAccountPage } = await import('../user-routes'));
    });

    it('should redirect permanently to manage account page', () => {
        const request = httpMocks.createRequest({
            method: 'GET',
            url: '/manage-account',
            user: user1,
        });
        const response = httpMocks.createResponse();

        renderManageAccountPage(request, response);

        expect(response.statusCode).toBe(200);
        expect(response._getRenderView()).toBe('manage-user.njk');
    });
});

describe('renderRegisterPage', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let renderRegisterPage: (req: any, res: any) => void;
    beforeEach(async () => {
        ({ renderRegisterPage } = await import('../user-routes'));
    });

    it('should redirect permanently to register page', () => {
        const request = httpMocks.createRequest({
            method: 'GET',
            url: '/register',
        });
        const response = httpMocks.createResponse();

        renderRegisterPage(request, response);

        expect(response.statusCode).toBe(200);
        expect(response._getRenderView()).toBe('register.njk');
    });
});

describe('registerUser', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let registerUser: (req: any, res: any) => Promise<void>;
    beforeEach(async () => {
        ({ registerUser } = await import('../user-routes'));
    });

    it.each([
        [
            { email: 'invalid', name: 'Test', password1: '', password2: '' },
            'Enter an email address in the correct format, like name@example.com',
        ],
        [
            {
                email: 'test@example.com',
                name: 'Test',
                password1: 'abc',
                password2: 'def',
            },
            'The passwords must match',
        ],
        [
            {
                email: 'test@example.com',
                name: 'Test',
                password1: 'short',
                password2: 'short',
            },
            'The password must be at least 12 characters long',
        ],
        [
            {
                email: 'test@example.com',
                name: 'Test',
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
            });
            const response = httpMocks.createResponse();
            await registerUser(request, response);
            expect(response.statusCode).toBe(400);
            expect(JSON.stringify(response._getJSONData())).toContain(
                expectedError
            );
            expect(storeUserMock).not.toHaveBeenCalled();
            expect(storeWorkspaceMock).not.toHaveBeenCalled();
        }
    );

    it.each([
        [
            'mydomain.com',
            true,
            'Enter an email address with the domain mydomain.com',
        ],
        ['mydomain.com', false, 'Enter a valid email address'],
    ])(
        'should validate email domain and return error: %s, reveal=%s',
        async (domain, reveal, expectedError) => {
            getEnvironmentVariablesMock.mockReturnValue({
                EMAIL_ADDRESS_ALLOWED_DOMAIN: domain,
                EMAIL_ADDRESS_ALLOWED_DOMAIN_REVEAL: reveal,
            });
            const request = httpMocks.createRequest({
                body: {
                    email: `user@example.com`,
                    name: 'Test',
                    password1: 'Password123!',
                    password2: 'Password123!',
                },
                method: 'POST',
            });
            const response = httpMocks.createResponse();
            await registerUser(request, response);
            expect(response.statusCode).toBe(400);
            expect(JSON.stringify(response._getJSONData())).toContain(
                expectedError
            );
        }
    );

    it('should return error if email already exists', async () => {
        const request = httpMocks.createRequest({
            body: {
                email: user1.email,
                name: 'Test',
                password1: 'Password123!',
                password2: 'Password123!',
            },
            method: 'POST',
        });
        const response = httpMocks.createResponse();
        await registerUser(request, response);
        expect(response.statusCode).toBe(400);
        expect(JSON.stringify(response._getJSONData())).toContain(
            'An account with that email address already exists'
        );
        expect(storeUserMock).not.toHaveBeenCalled();
        expect(storeWorkspaceMock).not.toHaveBeenCalled();
    });

    it.each([
        [true, 0],
        [false, 1],
        [false, 5],
    ])(
        'should register regular user successfully (isAdmin=%s)',
        async (isAdmin, countActiveAdminUsers) => {
            countActiveAdminUsersMock.mockResolvedValueOnce(
                countActiveAdminUsers
            );
            const request = httpMocks.createRequest({
                body: {
                    email: 'newuser@example.com',
                    name: 'Test',
                    password1: 'Password123!',
                    password2: 'Password123!',
                },
                method: 'POST',
            });
            const response = httpMocks.createResponse();
            await registerUser(request, response);
            expect(response.statusCode).toBe(201);
            expect(JSON.stringify(response._getJSONData())).toContain(
                'User registered successfully'
            );
            expect(storeUserMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    email: 'newuser@example.com',
                    isActive: true,
                    isAdmin: isAdmin,
                    name: 'Test',
                })
            );
            expect(storeWorkspaceMock).toHaveBeenCalled();
        }
    );

    it('should reject common passwords', async () => {
        const request = httpMocks.createRequest({
            body: {
                email: 'test@example.com',
                name: 'Test',
                password1: 'Password@123',
                password2: 'Password@123',
            },
            method: 'POST',
        });
        const response = httpMocks.createResponse();
        await registerUser(request, response);
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
        expect(storeUserMock).not.toHaveBeenCalled();
        expect(storeWorkspaceMock).not.toHaveBeenCalled();
    });
});

describe('renderSignInPage', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let renderSignInPage: (req: any, res: any) => void;
    beforeEach(async () => {
        ({ renderSignInPage } = await import('../user-routes'));
    });

    it.each([
        ['localhost:3000', undefined, ''],
        [
            'localhost:3000',
            'http://localhost:3000/some-page',
            'http://localhost:3000/some-page',
        ],
        [
            'localhost:3000',
            'https://localhost:3000/some-page',
            'https://localhost:3000/some-page',
        ],
        ['localhost:3000', 'http://localhost:3000/user/register', ''],
        ['localhost:3000', 'https://malicious.com/phish', ''],
    ])(
        'should render sign-in page with correct referrer (host=%s, referer=%s)',
        (host, refererHeader, expectedReferrer) => {
            const request = httpMocks.createRequest({
                headers: {
                    referer: refererHeader,
                },
                host: host,
                method: 'GET',
                url: '/sign-in',
            });
            const response = httpMocks.createResponse();

            renderSignInPage(request, response);

            expect(response.statusCode).toBe(200);
            expect(response._getRenderView()).toBe('sign-in.njk');
            expect(
                (response._getRenderData() as { referrer: string }).referrer
            ).toBe(expectedReferrer);
        }
    );
});

describe('signInUser', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let signInUser: (req: any, res: any) => Promise<void>;
    beforeEach(async () => {
        ({ signInUser } = await import('../user-routes'));
    });

    it.each([
        [
            { email: 'notfound@example.com', password: 'Password123!' },
            401,
            'Your email address and password do not match.',
        ],
        [
            { email: user1.email, password: 'WrongPassword!' },
            401,
            'Your email address and password do not match.',
        ],
    ])(
        'should validate input and return error: %s',
        async (body, expectedStatus, expectedMessage) => {
            bcryptCompareMock.mockResolvedValueOnce(false);
            const request = httpMocks.createRequest({
                body,
                method: 'POST',
                session: {
                    regenerate: (cb: (err?: Error) => void) => {
                        cb();
                    },
                },
            });
            const response = httpMocks.createResponse();
            await signInUser(request, response);
            expect(response.statusCode).toBe(expectedStatus);
            expect(JSON.stringify(response._getJSONData())).toContain(
                expectedMessage
            );
        }
    );

    it('should sign in user successfully and set session', async () => {
        const request = httpMocks.createRequest({
            body: { email: user1.email, password: user1.passwordHash },
            method: 'POST',
            session: {
                regenerate: (cb: (err?: Error) => void) => {
                    cb();
                },
            },
        });
        const response = httpMocks.createResponse();
        await signInUser(request, response);
        expect(response.statusCode).toBe(204);
        expect(JSON.stringify(response._getJSONData())).toContain(
            'Sign in success'
        );
    });

    it('should handle session regeneration error', async () => {
        const request = httpMocks.createRequest({
            body: { email: user1.email, password: user1.passwordHash },
            method: 'POST',
            session: {
                regenerate: (cb: (err?: Error) => void) => {
                    cb(new Error('fail'));
                },
            },
        });
        const response = httpMocks.createResponse();
        await expect(signInUser(request, response)).rejects.toThrow(
            'Session regeneration failed'
        );
    });
});

describe('logOutUser', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let logOutUser: (req: any, res: any) => void;
    beforeEach(async () => {
        ({ logOutUser } = await import('../user-routes'));
    });

    it('should clear session and redirect to sign-in', () => {
        const session = {
            currentUserId: user1.id,
            liveData: { foo: 'bar' },
            livePrototypePasswords: { test: 'pw' },
        };
        const resLocals = { user: user1 };
        const request = httpMocks.createRequest({
            session,
        });
        const response = httpMocks.createResponse();
        response.locals = resLocals;

        logOutUser(request, response);

        expect(request.session.currentUserId).toBeUndefined();
        expect(response.locals.currentUser).toBeUndefined();
        expect(request.session.liveData).toEqual({});
        expect(request.session.livePrototypePasswords).toEqual({});
        expect(response.statusCode).toBe(302);
        expect(response._getRedirectUrl()).toBe('/user/sign-in');
    });
});

describe('renderWorkspacesPage', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let renderWorkspacesPage: (req: any, res: any) => Promise<void>;
    beforeEach(async () => {
        ({ renderWorkspacesPage } = await import('../user-routes'));
    });

    it('should redirect if invalid pagination params', async () => {
        const request = httpMocks.createRequest({
            method: 'GET',
            query: { page: '-1', perPage: 'invalid-number' },
            user: user1,
        });
        const response = httpMocks.createResponse();
        await renderWorkspacesPage(request, response);
        expect(response.statusCode).toBe(302);
        expect(response._getRedirectUrl()).toBe(
            '/user/workspace?page=1&perPage=10'
        );
    });

    it('should render workspaces page with correct data and pagination', async () => {
        const request = httpMocks.createRequest({
            method: 'GET',
            query: { page: '1', perPage: '10' },
            user: user1,
        });
        const response = httpMocks.createResponse();
        await renderWorkspacesPage(request, response);
        expect(response.statusCode).toBe(200);
        expect(response._getRenderView()).toBe('workspaces.njk');
        const data = response._getRenderData() as {
            header: string;
            showPagination: boolean;
            totalWorkspaces: number;
            workspaceRows: IWorkspace[];
        };
        expect(data).toHaveProperty('header');
        expect(data).toHaveProperty('workspaceRows');
        expect(Array.isArray(data.workspaceRows)).toBe(true);
        expect(data).toHaveProperty('totalWorkspaces');
        expect(data).toHaveProperty('showPagination');
    });

    it.each([
        [{ page: '1', perPage: '1' }, true],
        [{ page: '1', perPage: '100' }, false],
    ])(
        'should show/hide pagination as expected for query %p',
        async (query, expectPagination) => {
            const request = httpMocks.createRequest({
                method: 'GET',
                query,
                user: user1,
            });
            const response = httpMocks.createResponse();
            await renderWorkspacesPage(request, response);
            const data = response._getRenderData() as {
                showPagination: boolean;
            };
            expect(data.showPagination).toBe(expectPagination);
        }
    );
});

describe('renderCreateWorkspacePage', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let renderCreateWorkspacePage: (req: any, res: any) => Promise<void>;
    beforeEach(async () => {
        ({ renderCreateWorkspacePage } = await import('../user-routes'));
    });

    it('should render the create workspace page with correct data', async () => {
        const request = httpMocks.createRequest({
            method: 'GET',
            user: user1,
        });
        const response = httpMocks.createResponse();
        await renderCreateWorkspacePage(request, response);
        expect(response.statusCode).toBe(200);
        expect(response._getRenderView()).toBe('workspace.njk');
        const data = response._getRenderData() as {
            allUsers: IUser[];
            lastUpdated: string | undefined;
            sharedWithUsers: IUser[];
            userId: string;
            workspaceId: string;
            ws: IWorkspace | undefined;
        };
        expect(data.allUsers).toEqual(allUsers);
        expect(data.lastUpdated).toBeUndefined();
        expect(data.sharedWithUsers).toEqual([user1]);
        expect(data.userId).toBe(user1.id);
        expect(data.workspaceId).toBe('create');
        expect(data.ws).toBeUndefined();
    });
});

describe('createWorkspace', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let createWorkspace: (req: any, res: any) => Promise<void>;
    beforeEach(async () => {
        ({ createWorkspace } = await import('../user-routes'));
    });

    it('should create workspace successfully', async () => {
        const request = httpMocks.createRequest({
            body: { name: 'New Workspace' },
            method: 'POST',
            user: user1,
        });
        const response = httpMocks.createResponse();
        await createWorkspace(request, response);
        expect(response.statusCode).toBe(200);
        expect(JSON.stringify(response._getJSONData())).toContain(
            'Workspace created successfully.'
        );
        expect(storeWorkspaceMock).toHaveBeenCalled();
    });
});

describe('renderWorkspacePage', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let renderWorkspacePage: (req: any, res: any) => Promise<void>;
    beforeEach(async () => {
        ({ renderWorkspacePage } = await import('../user-routes'));
    });

    it('should render workspace page with correct data', async () => {
        const request = httpMocks.createRequest({
            method: 'GET',
            params: { id: workspaceId3.toString() },
            user: user1,
        });
        const response = httpMocks.createResponse();
        await renderWorkspacePage(request, response);
        expect(response.statusCode).toBe(200);
        expect(response._getRenderView()).toBe('workspace.njk');
        const data = response._getRenderData() as {
            allUsers: IUser[];
            lastUpdated: string;
            sharedWithUsers: IUser[];
            userId: string;
            workspaceId: string;
            ws: IWorkspace;
        };
        expect(data.allUsers).toEqual(allUsers);
        expect(data.userId).toBe(user1.id);
        expect(data.workspaceId).toBe(workspaceId3.toString());
        expect(data.ws).toBeDefined();
    });

    it('should render not found if workspace does not exist', async () => {
        getWorkspaceByIdMock.mockResolvedValueOnce(null);
        const request = httpMocks.createRequest({
            method: 'GET',
            params: { id: 'non-existent' },
            user: user1,
        });
        const response = httpMocks.createResponse();
        await renderWorkspacePage(request, response);
        expect(response.statusCode).toBe(404);
        expect(response._getRenderView()).toBe('workspace-not-found.njk');
    });

    it('should render not found if user cannot access workspace', async () => {
        canUserAccessWorkspaceMock.mockResolvedValueOnce(false);
        const request = httpMocks.createRequest({
            method: 'GET',
            params: { id: workspaceId3.toString() },
            user: user1,
        });
        const response = httpMocks.createResponse();
        await renderWorkspacePage(request, response);
        expect(response.statusCode).toBe(404);
        expect(response._getRenderView()).toBe('workspace-not-found.njk');
    });
});

describe('updateWorkspace', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let updateWorkspaceController: (req: any, res: any) => Promise<void>;
    beforeEach(async () => {
        ({ updateWorkspaceController } = await import('../user-routes'));
    });

    it('should return 404 if workspace does not exist', async () => {
        const request = httpMocks.createRequest({
            body: { name: 'Workspace', sharedWithUserIds: [user1.id] },
            method: 'POST',
            params: { id: 'non-existent-id' },
            user: user1,
        });
        const response = httpMocks.createResponse();
        await updateWorkspaceController(request, response);
        expect(response.statusCode).toBe(404);
        expect(JSON.stringify(response._getJSONData())).toContain(
            'Workspace not found'
        );
    });

    it('should return 404 if user cannot access workspace', async () => {
        canUserAccessWorkspaceMock.mockResolvedValueOnce(false);
        const request = httpMocks.createRequest({
            body: { name: 'Workspace', sharedWithUserIds: [user1.id] },
            method: 'POST',
            params: { id: 'private-workspace-id' },
            user: user1,
        });
        const response = httpMocks.createResponse();
        await updateWorkspaceController(request, response);
        expect(response.statusCode).toBe(404);
        expect(JSON.stringify(response._getJSONData())).toContain(
            'Workspace not found'
        );
    });

    it('should require at least one user for non-personal workspace', async () => {
        getWorkspaceByIdMock.mockResolvedValueOnce({
            ...allWorkspaces[2],
            isPersonalWorkspace: false,
        });
        const request = httpMocks.createRequest({
            body: { name: 'Workspace', sharedWithUserIds: [] },
            method: 'POST',
            params: { id: workspaceId3.toString() },
            user: user1,
        });
        const response = httpMocks.createResponse();
        await updateWorkspaceController(request, response);
        expect(response.statusCode).toBe(400);
        expect(JSON.stringify(response._getJSONData())).toContain(
            'At least one user must have access to the workspace.'
        );
    });

    it('should return error if shared user does not exist', async () => {
        getWorkspaceByIdMock.mockResolvedValueOnce({
            ...allWorkspaces[2],
            isPersonalWorkspace: false,
        });
        const request = httpMocks.createRequest({
            body: { name: 'Workspace', sharedWithUserIds: ['non-existent'] },
            method: 'POST',
            params: { id: workspaceId3.toString() },
            user: user1,
        });
        const response = httpMocks.createResponse();
        await updateWorkspaceController(request, response);
        expect(response.statusCode).toBe(400);
        expect(JSON.stringify(response._getJSONData())).toContain(
            'User with ID non-existent does not exist.'
        );
    });

    it('should update non-personal workspace and return success', async () => {
        canUserAccessWorkspaceMock.mockResolvedValueOnce(true);
        const request = httpMocks.createRequest({
            body: {
                name: 'Workspace New Name',
                sharedWithUserIds: [user1.id, user2.id, user1.id],
            },
            method: 'POST',
            params: { id: workspaceId3.toString() },
            user: user1,
        });
        const response = httpMocks.createResponse();
        await updateWorkspaceController(request, response);
        expect(response.statusCode).toBe(200);
        expect(JSON.stringify(response._getJSONData())).toContain(
            'Workspace updated successfully.'
        );
        expect(updateWorkspaceMock).toHaveBeenCalledWith(
            workspaceId3.toString(),
            {
                isPersonalWorkspace: false,
                name: 'Workspace New Name',
                userIds: [user1.id, user2.id],
            }
        );
    });

    it.each([[[]], [[user1.id]], [[user1.id, user2.id]], [[user2.id]]])(
        'should update personal workspace and return success',
        async (sharedWithUserIds) => {
            canUserAccessWorkspaceMock.mockResolvedValueOnce(true);
            const request = httpMocks.createRequest({
                body: {
                    name: 'Workspace New Name',
                    sharedWithUserIds: sharedWithUserIds,
                },
                method: 'POST',
                params: { id: user1PersonalWorkspaceId.toString() },
                user: user1,
            });
            const response = httpMocks.createResponse();
            await updateWorkspaceController(request, response);
            expect(response.statusCode).toBe(200);
            expect(JSON.stringify(response._getJSONData())).toContain(
                'Workspace updated successfully.'
            );
            expect(updateWorkspaceMock).toHaveBeenCalledWith(
                user1PersonalWorkspaceId.toString(),
                {
                    isPersonalWorkspace: true,
                    name: 'Workspace New Name',
                    userIds: [user1.id], // Personal workspace always only includes the owner
                }
            );
        }
    );

    it('should return removal message if user is removed from workspace', async () => {
        canUserAccessWorkspaceMock.mockResolvedValueOnce(true);
        canUserAccessWorkspaceMock.mockResolvedValueOnce(false);
        const request = httpMocks.createRequest({
            body: { name: 'Workspace', sharedWithUserIds: [user1.id] },
            method: 'POST',
            params: { id: workspaceId3.toString() },
            user: user1,
        });
        const response = httpMocks.createResponse();
        await updateWorkspaceController(request, response);
        expect(response.statusCode).toBe(200);
        expect(JSON.stringify(response._getJSONData())).toContain(
            'You have been removed from the workspace.'
        );
        expect(JSON.stringify(response._getJSONData())).toContain(
            '/user/workspace'
        );
    });
});

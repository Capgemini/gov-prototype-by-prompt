import { NextFunction, Request, Response } from 'express';
import httpMocks from 'node-mocks-http';

import {
    allUsers,
    prototypeData1,
    prototypeData2,
    prototypeData3,
    prototypeData4,
    user1,
} from '../../../jest/mockTestData';
import { IUser } from '../../types';

// Test parameters for the sec-fetch-dest header variations
const notSignedInParams = [
    ['empty', { message: 'You are not signed in' }, '', {}],
    ['iframe', undefined, 'not-signed-in.njk', { insideIframe: true }],
    ['document', undefined, 'not-signed-in.njk', { insideIframe: false }],
] as const;
const accountDeactivatedParams = [
    ['empty', { message: 'Your account has been deactivated' }, '', {}],
    ['iframe', undefined, 'account-deactivated.njk', { insideIframe: true }],
    ['document', undefined, 'account-deactivated.njk', { insideIframe: false }],
] as const;
const prototypeNotFoundParams = [
    ['empty', { message: 'Prototype not found' }, '', {}],
    ['iframe', undefined, 'prototype-not-found.njk', { insideIframe: true }],
    ['document', undefined, 'prototype-not-found.njk', { insideIframe: false }],
] as const;
const errorParams = [
    ['empty', 'Sorry, there is a problem with the service.', '', {}],
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    ['iframe', undefined, 'error.njk', { errorId: expect.any(String) }],
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    ['document', undefined, 'error.njk', { errorId: expect.any(String) }],
] as const;

let getEnvironmentVariablesMock: jest.Mock;
let canUserAccessPrototypeMock: jest.Mock;
let getPrototypeByIdMock: jest.Mock;
let getUserByIdMock: jest.Mock;
let nextFunctionMock: jest.Mock;
let activeSpanMock: { setAttribute: jest.Mock };
beforeEach(() => {
    jest.resetModules();
    getEnvironmentVariablesMock = jest
        .fn()
        .mockReturnValue({ LOG_USER_ID_IN_AZURE_APP_INSIGHTS: true });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    jest.doMock('../../utils', () => ({
        ...jest.requireActual('../../utils'),
        getEnvironmentVariables: getEnvironmentVariablesMock,
    }));
    canUserAccessPrototypeMock = jest.fn().mockResolvedValue(true);
    getPrototypeByIdMock = jest.fn().mockImplementation((id: string) => {
        const prototypes = [
            prototypeData1,
            prototypeData2,
            prototypeData3,
            prototypeData4,
        ];
        return Promise.resolve(prototypes.find((p) => p.id === id) ?? null);
    });
    getUserByIdMock = jest.fn().mockImplementation((id: string) => {
        return Promise.resolve(allUsers.find((user) => user.id === id) ?? null);
    });
    jest.doMock('../../database/mongoose-store', () => ({
        canUserAccessPrototype: canUserAccessPrototypeMock,
        getPrototypeById: getPrototypeByIdMock,
        getUserById: getUserByIdMock,
    }));
    nextFunctionMock = jest.fn();
    activeSpanMock = { setAttribute: jest.fn() };
    jest.doMock('@opentelemetry/api', () => ({
        trace: {
            getActiveSpan: () => activeSpanMock,
        },
    }));
    jest.doMock('uuid', () => ({
        v4: jest.fn().mockReturnValue('test-uuid-v4'),
    }));
});

afterEach(() => {
    jest.clearAllMocks();
});

describe('attachRequestData', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let attachRequestData: (req: any, res: any, next: NextFunction) => void;
    beforeEach(async () => {
        ({ attachRequestData } = await import('../middleware'));
    });

    it('should attach req to res.locals and call next', () => {
        const req = httpMocks.createRequest();
        const res = httpMocks.createResponse();
        attachRequestData(req, res, nextFunctionMock);
        expect(res.locals.req).toBe(req);
        expect(nextFunctionMock).toHaveBeenCalled();
    });

    it('should set anonymous user and body attributes on active span if enabled', () => {
        const req = httpMocks.createRequest({
            body: { foo: 'bar', password: 'keep-secret-value' },
        });
        const res = httpMocks.createResponse();
        attachRequestData(req, res, nextFunctionMock);
        expect(activeSpanMock.setAttribute).toHaveBeenCalledWith(
            'user.id',
            'anonymous'
        );
        expect(activeSpanMock.setAttribute).toHaveBeenCalledWith(
            'request.body',
            JSON.stringify({ foo: 'bar', password: '***' })
        );
        expect(nextFunctionMock).toHaveBeenCalled();
    });

    it('should set response.json and response.content_type attributes on active span', () => {
        const req = httpMocks.createRequest();
        const res = httpMocks.createResponse();
        // Patch res.json and res.setHeader to test attribute setting
        const origJson = res.json.bind(res);
        res.json = function (data) {
            return origJson(data);
        };
        const origSetHeader = res.setHeader.bind(res);
        res.setHeader = function (name, value) {
            return origSetHeader(name, value);
        };

        attachRequestData(req, res, nextFunctionMock);

        // Simulate response.json and setHeader
        res.json({ foo: 'bar' });
        res.setHeader('content-type', 'application/json');
        expect(activeSpanMock.setAttribute).toHaveBeenCalledWith(
            'response.json',
            expect.stringContaining('foo')
        );
        expect(activeSpanMock.setAttribute).toHaveBeenCalledWith(
            'response.content_type',
            'application/json'
        );
        expect(nextFunctionMock).toHaveBeenCalled();
    });
});

describe('verifyLivePrototype', () => {
    let verifyLivePrototype: (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        req: any,
        res: Response,
        next: NextFunction
    ) => Promise<void>;
    beforeEach(async () => {
        ({ verifyLivePrototype } = await import('../middleware'));
    });

    it('should attach user to req and res.locals and set span attribute if session user exists and is active', async () => {
        getUserByIdMock.mockResolvedValueOnce(user1);
        const req = httpMocks.createRequest({
            method: 'GET',
            params: { id: prototypeData1.id },
            session: { currentUserId: user1.id },
        });
        const res = httpMocks.createResponse();

        await verifyLivePrototype(req, res, nextFunctionMock);

        expect(req.user).toEqual(user1);
        expect(res.locals.currentUser).toEqual(user1);
        expect(activeSpanMock.setAttribute).toHaveBeenCalledWith(
            'user.id',
            user1.id
        );
    });

    it('should not attach user to req and res.locals and set span attribute if session user exists and is not active', async () => {
        getUserByIdMock.mockResolvedValueOnce({
            ...user1,
            isActive: false,
        });
        const req = httpMocks.createRequest({
            method: 'GET',
            params: { id: prototypeData1.id },
            session: { currentUserId: user1.id },
        });
        const res = httpMocks.createResponse();

        await verifyLivePrototype(req, res, nextFunctionMock);

        expect(req.user).toBeUndefined();
        expect(res.locals.currentUser).toBeUndefined();
        expect(activeSpanMock.setAttribute).toHaveBeenCalledWith(
            'user.id',
            user1.id
        );
    });

    it.each(notSignedInParams)(
        'should return 401 if prototype does not exist and user is not signed in',
        async (secFetchDest, jsonData, renderView, renderData) => {
            const req = httpMocks.createRequest({
                headers: { 'sec-fetch-dest': secFetchDest },
                method: 'GET',
                params: { id: 'not-found' },
                session: {},
            });
            const res = httpMocks.createResponse();
            await verifyLivePrototype(req, res, nextFunctionMock);

            expect(res.statusCode).toBe(401);
            expect(req.session.currentUserId).toBeUndefined();
            expect(req.user).toBeUndefined();
            expect(res.locals.currentUser).toBeUndefined();
            expect(activeSpanMock.setAttribute).not.toHaveBeenCalled();
            if (jsonData) expect(res._getJSONData()).toEqual(jsonData);
            expect(res._getRenderView()).toBe(renderView);
            expect(res._getRenderData()).toEqual(renderData);
            expect(nextFunctionMock).not.toHaveBeenCalled();
        }
    );

    it.each(accountDeactivatedParams)(
        'should return 403 if prototype does not exist and user is signed in and not active',
        async (secFetchDest, jsonData, renderView, renderData) => {
            getUserByIdMock.mockResolvedValueOnce({
                ...user1,
                isActive: false,
            });
            const req = httpMocks.createRequest({
                headers: { 'sec-fetch-dest': secFetchDest },
                method: 'GET',
                params: { id: 'not-found' },
                session: { currentUserId: user1.id },
            });
            const res = httpMocks.createResponse();

            await verifyLivePrototype(req, res, nextFunctionMock);

            expect(res.statusCode).toBe(403);
            expect(req.session.currentUserId).toBe(user1.id);
            expect(req.user).toBeUndefined();
            expect(res.locals.currentUser).toBeUndefined();
            expect(activeSpanMock.setAttribute).toHaveBeenCalledWith(
                'user.id',
                user1.id
            );
            if (jsonData) expect(res._getJSONData()).toEqual(jsonData);
            expect(res._getRenderView()).toBe(renderView);
            expect(res._getRenderData()).toEqual(renderData);
            expect(nextFunctionMock).not.toHaveBeenCalled();
        }
    );

    it.each(prototypeNotFoundParams)(
        'should return 404 if prototype does not exist and user is signed in and active (sec-fetch-dest=%s)',
        async (secFetchDest, jsonData, renderView, renderData) => {
            getUserByIdMock.mockResolvedValueOnce(user1);
            const req = httpMocks.createRequest({
                headers: { 'sec-fetch-dest': secFetchDest },
                method: 'GET',
                params: { id: 'not-found' },
                session: { currentUserId: user1.id },
            });
            const res = httpMocks.createResponse();

            await verifyLivePrototype(req, res, nextFunctionMock);

            expect(res.statusCode).toBe(404);
            expect(req.session.currentUserId).toBe(user1.id);
            expect(req.user).toEqual(user1);
            expect(res.locals.currentUser).toEqual(user1);
            expect(activeSpanMock.setAttribute).toHaveBeenCalledWith(
                'user.id',
                user1.id
            );
            if (jsonData) expect(res._getJSONData()).toEqual(jsonData);
            expect(res._getRenderView()).toBe(renderView);
            expect(res._getRenderData()).toEqual(renderData);
            expect(nextFunctionMock).not.toHaveBeenCalled();
        }
    );

    it.each([
        [true, ''],
        [false, ''],
        [true, undefined],
        [false, undefined],
    ])(
        'should call next() if the prototype is public and has no password (canUserAccessPrototype=%s, livePrototypePublicPassword=%s)',
        async (canUserAccessPrototype, livePrototypePublicPassword) => {
            getPrototypeByIdMock.mockResolvedValueOnce({
                ...prototypeData1,
                livePrototypePublic: true,
                livePrototypePublicPassword: livePrototypePublicPassword,
            });
            canUserAccessPrototypeMock.mockResolvedValueOnce(
                canUserAccessPrototype
            );
            const req = httpMocks.createRequest({
                method: 'GET',
                params: { id: prototypeData1.id },
                session: { currentUserId: user1.id },
            });
            const res = httpMocks.createResponse();

            await verifyLivePrototype(req, res, nextFunctionMock);

            expect(req.prototypeData).toEqual({
                ...prototypeData1,
                livePrototypePublic: true,
                livePrototypePublicPassword: livePrototypePublicPassword,
            });
            expect(nextFunctionMock).toHaveBeenCalled();
        }
    );

    it.each([true, false])(
        'should call next() if the prototype is public and the user has entered the correct password (canUserAccessPrototype=%s)',
        async (canUserAccessPrototype) => {
            getPrototypeByIdMock.mockResolvedValueOnce({
                ...prototypeData1,
                livePrototypePublic: true,
                livePrototypePublicPassword: 'password',
            });
            canUserAccessPrototypeMock.mockResolvedValueOnce(
                canUserAccessPrototype
            );
            const req = httpMocks.createRequest({
                method: 'GET',
                params: { id: prototypeData1.id },
                session: {
                    currentUserId: user1.id,
                    livePrototypePasswords: { [prototypeData1.id]: 'password' },
                },
            });
            const res = httpMocks.createResponse();

            await verifyLivePrototype(req, res, nextFunctionMock);

            expect(req.prototypeData).toEqual({
                ...prototypeData1,
                livePrototypePublic: true,
                livePrototypePublicPassword: 'password',
            });
            expect(nextFunctionMock).toHaveBeenCalled();
        }
    );

    it('should call next() if the prototype is public with a password but the user is active and can access it', async () => {
        getPrototypeByIdMock.mockResolvedValueOnce({
            ...prototypeData1,
            livePrototypePublic: true,
            livePrototypePublicPassword: 'password',
        });
        canUserAccessPrototypeMock.mockResolvedValueOnce(true);
        const req = httpMocks.createRequest({
            method: 'GET',
            params: { id: prototypeData1.id },
            session: {
                currentUserId: user1.id,
                livePrototypePasswords: { [prototypeData1.id]: 'not-password' },
            },
        });
        const res = httpMocks.createResponse();

        await verifyLivePrototype(req, res, nextFunctionMock);

        expect(req.prototypeData).toEqual({
            ...prototypeData1,
            livePrototypePublic: true,
            livePrototypePublicPassword: 'password',
        });
        expect(nextFunctionMock).toHaveBeenCalled();
    });

    it.each([
        ['not-password', false, true],
        ['not-password', true, false],
        [undefined, false, true],
        [undefined, true, false],
    ])(
        'should render password-protected.njk if prototype is public, has password, and session password does not match (sessionPassword=%s, canUserAccessPrototype=%s, isUserActive=%s)',
        async (sessionPassword, canUserAccessPrototype, isUserActive) => {
            getUserByIdMock.mockResolvedValueOnce({
                ...user1,
                isActive: isUserActive,
            });
            canUserAccessPrototypeMock.mockResolvedValueOnce(
                canUserAccessPrototype
            );
            const req = httpMocks.createRequest({
                headers: { 'sec-fetch-dest': 'iframe' },
                method: 'GET',
                params: { id: prototypeData4.id },
                session: {
                    livePrototypePasswords: {
                        [prototypeData4.id]: sessionPassword,
                    },
                },
            });
            const res = httpMocks.createResponse();

            await verifyLivePrototype(req, res, nextFunctionMock);

            expect(res._getRenderView()).toBe('password-protected.njk');
            expect(res._getRenderData()).toEqual({
                insideIframe: true,
                prototypeId: prototypeData4.id,
            });
        }
    );

    it.each(notSignedInParams)(
        'should return 401 if prototype does exist and user is not signed in',
        async (secFetchDest, jsonData, renderView, renderData) => {
            const req = httpMocks.createRequest({
                headers: { 'sec-fetch-dest': secFetchDest },
                method: 'GET',
                params: { id: prototypeData1.id },
                session: {},
            });
            const res = httpMocks.createResponse();
            await verifyLivePrototype(req, res, nextFunctionMock);

            expect(res.statusCode).toBe(401);
            expect(req.session.currentUserId).toBeUndefined();
            expect(req.user).toBeUndefined();
            expect(res.locals.currentUser).toBeUndefined();
            expect(activeSpanMock.setAttribute).not.toHaveBeenCalled();
            if (jsonData) expect(res._getJSONData()).toEqual(jsonData);
            expect(res._getRenderView()).toBe(renderView);
            expect(res._getRenderData()).toEqual(renderData);
            expect(nextFunctionMock).not.toHaveBeenCalled();
        }
    );

    it.each(accountDeactivatedParams)(
        'should return 403 if prototype does exist and user is signed in and not active',
        async (secFetchDest, jsonData, renderView, renderData) => {
            getUserByIdMock.mockResolvedValueOnce({
                ...user1,
                isActive: false,
            });
            const req = httpMocks.createRequest({
                headers: { 'sec-fetch-dest': secFetchDest },
                method: 'GET',
                params: { id: prototypeData1.id },
                session: { currentUserId: user1.id },
            });
            const res = httpMocks.createResponse();

            await verifyLivePrototype(req, res, nextFunctionMock);

            expect(res.statusCode).toBe(403);
            expect(req.session.currentUserId).toBe(user1.id);
            expect(req.user).toBeUndefined();
            expect(res.locals.currentUser).toBeUndefined();
            expect(activeSpanMock.setAttribute).toHaveBeenCalledWith(
                'user.id',
                user1.id
            );
            if (jsonData) expect(res._getJSONData()).toEqual(jsonData);
            expect(res._getRenderView()).toBe(renderView);
            expect(res._getRenderData()).toEqual(renderData);
            expect(nextFunctionMock).not.toHaveBeenCalled();
        }
    );

    it.each(prototypeNotFoundParams)(
        'should return 404 if prototype does exist and user is signed in and active but cannot access it (sec-fetch-dest=%s)',
        async (secFetchDest, jsonData, renderView, renderData) => {
            getUserByIdMock.mockResolvedValueOnce(user1);
            canUserAccessPrototypeMock.mockResolvedValueOnce(false);
            const req = httpMocks.createRequest({
                headers: { 'sec-fetch-dest': secFetchDest },
                method: 'GET',
                params: { id: prototypeData1.id },
                session: { currentUserId: user1.id },
            });
            const res = httpMocks.createResponse();

            await verifyLivePrototype(req, res, nextFunctionMock);

            expect(res.statusCode).toBe(404);
            expect(req.session.currentUserId).toBe(user1.id);
            expect(req.user).toEqual(user1);
            expect(res.locals.currentUser).toEqual(user1);
            expect(activeSpanMock.setAttribute).toHaveBeenCalledWith(
                'user.id',
                user1.id
            );
            if (jsonData) expect(res._getJSONData()).toEqual(jsonData);
            expect(res._getRenderView()).toBe(renderView);
            expect(res._getRenderData()).toEqual(renderData);
            expect(nextFunctionMock).not.toHaveBeenCalled();
        }
    );

    it('should call next() if the user is active and can access the prototype', async () => {
        canUserAccessPrototypeMock.mockResolvedValueOnce(true);
        const req = httpMocks.createRequest({
            method: 'GET',
            params: { id: prototypeData1.id },
            session: { currentUserId: user1.id },
        });
        const res = httpMocks.createResponse();

        await verifyLivePrototype(req, res, nextFunctionMock);

        expect(req.prototypeData).toEqual(prototypeData1);
        expect(nextFunctionMock).toHaveBeenCalled();
    });
});

describe('verifyPrototype', () => {
    let verifyPrototype: (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        req: any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        res: any,
        next: NextFunction
    ) => Promise<void>;
    beforeEach(async () => {
        ({ verifyPrototype } = await import('../middleware'));
    });

    it.each(prototypeNotFoundParams)(
        'should return 404 if prototype does not exist (sec-fetch-dest=%s)',
        async (secFetchDest, jsonData, renderView, renderData) => {
            const req = httpMocks.createRequest({
                headers: { 'sec-fetch-dest': secFetchDest },
                method: 'GET',
                params: { id: 'not-found' },
                user: user1,
            });
            const res = httpMocks.createResponse();

            await verifyPrototype(req, res, nextFunctionMock);

            expect(res.statusCode).toBe(404);
            if (jsonData) expect(res._getJSONData()).toEqual(jsonData);
            expect(res._getRenderView()).toBe(renderView);
            expect(res._getRenderData()).toEqual(renderData);
            expect(nextFunctionMock).not.toHaveBeenCalled();
        }
    );

    it.each(prototypeNotFoundParams)(
        'should return 404 if user cannot access prototype (sec-fetch-dest=%s)',
        async (secFetchDest, jsonData, renderView, renderData) => {
            canUserAccessPrototypeMock.mockResolvedValueOnce(false);
            const req = httpMocks.createRequest({
                headers: { 'sec-fetch-dest': secFetchDest },
                method: 'GET',
                params: { id: prototypeData1.id },
                user: user1,
            });
            const res = httpMocks.createResponse();

            await verifyPrototype(req, res, nextFunctionMock);

            expect(res.statusCode).toBe(404);
            if (jsonData) expect(res._getJSONData()).toEqual(jsonData);
            expect(res._getRenderView()).toBe(renderView);
            expect(res._getRenderData()).toEqual(renderData);
            expect(nextFunctionMock).not.toHaveBeenCalled();
        }
    );

    it('should attach prototypeData to req and call next if user can access prototype', async () => {
        canUserAccessPrototypeMock.mockResolvedValueOnce(true);
        const req = httpMocks.createRequest({
            method: 'GET',
            params: { id: prototypeData1.id },
            user: user1,
        });
        const res = httpMocks.createResponse();

        await verifyPrototype(req, res, nextFunctionMock);

        expect(req.prototypeData).toEqual(prototypeData1);
        expect(nextFunctionMock).toHaveBeenCalled();
    });
});

describe('verifyUser', () => {
    let verifyUser: (
        req: Request & { user?: IUser },
        res: Response,
        next: NextFunction
    ) => Promise<void>;
    beforeEach(async () => {
        ({ verifyUser } = await import('../middleware'));
    });

    it('should attach user to req and res.locals, set span attribute, and call next if user is found and active', async () => {
        getUserByIdMock.mockResolvedValueOnce(user1);
        const req = httpMocks.createRequest({
            originalUrl: '/some-url',
            session: { currentUserId: user1.id },
        });
        const res = httpMocks.createResponse();

        await verifyUser(req, res, nextFunctionMock);

        expect(req.session.currentUserId).toBe(user1.id);
        expect(req.user).toEqual(user1);
        expect(res.locals.currentUser).toEqual(user1);
        expect(activeSpanMock.setAttribute).toHaveBeenCalledWith(
            'user.id',
            user1.id
        );
        expect(nextFunctionMock).toHaveBeenCalled();
    });

    it.each(accountDeactivatedParams)(
        'should not attach user to req and res.locals, set span attribute, and return 403 if user is found and not active (sec-fetch-dest=%s)',
        async (secFetchDest, jsonData, renderView, renderData) => {
            getUserByIdMock.mockResolvedValueOnce({
                ...user1,
                isActive: false,
            });
            const req = httpMocks.createRequest({
                headers: { 'sec-fetch-dest': secFetchDest },
                originalUrl: '/some-url',
                session: { currentUserId: user1.id },
            });
            const res = httpMocks.createResponse();

            await verifyUser(req, res, nextFunctionMock);

            expect(res.statusCode).toBe(403);
            expect(req.session.currentUserId).toBe(user1.id);
            expect(req.user).toBeUndefined();
            expect(res.locals.currentUser).toBeUndefined();
            expect(activeSpanMock.setAttribute).toHaveBeenCalledWith(
                'user.id',
                user1.id
            );
            if (jsonData) expect(res._getJSONData()).toEqual(jsonData);
            expect(res._getRenderView()).toBe(renderView);
            expect(res._getRenderData()).toEqual(renderData);
            expect(nextFunctionMock).not.toHaveBeenCalled();
        }
    );

    it('should redirect to sign-in if not logged in and on homepage', async () => {
        getUserByIdMock.mockResolvedValueOnce(null);
        const req = httpMocks.createRequest({
            originalUrl: '/',
            session: { currentUserId: 'not-a-user' },
        });
        const res = httpMocks.createResponse();

        await verifyUser(req, res, nextFunctionMock);

        expect(req.session.currentUserId).toBeUndefined();
        expect(res.statusCode).toBe(302);
        expect(res._getRedirectUrl()).toBe('/user/sign-in');
        expect(nextFunctionMock).not.toHaveBeenCalled();
    });

    it.each(notSignedInParams)(
        'should return 401 if not logged in (sec-fetch-dest=%s)',
        async (secFetchDest, jsonData, renderView, renderData) => {
            getUserByIdMock.mockResolvedValueOnce(null);
            const req = httpMocks.createRequest({
                headers: { 'sec-fetch-dest': secFetchDest },
                originalUrl: '/other',
                session: { currentUserId: 'not-a-user' },
            });
            const res = httpMocks.createResponse();

            await verifyUser(req, res, nextFunctionMock);

            expect(res.statusCode).toBe(401);
            expect(req.session.currentUserId).toBeUndefined();
            expect(req.user).toBeUndefined();
            expect(res.locals.currentUser).toBeUndefined();
            expect(activeSpanMock.setAttribute).not.toHaveBeenCalled();
            if (jsonData) expect(res._getJSONData()).toEqual(jsonData);
            expect(res._getRenderView()).toBe(renderView);
            expect(res._getRenderData()).toEqual(renderData);
            expect(nextFunctionMock).not.toHaveBeenCalled();
        }
    );
});

describe('verifyAdminUser', () => {
    let verifyAdminUser: (
        req: Request & { user?: IUser },
        res: Response,
        next: NextFunction
    ) => Promise<void>;
    beforeEach(async () => {
        ({ verifyAdminUser } = await import('../middleware'));
    });

    it('should attach user to req and res.locals, set span attribute, and call next if user is found, active, and an admin', async () => {
        getUserByIdMock.mockResolvedValueOnce({ ...user1, isAdmin: true });
        const req = httpMocks.createRequest({
            originalUrl: '/some-url',
            session: { currentUserId: user1.id },
        });
        const res = httpMocks.createResponse();

        await verifyAdminUser(req, res, nextFunctionMock);

        expect(req.session.currentUserId).toBe(user1.id);
        expect(req.user).toEqual({ ...user1, isAdmin: true });
        expect(res.locals.currentUser).toEqual({ ...user1, isAdmin: true });
        expect(activeSpanMock.setAttribute).toHaveBeenCalledWith(
            'user.id',
            user1.id
        );
        expect(nextFunctionMock).toHaveBeenCalled();
    });

    it.each(accountDeactivatedParams)(
        'should not attach user to req and res.locals, set span attribute, and return 403 if user is found and not active (sec-fetch-dest=%s)',
        async (secFetchDest, jsonData, renderView, renderData) => {
            getUserByIdMock.mockResolvedValueOnce({
                ...user1,
                isActive: false,
                isAdmin: true,
            });
            const req = httpMocks.createRequest({
                headers: { 'sec-fetch-dest': secFetchDest },
                originalUrl: '/some-url',
                session: { currentUserId: user1.id },
            });
            const res = httpMocks.createResponse();

            await verifyAdminUser(req, res, nextFunctionMock);

            expect(res.statusCode).toBe(403);
            expect(req.session.currentUserId).toBe(user1.id);
            expect(req.user).toBeUndefined();
            expect(res.locals.currentUser).toBeUndefined();
            expect(activeSpanMock.setAttribute).toHaveBeenCalledWith(
                'user.id',
                user1.id
            );
            if (jsonData) expect(res._getJSONData()).toEqual(jsonData);
            expect(res._getRenderView()).toBe(renderView);
            expect(res._getRenderData()).toEqual(renderData);
            expect(nextFunctionMock).not.toHaveBeenCalled();
        }
    );

    it.each([
        ['empty', { message: 'Page not found' }, '', {}],
        ['iframe', undefined, 'page-not-found.njk', { insideIframe: true }],
        ['document', undefined, 'page-not-found.njk', { insideIframe: false }],
    ])(
        'should not attach user to req and res.locals, set span attribute, and return 404 if user is found and active and not an admin (sec-fetch-dest=%s)',
        async (secFetchDest, jsonData, renderView, renderData) => {
            getUserByIdMock.mockResolvedValueOnce({
                ...user1,
                isActive: true,
                isAdmin: false,
            });
            const req = httpMocks.createRequest({
                headers: { 'sec-fetch-dest': secFetchDest },
                originalUrl: '/some-url',
                session: { currentUserId: user1.id },
            });
            const res = httpMocks.createResponse();

            await verifyAdminUser(req, res, nextFunctionMock);

            expect(res.statusCode).toBe(404);
            expect(req.session.currentUserId).toBe(user1.id);
            expect(req.user).toBeUndefined();
            expect(res.locals.currentUser).toBeUndefined();
            expect(activeSpanMock.setAttribute).toHaveBeenCalledWith(
                'user.id',
                user1.id
            );
            if (jsonData) expect(res._getJSONData()).toEqual(jsonData);
            expect(res._getRenderView()).toBe(renderView);
            expect(res._getRenderData()).toEqual(renderData);
            expect(nextFunctionMock).not.toHaveBeenCalled();
        }
    );

    it('should redirect to sign-in if not logged in and on homepage', async () => {
        getUserByIdMock.mockResolvedValueOnce(null);
        const req = httpMocks.createRequest({
            originalUrl: '/',
            session: { currentUserId: 'not-a-user' },
        });
        const res = httpMocks.createResponse();

        await verifyAdminUser(req, res, nextFunctionMock);

        expect(req.session.currentUserId).toBeUndefined();
        expect(res.statusCode).toBe(302);
        expect(res._getRedirectUrl()).toBe('/user/sign-in');
        expect(nextFunctionMock).not.toHaveBeenCalled();
    });

    it.each(notSignedInParams)(
        'should return 401 if not logged in (sec-fetch-dest=%s)',
        async (secFetchDest, jsonData, renderView, renderData) => {
            getUserByIdMock.mockResolvedValueOnce(null);
            const req = httpMocks.createRequest({
                headers: { 'sec-fetch-dest': secFetchDest },
                originalUrl: '/other',
                session: { currentUserId: 'not-a-user' },
            });
            const res = httpMocks.createResponse();

            await verifyAdminUser(req, res, nextFunctionMock);

            expect(res.statusCode).toBe(401);
            expect(req.session.currentUserId).toBeUndefined();
            expect(req.user).toBeUndefined();
            expect(res.locals.currentUser).toBeUndefined();
            expect(activeSpanMock.setAttribute).not.toHaveBeenCalled();
            if (jsonData) expect(res._getJSONData()).toEqual(jsonData);
            expect(res._getRenderView()).toBe(renderView);
            expect(res._getRenderData()).toEqual(renderData);
            expect(nextFunctionMock).not.toHaveBeenCalled();
        }
    );
});

describe('verifyNotUser', () => {
    let verifyNotUser: (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        req: any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        res: any,
        next: NextFunction
    ) => Promise<void>;
    beforeEach(async () => {
        ({ verifyNotUser } = await import('../middleware'));
    });

    it('should redirect to home if user is already signed in', async () => {
        const req = httpMocks.createRequest({
            session: { currentUserId: user1.id },
        });
        const res = httpMocks.createResponse();

        await verifyNotUser(req, res, nextFunctionMock);

        expect(res._getRedirectUrl()).toBe('/');
        expect(res.statusCode).toBe(302);
        expect(nextFunctionMock).not.toHaveBeenCalled();
    });

    it.each([undefined, 'not-a-user'])(
        'should call next if user is not signed in or does not exist (%s)',
        async (userId) => {
            const req = httpMocks.createRequest({
                session: { currentUserId: userId },
            });
            const res = httpMocks.createResponse();

            await verifyNotUser(req, res, nextFunctionMock);

            expect(nextFunctionMock).toHaveBeenCalled();
        }
    );
});

describe('errorHandler', () => {
    let errorHandler: (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        err: any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        req: any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        res: any,
        next: NextFunction
    ) => void;
    beforeEach(async () => {
        ({ errorHandler } = await import('../middleware'));
    });

    it.each(errorParams)(
        'should set error attributes if they exist on active span (sec-fetch-dest=%s)',
        (secFetchDest, jsonMessage, renderView, renderData) => {
            const error = {
                message: 'error message',
                name: 'TestError',
                stack: 'stacktrace',
            };
            const req = httpMocks.createRequest({
                headers: { 'sec-fetch-dest': secFetchDest },
            });
            const res = httpMocks.createResponse();
            res.headersSent = false;
            errorHandler(error, req, res, nextFunctionMock);

            expect(res.statusCode).toBe(500);

            if (jsonMessage)
                expect(
                    (res._getJSONData() as { message: string }).message
                ).toContain(jsonMessage);
            expect(res._getRenderView()).toBe(renderView);
            expect(res._getRenderData()).toEqual(renderData);

            expect(activeSpanMock.setAttribute).toHaveBeenCalledWith(
                'error.name',
                error.name
            );
            expect(activeSpanMock.setAttribute).toHaveBeenCalledWith(
                'error.message',
                error.message
            );
            expect(activeSpanMock.setAttribute).toHaveBeenCalledWith(
                'error.stack',
                error.stack
            );
            expect(activeSpanMock.setAttribute).toHaveBeenCalledWith(
                'error.id',
                expect.any(String)
            );
            expect(nextFunctionMock).not.toHaveBeenCalled();
        }
    );

    it.each(errorParams)(
        'should set error attributes if they do not exist on active span (sec-fetch-dest=%s)',
        (secFetchDest, jsonMessage, renderView, renderData) => {
            const error = {
                message: undefined,
                name: 'TestError',
                stack: undefined,
            };
            const req = httpMocks.createRequest({
                headers: { 'sec-fetch-dest': secFetchDest },
            });
            const res = httpMocks.createResponse();
            res.headersSent = false;
            errorHandler(error, req, res, nextFunctionMock);

            if (jsonMessage)
                expect(
                    (res._getJSONData() as { message: string }).message
                ).toContain(jsonMessage);
            expect(res._getRenderView()).toBe(renderView);
            expect(res._getRenderData()).toEqual(renderData);

            expect(activeSpanMock.setAttribute).toHaveBeenCalledWith(
                'error.name',
                'TestError'
            );
            expect(activeSpanMock.setAttribute).toHaveBeenCalledWith(
                'error.message',
                'An unknown error occurred'
            );
            expect(activeSpanMock.setAttribute).toHaveBeenCalledWith(
                'error.stack',
                'No stack trace available'
            );
            expect(activeSpanMock.setAttribute).toHaveBeenCalledWith(
                'error.id',
                expect.any(String)
            );
            expect(nextFunctionMock).not.toHaveBeenCalled();
        }
    );

    it('should call next(err) if headers already sent', () => {
        const error = new Error('Test error');
        const req = httpMocks.createRequest();
        const res = httpMocks.createResponse();
        res.headersSent = true;

        errorHandler(error, req, res, nextFunctionMock);

        expect(nextFunctionMock).toHaveBeenCalledWith(error);
    });
});
describe('notFoundHandler', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let notFoundHandler: (req: any, res: any) => void;
    beforeEach(async () => {
        ({ notFoundHandler } = await import('../middleware'));
    });

    it('should return 404 JSON if sec-fetch-dest is empty', () => {
        const req = httpMocks.createRequest({
            headers: { 'sec-fetch-dest': 'empty' },
        });
        const res = httpMocks.createResponse();

        notFoundHandler(req, res);

        expect(res.statusCode).toBe(404);
        expect(res._getJSONData()).toEqual({ message: 'Page not found' });
    });

    it.each([
        { expectedInsideIframe: true, secFetchDest: 'iframe' },
        { expectedInsideIframe: false, secFetchDest: 'other' },
        { expectedInsideIframe: false, secFetchDest: undefined },
    ])(
        'should render page-not-found.njk with insideIframe $expectedInsideIframe if sec-fetch-dest is $secFetchDest',
        ({ expectedInsideIframe, secFetchDest }) => {
            const req = httpMocks.createRequest(
                secFetchDest === undefined
                    ? undefined
                    : { headers: { 'sec-fetch-dest': secFetchDest } }
            );
            const res = httpMocks.createResponse();

            notFoundHandler(req, res);

            expect(res.statusCode).toBe(404);
            expect(res._getRenderView()).toBe('page-not-found.njk');
            expect(res._getRenderData()).toEqual({
                insideIframe: expectedInsideIframe,
            });
        }
    );
});

import { NextFunction } from 'express';
import httpMocks from 'node-mocks-http';

import {
    allUsers,
    prototypeData1,
    prototypeData2,
    prototypeData3,
    prototypeData4,
    user1,
} from '../../../jest/mockTestData';

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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        res: any,
        next: NextFunction
    ) => Promise<void>;
    beforeEach(async () => {
        ({ verifyLivePrototype } = await import('../middleware'));
    });

    it('should attach user to req and res.locals if session user exists', async () => {
        const req = httpMocks.createRequest({
            method: 'GET',
            params: { id: prototypeData1.id },
            session: { currentUserId: user1.id },
        });
        const res = httpMocks.createResponse();

        await verifyLivePrototype(req, res, nextFunctionMock);

        expect(req.user).toEqual(user1);
        expect(res.locals.user).toEqual(user1);
        expect(nextFunctionMock).toHaveBeenCalled();
    });

    it('should return 404 if prototype does not exist and user is signed in', async () => {
        const req = httpMocks.createRequest({
            headers: { 'sec-fetch-dest': 'empty' },
            method: 'GET',
            params: { id: 'not-found' },
            session: { currentUserId: user1.id },
        });
        const res = httpMocks.createResponse();

        await verifyLivePrototype(req, res, nextFunctionMock);

        expect(res.statusCode).toBe(404);
        expect(res._getJSONData()).toEqual({ message: 'Prototype not found' });
        expect(nextFunctionMock).not.toHaveBeenCalled();
    });

    it('should render prototype-not-found.njk if prototype does not exist and user is signed in (iframe)', async () => {
        const req = httpMocks.createRequest({
            headers: { 'sec-fetch-dest': 'iframe' },
            method: 'GET',
            params: { id: 'not-found' },
            session: { currentUserId: user1.id },
        });
        const res = httpMocks.createResponse();

        await verifyLivePrototype(req, res, nextFunctionMock);

        expect(res.statusCode).toBe(404);
        expect(res._getRenderView()).toBe('prototype-not-found.njk');
        expect(res._getRenderData()).toEqual({
            insideIframe: true,
        });
        expect(nextFunctionMock).not.toHaveBeenCalled();
    });

    it('should return 404 if prototype does not exist and user is not signed in', async () => {
        const req = httpMocks.createRequest({
            headers: { 'sec-fetch-dest': 'empty' },
            method: 'GET',
            params: { id: 'not-found' },
            session: {},
        });
        const res = httpMocks.createResponse();
        await verifyLivePrototype(req, res, nextFunctionMock);

        expect(res.statusCode).toBe(404);
        expect(res._getJSONData()).toEqual({
            message: 'You are not signed in',
        });
        expect(nextFunctionMock).not.toHaveBeenCalled();
    });

    it('should render not-signed-in.njk if prototype does not exist and user is not signed in (iframe)', async () => {
        const req = httpMocks.createRequest({
            headers: { 'sec-fetch-dest': 'iframe' },
            method: 'GET',
            params: { id: 'not-found' },
            session: {},
        });
        const res = httpMocks.createResponse();

        await verifyLivePrototype(req, res, nextFunctionMock);

        expect(res.statusCode).toBe(404);
        expect(res._getRenderView()).toBe('not-signed-in.njk');
        expect(res._getRenderData()).toEqual({
            insideIframe: true,
        });
        expect(nextFunctionMock).not.toHaveBeenCalled();
    });

    it('should render password-protected.njk if prototype is public, has password, and session password does not match', async () => {
        canUserAccessPrototypeMock.mockResolvedValueOnce(false);
        const req = httpMocks.createRequest({
            headers: { 'sec-fetch-dest': 'iframe' },
            method: 'GET',
            params: { id: prototypeData4.id },
            session: {
                livePrototypePasswords: { [prototypeData4.id]: 'wrong' },
            },
        });
        const res = httpMocks.createResponse();

        await verifyLivePrototype(req, res, nextFunctionMock);

        expect(res._getRenderView()).toBe('password-protected.njk');
        expect(res._getRenderData()).toEqual({
            insideIframe: true,
            prototypeId: prototypeData4.id,
        });
    });

    it('should attach prototypeData to req and call next if user can access prototype', async () => {
        canUserAccessPrototypeMock.mockResolvedValueOnce(true);
        const req = httpMocks.createRequest({
            method: 'GET',
            params: { id: prototypeData1.id },
            session: { currentUserId: allUsers[0].id },
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

    it('should return 404 if prototype does not exist', async () => {
        const req = httpMocks.createRequest({
            headers: { 'sec-fetch-dest': 'empty' },
            method: 'GET',
            params: { id: 'not-found' },
            user: user1,
        });
        const res = httpMocks.createResponse();

        await verifyPrototype(req, res, nextFunctionMock);

        expect(res.statusCode).toBe(404);
        expect(res._getJSONData()).toEqual({ message: 'Prototype not found' });
        expect(nextFunctionMock).not.toHaveBeenCalled();
    });

    it('should render prototype-not-found.njk if prototype does not exist (iframe)', async () => {
        const req = httpMocks.createRequest({
            headers: { 'sec-fetch-dest': 'iframe' },
            method: 'GET',
            params: { id: 'not-found' },
            user: user1,
        });
        const res = httpMocks.createResponse();

        await verifyPrototype(req, res, nextFunctionMock);

        expect(res.statusCode).toBe(404);
        expect(res._getRenderView()).toBe('prototype-not-found.njk');
        expect(res._getRenderData()).toEqual({ insideIframe: true });
        expect(nextFunctionMock).not.toHaveBeenCalled();
    });

    it('should return 404 if user cannot access prototype', async () => {
        canUserAccessPrototypeMock.mockResolvedValueOnce(false);
        const req = httpMocks.createRequest({
            headers: { 'sec-fetch-dest': 'empty' },
            method: 'GET',
            params: { id: prototypeData1.id },
            user: user1,
        });
        const res = httpMocks.createResponse();

        await verifyPrototype(req, res, nextFunctionMock);

        expect(res.statusCode).toBe(404);
        expect(res._getJSONData()).toEqual({ message: 'Prototype not found' });
        expect(nextFunctionMock).not.toHaveBeenCalled();
    });

    it('should render prototype-not-found.njk if user cannot access prototype (iframe)', async () => {
        canUserAccessPrototypeMock.mockResolvedValueOnce(false);
        const req = httpMocks.createRequest({
            headers: { 'sec-fetch-dest': 'iframe' },
            method: 'GET',
            params: { id: prototypeData1.id },
            user: user1,
        });
        const res = httpMocks.createResponse();

        await verifyPrototype(req, res, nextFunctionMock);

        expect(res.statusCode).toBe(404);
        expect(res._getRenderView()).toBe('prototype-not-found.njk');
        expect(res._getRenderData()).toEqual({ insideIframe: true });
        expect(nextFunctionMock).not.toHaveBeenCalled();
    });

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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        req: any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        res: any,
        next: NextFunction
    ) => Promise<void>;
    beforeEach(async () => {
        ({ verifyUser } = await import('../middleware'));
    });

    it('should attach user to req and res.locals, set span attribute, and call next if user is found', async () => {
        getUserByIdMock.mockResolvedValueOnce(user1);
        const req = httpMocks.createRequest({
            originalUrl: '/some-url',
            session: { currentUserId: user1.id },
        });
        const res = httpMocks.createResponse();

        await verifyUser(req, res, nextFunctionMock);

        expect(req.user).toEqual(user1);
        expect(res.locals.user).toEqual(user1);
        expect(activeSpanMock.setAttribute).toHaveBeenCalledWith(
            'user.id',
            user1.id
        );
        expect(nextFunctionMock).toHaveBeenCalled();
    });

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

    it('should return 404 with message if not logged in and sec-fetch-dest is empty', async () => {
        getUserByIdMock.mockResolvedValueOnce(null);
        const req = httpMocks.createRequest({
            headers: { 'sec-fetch-dest': 'empty' },
            originalUrl: '/other',
            session: { currentUserId: 'not-a-user' },
        });
        const res = httpMocks.createResponse();

        await verifyUser(req, res, nextFunctionMock);

        expect(req.session.currentUserId).toBeUndefined();
        expect(res.statusCode).toBe(404);
        expect(res._getJSONData()).toEqual({
            message: 'You are not signed in',
        });
        expect(nextFunctionMock).not.toHaveBeenCalled();
    });

    it('should render not-signed-in.njk if not logged in and sec-fetch-dest is not empty', async () => {
        getUserByIdMock.mockResolvedValueOnce(null);
        const req = httpMocks.createRequest({
            headers: { 'sec-fetch-dest': 'iframe' },
            originalUrl: '/other',
            session: { currentUserId: 'not-a-user' },
        });
        const res = httpMocks.createResponse();

        await verifyUser(req, res, nextFunctionMock);

        expect(req.session.currentUserId).toBeUndefined();
        expect(res.statusCode).toBe(404);
        expect(res._getRenderView()).toBe('not-signed-in.njk');
        expect(res._getRenderData()).toEqual({
            insideIframe: true,
        });
        expect(nextFunctionMock).not.toHaveBeenCalled();
    });
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

    it('should set error attributes if they exist on active span and send JSON if sec-fetch-dest is empty', () => {
        const error = {
            message: 'error message',
            name: 'TestError',
            stack: 'stacktrace',
        };
        const req = httpMocks.createRequest({
            headers: { 'sec-fetch-dest': 'empty' },
        });
        const res = httpMocks.createResponse();
        res.headersSent = false;
        errorHandler(error, req, res, nextFunctionMock);

        expect(res.statusCode).toBe(500);
        expect((res._getJSONData() as { message: string }).message).toContain(
            'Sorry, there is a problem with the service.'
        );
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
    });

    it('should set error attributes if they do not exist on active span and send JSON if sec-fetch-dest is empty', () => {
        const error = {
            message: undefined,
            name: 'TestError',
            stack: undefined,
        };
        const req = httpMocks.createRequest({
            headers: { 'sec-fetch-dest': 'empty' },
        });
        const res = httpMocks.createResponse();
        res.headersSent = false;
        errorHandler(error, req, res, nextFunctionMock);

        expect(res.statusCode).toBe(500);
        expect((res._getJSONData() as { message: string }).message).toContain(
            'Sorry, there is a problem with the service.'
        );
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
    });

    it('should render error.njk if sec-fetch-dest is not empty and headers not sent', () => {
        const error = new Error('Test error');
        error.name = 'TestError';
        error.stack = 'stacktrace';
        const req = httpMocks.createRequest({
            headers: { 'sec-fetch-dest': 'iframe' },
        });
        const res = httpMocks.createResponse();
        res.headersSent = false;

        errorHandler(error, req, res, nextFunctionMock);

        expect(res.statusCode).toBe(500);
        expect(res._getRenderView()).toBe('error.njk');
        expect(
            (res._getRenderData() as { errorId: string }).errorId
        ).toBeDefined();
        expect(activeSpanMock.setAttribute).toHaveBeenCalledWith(
            'error.name',
            'TestError'
        );
        expect(activeSpanMock.setAttribute).toHaveBeenCalledWith(
            'error.message',
            'Test error'
        );
        expect(activeSpanMock.setAttribute).toHaveBeenCalledWith(
            'error.stack',
            'stacktrace'
        );
        expect(activeSpanMock.setAttribute).toHaveBeenCalledWith(
            'error.id',
            expect.any(String)
        );
        expect(nextFunctionMock).not.toHaveBeenCalled();
    });

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
                secFetchDest !== undefined
                    ? { headers: { 'sec-fetch-dest': secFetchDest } }
                    : undefined
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

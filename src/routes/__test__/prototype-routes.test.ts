import httpMocks from 'node-mocks-http';

import type { HistoryVM } from '../../routes/presenters/prototype-history.presenter';
import type { OverviewVM } from '../../routes/presenters/prototype-overview.presenter';
import type { StructureVM } from '../../routes/presenters/prototype-structure.presenter';

import formSchema from '../../../data/extract-form-questions-schema.json';
import {
    allUsers,
    allWorkspaces,
    prototypeData1,
    prototypeData2,
    prototypeData3,
    prototypeData4,
    prototypeId2,
    user1,
    user1PersonalWorkspace,
    user1PersonalWorkspaceId,
    user2,
    userId1,
    userId2,
    workspace3,
    workspace4,
    workspaceId3,
} from '../../../jest/mockTestData';
import {
    IPrototypeData,
    IUser,
    ResultsTemplatePayload,
    TemplateData,
} from '../../types';

// Mocking middleware and utilities
let getEnvironmentVariablesMock: jest.Mock;
let canUserAccessPrototypeMock: jest.Mock;
let canUserAccessWorkspaceMock: jest.Mock;
let countPrototypesByUserIdMock: jest.Mock;
let getAllUsersMock: jest.Mock;
let getPreviousPrototypesMock: jest.Mock;
let getPrototypeByIdMock: jest.Mock;
let getPrototypesByUserIdMock: jest.Mock;
let getUserByIdMock: jest.Mock;
let getWorkspaceByIdMock: jest.Mock;
let getWorkspacesByUserIdMock: jest.Mock;
let storePrototypeMock: jest.Mock;
let updatePrototypeMock: jest.Mock;
let getActiveSpanMock: jest.Mock;
let setSpanAttributeMock: jest.Mock;

beforeEach(() => {
    jest.resetModules();
    getEnvironmentVariablesMock = jest
        .fn()
        .mockReturnValue({ SUGGESTIONS_ENABLED: true });
    canUserAccessPrototypeMock = jest.fn().mockResolvedValue(true);
    canUserAccessWorkspaceMock = jest.fn().mockResolvedValue(true);
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
    getPreviousPrototypesMock = jest
        .fn()
        .mockImplementation((prototypeId, userId) => {
            if (
                userId === userId1.toString() &&
                prototypeId === prototypeId2.toString()
            ) {
                return Promise.resolve([prototypeData1]);
            }
            return Promise.resolve([]);
        });
    getPrototypeByIdMock = jest.fn().mockImplementation((id: string) => {
        const prototypes = [
            prototypeData1,
            prototypeData2,
            prototypeData3,
            prototypeData4,
        ];
        return Promise.resolve(prototypes.find((p) => p.id === id) ?? null);
    });
    getPrototypesByUserIdMock = jest
        .fn()
        .mockImplementation((userId: string) => {
            switch (userId) {
                case userId1.toString():
                    return Promise.resolve([
                        prototypeData1,
                        prototypeData2,
                        prototypeData3,
                    ]);
                case userId2.toString():
                    return Promise.resolve([prototypeData3, prototypeData4]);
                default:
                    return Promise.resolve([]);
            }
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
    storePrototypeMock = jest
        .fn()
        .mockImplementation((data: IPrototypeData) => {
            return Promise.resolve({
                ...data,
                _id: prototypeData2._id,
                id: prototypeData2.id,
            });
        });
    updatePrototypeMock = jest.fn();
    setSpanAttributeMock = jest.fn();
    getActiveSpanMock = jest.fn().mockReturnValue(undefined);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    jest.doMock('../../utils', () => ({
        ...jest.requireActual('../../utils'),
        getEnvironmentVariables: getEnvironmentVariablesMock,
    }));
    jest.doMock('../middleware', () => ({
        verifyLivePrototype: jest.fn(),
        verifyPrototype: jest.fn(),
        verifyUser: jest.fn(),
    }));
    jest.doMock('../../zip-generator', () => ({
        buildZipOfForm: jest.fn().mockResolvedValue(new Blob()),
    }));
    jest.doMock('../../database/mongoose-store', () => ({
        canUserAccessPrototype: canUserAccessPrototypeMock,
        canUserAccessWorkspace: canUserAccessWorkspaceMock,
        countPrototypesByUserId: countPrototypesByUserIdMock,
        getAllUsers: getAllUsersMock,
        getPreviousPrototypes: getPreviousPrototypesMock,
        getPrototypeById: getPrototypeByIdMock,
        getPrototypesByUserId: getPrototypesByUserIdMock,
        getUserById: getUserByIdMock,
        getWorkspaceById: getWorkspaceByIdMock,
        getWorkspacesByUserId: getWorkspacesByUserIdMock,
        storePrototype: storePrototypeMock,
        updatePrototype: updatePrototypeMock,
    }));
    jest.doMock('@opentelemetry/api', () => ({
        trace: {
            getActiveSpan: getActiveSpanMock,
        },
    }));
});

afterEach(() => {
    jest.clearAllMocks();
});

describe('renderSchema', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let renderSchema: (req: any, res: any) => void;
    beforeEach(async () => {
        ({ renderSchema } = await import('../prototype-routes'));
    });

    it('should return 200 OK with the schema', () => {
        const request = httpMocks.createRequest({
            method: 'GET',
            url: '/schema',
            user: user1,
        });
        const response = httpMocks.createResponse();

        renderSchema(request, response);

        expect(response.statusCode).toBe(200);
        expect(response.getHeader('Content-Type')).toBe('application/json');
    });
});

describe('renderHomePage', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let renderHomePage: (req: any, res: any) => void;
    beforeEach(async () => {
        ({ renderHomePage } = await import('../prototype-routes'));
    });

    it('should return 200 OK with the home view', () => {
        const request = httpMocks.createRequest({
            method: 'GET',
            url: '/',
            user: user1,
        });
        const response = httpMocks.createResponse();

        renderHomePage(request, response);

        expect(response.statusCode).toBe(200);
        expect(response._getRenderView()).toBe('home.njk');
    });
});

describe('renderCreatePage', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let renderCreatePage: (req: any, res: any) => Promise<void>;
    beforeEach(async () => {
        ({ renderCreatePage } = await import('../prototype-routes'));
    });

    it('should render the new.njk view with workspace options', async () => {
        const request = httpMocks.createRequest({
            method: 'GET',
            url: '/create',
            user: user1,
        });
        const response = httpMocks.createResponse();

        await renderCreatePage(request, response);

        expect(response.statusCode).toBe(200);
        expect(response._getRenderView()).toBe('new.njk');
        const renderData = response._getRenderData() as {
            workspaces: { text: string; value: string }[];
        };
        expect(renderData.workspaces).toEqual(
            expect.arrayContaining([
                { text: workspace3.name, value: workspace3.id },
                { text: workspace4.name, value: workspace4.id },
                {
                    text: user1PersonalWorkspace.name,
                    value: user1PersonalWorkspace.id,
                },
            ])
        );
    });
});

describe('renderHistoryPage', () => {
    const defaultQuery = {
        createdBy: 'anyone',
        onlyCreated: 'false',
        page: '1',
        perPage: '10',
        sharing: 'all',
        workspaceId: 'all',
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let renderHistoryPage: (req: any, res: any) => Promise<void>;
    beforeEach(async () => {
        ({ renderHistoryPage } = await import('../prototype-routes'));
    });

    it('should render history.njk with correct prototype and workspace data', async () => {
        const request = httpMocks.createRequest({
            method: 'GET',
            query: defaultQuery,
            url: '/history',
            user: user1,
        });
        const response = httpMocks.createResponse();

        await renderHistoryPage(request, response);

        expect(response.statusCode).toBe(200);
        expect(response._getRenderView()).toBe('history.njk');
        const data = response._getRenderData() as {
            countPrototypes: number;
            header: { text: string }[];
            prototypeRows: { html: string }[][];
            workspaceItems: { html: string }[];
        };
        expect(data.countPrototypes).toBe(3);
        expect(data.header[0].text).toBe('Name');
        expect(data.workspaceItems.length).toBeGreaterThan(1);
        expect(data.prototypeRows[0][0].html).toContain(prototypeData1.id);
    });

    it('should redirect if query parameters are invalid', async () => {
        const request = httpMocks.createRequest({
            method: 'GET',
            query: {
                createdBy: 'invalid',
                onlyCreated: 'invalid',
                page: 'invalid',
                perPage: 'invalid',
                sharing: 'invalid',
                workspaceId: 'invalid',
            },
            url: '/history',
            user: user1,
        });
        const response = httpMocks.createResponse();

        await renderHistoryPage(request, response);

        expect(response.statusCode).toBe(302); // redirect
        expect(response._getRedirectUrl()).toContain('/history?');
    });

    it('should redirect if query parameters are missing', async () => {
        const request = httpMocks.createRequest({
            method: 'GET',
            query: {},
            url: '/history',
            user: user1,
        });
        const response = httpMocks.createResponse();

        await renderHistoryPage(request, response);

        expect(response.statusCode).toBe(302); // redirect
        expect(response._getRedirectUrl()).toContain('/history?');
    });

    it('should render history.njk with pagination', async () => {
        const request = httpMocks.createRequest({
            method: 'GET',
            query: {
                ...defaultQuery,
                page: '1',
                perPage: '1',
            },
            url: '/history',
            user: user1,
        });
        const response = httpMocks.createResponse();

        await renderHistoryPage(request, response);

        expect(response.statusCode).toBe(200);
        expect(response._getRenderView()).toBe('history.njk');
        const data = response._getRenderData() as {
            countPrototypes: number;
            itemsPerPage: string;
            paginationItems: object[];
            paginationNextHref: string;
            paginationPreviousHref: string;
            showPagination: boolean;
        };
        expect(data.countPrototypes).toBe(3);
        expect(data.itemsPerPage).toBe('1');
        expect(data.paginationItems.length).toBeGreaterThan(0);
        expect(data.paginationNextHref).toContain('page=2&perPage=1');
        expect(data.paginationPreviousHref).toBe('');
        expect(data.showPagination).toBe(true);
    });

    it('should render history.njk with no pagination', async () => {
        const request = httpMocks.createRequest({
            method: 'GET',
            query: {
                ...defaultQuery,
                page: '1',
                perPage: '10',
            },
            url: '/history',
            user: user1,
        });
        const response = httpMocks.createResponse();

        await renderHistoryPage(request, response);

        expect(response.statusCode).toBe(200);
        expect(response._getRenderView()).toBe('history.njk');
        const data = response._getRenderData() as {
            countPrototypes: number;
            itemsPerPage: string;
            paginationItems: object[];
            paginationNextHref: string;
            paginationPreviousHref: string;
            showPagination: boolean;
        };
        expect(data.countPrototypes).toBe(3);
        expect(data.itemsPerPage).toBe('10');
        expect(data.paginationItems.length).toBe(0);
        expect(data.paginationNextHref).toBe('');
        expect(data.paginationPreviousHref).toBe('');
        expect(data.showPagination).toBe(false);
    });

    it.each([
        ['anyone', 3],
        ['self', 2],
        ['others', 1],
    ])(
        'should render history.njk filtered on createdBy=%s',
        async (createdBy, countPrototypes) => {
            const request = httpMocks.createRequest({
                method: 'GET',
                query: {
                    ...defaultQuery,
                    createdBy: createdBy,
                },
                url: '/history',
                user: user1,
            });
            const response = httpMocks.createResponse();

            await renderHistoryPage(request, response);

            expect(response.statusCode).toBe(200);
            expect(response._getRenderView()).toBe('history.njk');
            const data = response._getRenderData() as {
                countPrototypes: number;
                createdBy: string;
                totalPrototypes: number;
            };
            expect(data.countPrototypes).toBe(countPrototypes);
            expect(data.createdBy).toBe(createdBy);
            expect(data.totalPrototypes).toBe(3);
        }
    );

    it.each([
        ['all', 3],
        ['private', 1],
        ['workspace', 2],
        ['users', 1],
        ['public', 1],
    ])(
        'should render history.njk filtered on sharing=%s',
        async (sharing, countPrototypes) => {
            const request = httpMocks.createRequest({
                method: 'GET',
                query: {
                    ...defaultQuery,
                    sharing: sharing,
                },
                url: '/history',
                user: user1,
            });
            const response = httpMocks.createResponse();

            await renderHistoryPage(request, response);

            expect(response.statusCode).toBe(200);
            expect(response._getRenderView()).toBe('history.njk');
            const data = response._getRenderData() as {
                countPrototypes: number;
                sharing: string;
                totalPrototypes: number;
            };
            expect(data.countPrototypes).toBe(countPrototypes);
            expect(data.sharing).toBe(sharing);
            expect(data.totalPrototypes).toBe(3);
        }
    );

    it.each([
        ['all', 3],
        [workspaceId3.toString(), 2],
        [user1PersonalWorkspaceId.toString(), 1],
    ])(
        'should render history.njk filtered on workspaceId=%s',
        async (workspaceId, countPrototypes) => {
            const request = httpMocks.createRequest({
                method: 'GET',
                query: {
                    ...defaultQuery,
                    workspaceId: workspaceId,
                },
                url: '/history',
                user: user1,
            });
            const response = httpMocks.createResponse();

            await renderHistoryPage(request, response);

            expect(response.statusCode).toBe(200);
            expect(response._getRenderView()).toBe('history.njk');
            const data = response._getRenderData() as {
                countPrototypes: number;
                totalPrototypes: number;
                workspaceItems: object[];
            };
            expect(data.countPrototypes).toBe(countPrototypes);
            expect(data.workspaceItems).toContainEqual({
                selected: true,
                text: expect.stringContaining('') as unknown as string,
                value: workspaceId,
            });
            expect(data.totalPrototypes).toBe(3);
        }
    );
});

describe('handleDownloadPrototype', () => {
    const titleSlug = 'test-prototype-1';
    let buildZipOfFormMock: jest.Mock;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let handleDownloadPrototype: (req: any, res: any) => Promise<void>;
    beforeEach(async () => {
        buildZipOfFormMock = jest.fn().mockResolvedValue({
            arrayBuffer: () =>
                Promise.resolve(new Uint8Array([1, 2, 3, 4]).buffer),
            type: 'application/zip',
        });
        jest.doMock('../../zip-generator', () => ({
            buildZipOfForm: buildZipOfFormMock,
        }));
        ({ handleDownloadPrototype } = await import('../prototype-routes'));
    });

    it('should send a zip file with correct headers and content', async () => {
        const request = httpMocks.createRequest({
            method: 'GET',
            prototypeData: prototypeData1,
            url: `/prototype/${prototypeData1.id}/download`,
        });
        const response = httpMocks.createResponse();

        await handleDownloadPrototype(request, response);

        expect(response.statusCode).toBe(200);
        expect(response.getHeader('Content-Disposition')).toContain(
            `attachment; filename="${titleSlug}.zip"`
        );
        expect(response.getHeader('Content-Type')).toBe('application/zip');
        expect(response._getData()).toEqual(Buffer.from([1, 2, 3, 4]));
        expect(buildZipOfFormMock).toHaveBeenCalledWith(
            prototypeData1.json,
            titleSlug,
            prototypeData1.designSystem,
            user1.name
        );
    });
});

describe('handleResetLivePrototype', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let handleResetLivePrototype: (req: any, res: any) => void;
    beforeEach(async () => {
        ({ handleResetLivePrototype } = await import('../prototype-routes'));
    });

    it('should delete liveData for the prototype and return 204', () => {
        const prototypeId = prototypeData1.id;
        const request = httpMocks.createRequest({
            method: 'GET',
            params: { id: prototypeId },
            session: {
                liveData: {
                    [prototypeId]: { some: 'data' },
                },
            },
        });
        const response = httpMocks.createResponse();

        handleResetLivePrototype(request, response);

        expect(request.session.liveData?.[prototypeId]).toStrictEqual({});
        expect(response.statusCode).toBe(204);
        expect(response._getJSONData()).toEqual({
            message: 'Prototype data reset successfully',
        });
    });

    it('should return 204 even if liveData is not set', () => {
        const prototypeId = prototypeData1.id;
        const request = httpMocks.createRequest({
            method: 'GET',
            params: { id: prototypeId },
            session: {},
        });
        const response = httpMocks.createResponse();

        handleResetLivePrototype(request, response);

        expect(response.statusCode).toBe(204);
        expect(response._getJSONData()).toEqual({
            message: 'Prototype data reset successfully',
        });
    });
});

describe('handleSuggestions', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let handleSuggestions: (req: any, res: any) => Promise<void>;
    let generateSuggestionsWithOpenAIMock: jest.Mock;
    beforeEach(async () => {
        generateSuggestionsWithOpenAIMock = jest.fn();
        jest.doMock('../../openai', () => ({
            generateSuggestionsWithOpenAI: generateSuggestionsWithOpenAIMock,
        }));
        ({ handleSuggestions } = await import('../prototype-routes'));
    });

    it('should return 503 if suggestions are disabled', async () => {
        getEnvironmentVariablesMock.mockReturnValue({
            SUGGESTIONS_ENABLED: false,
        });
        const request = httpMocks.createRequest({
            method: 'GET',
            prototypeData: prototypeData1,
            url: `/prototype/${prototypeData1.id}/suggestions`,
        });
        const response = httpMocks.createResponse();

        await handleSuggestions(request, response);

        expect(response.statusCode).toBe(503);
        expect(response._getJSONData()).toEqual({
            message: 'Suggestions are not enabled on this server.',
            suggestions: [],
        });
    });

    it('should return 200 and suggestions if enabled and OpenAI returns valid suggestions', async () => {
        getEnvironmentVariablesMock.mockReturnValue({
            SUGGESTIONS_ENABLED: true,
        });
        generateSuggestionsWithOpenAIMock.mockResolvedValue(
            JSON.stringify({ suggestions: ['Suggestion 1', 'Suggestion 2'] })
        );
        const request = httpMocks.createRequest({
            method: 'GET',
            prototypeData: prototypeData1,
            url: `/prototype/${prototypeData1.id}/suggestions`,
        });
        const response = httpMocks.createResponse();

        await handleSuggestions(request, response);

        expect(response.statusCode).toBe(200);
        expect(response._getJSONData()).toEqual({
            message: 'Suggestions generated successfully',
            suggestions: ['Suggestion 1', 'Suggestion 2'],
        });
    });
});

describe('handleUpdateSharing', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let handleUpdateSharing: (req: any, res: any) => Promise<void>;
    beforeEach(async () => {
        ({ handleUpdateSharing } = await import('../prototype-routes'));
    });

    it('should return 400 if prototype ID does not match', async () => {
        const request = httpMocks.createRequest({
            body: {
                livePrototypePublic: false,
                livePrototypePublicPassword: '',
                sharedWithUserIds: [],
                workspaceId: user1PersonalWorkspaceId.toString(),
            },
            method: 'POST',
            params: { id: 'wrong-id' },
            prototypeData: prototypeData1,
            user: user1,
        });
        const response = httpMocks.createResponse();

        await handleUpdateSharing(request, response);

        expect(response.statusCode).toBe(400);
        expect(response._getJSONData()).toEqual({
            message: 'Prototype ID mismatch.',
        });
    });

    it('should return 403 if the user is not a member of the workspace', async () => {
        canUserAccessWorkspaceMock.mockResolvedValueOnce(false);
        const request = httpMocks.createRequest({
            body: {
                livePrototypePublic: false,
                livePrototypePublicPassword: '',
                sharedWithUserIds: [],
                workspaceId: workspaceId3.toString(),
            },
            method: 'POST',
            params: { id: prototypeData3.id },
            prototypeData: prototypeData3,
            user: user2,
        });
        const response = httpMocks.createResponse();

        await handleUpdateSharing(request, response);

        expect(response.statusCode).toBe(403);
        expect(response._getJSONData()).toEqual({
            message: 'Only members of the workspace can manage sharing.',
        });
    });

    it('should return 400 if sharedWithUserIds contains an invalid user', async () => {
        const request = httpMocks.createRequest({
            body: {
                livePrototypePublic: false,
                livePrototypePublicPassword: '',
                sharedWithUserIds: ['invalid-user-id'],
                workspaceId: user1PersonalWorkspaceId.toString(),
            },
            method: 'POST',
            params: { id: prototypeData1.id },
            prototypeData: prototypeData1,
            user: user1,
        });
        const response = httpMocks.createResponse();

        await handleUpdateSharing(request, response);

        expect(response.statusCode).toBe(400);
        expect(response._getJSONData()).toEqual({
            message: 'User with ID invalid-user-id does not exist.',
        });
    });

    it('should return 400 if the new workspace ID is not valid', async () => {
        const workspaceId = 'invalid-workspace-id';
        const request = httpMocks.createRequest({
            body: {
                livePrototypePublic: false,
                livePrototypePublicPassword: '',
                sharedWithUserIds: [],
                workspaceId: workspaceId,
            },
            method: 'POST',
            params: { id: prototypeData1.id },
            prototypeData: prototypeData1,
            user: user1,
        });
        const response = httpMocks.createResponse();

        await handleUpdateSharing(request, response);

        expect(response.statusCode).toBe(400);
        expect(response._getJSONData()).toEqual({
            message: 'A valid workspace ID is required.',
        });
    });

    it.each([
        ['pass', 'pass'],
        [undefined, ''],
    ])(
        'should update prototype and return 200 on success with password=%s',
        async (bodyPassword, expectedPassword) => {
            const request = httpMocks.createRequest({
                body: {
                    livePrototypePublic: true,
                    livePrototypePublicPassword: bodyPassword,
                    sharedWithUserIds: [user1.id],
                    workspaceId: user1PersonalWorkspaceId.toString(),
                },
                method: 'POST',
                params: { id: prototypeData1.id },
                prototypeData: prototypeData1,
                user: user1,
            });
            const response = httpMocks.createResponse();

            await handleUpdateSharing(request, response);

            expect(response.statusCode).toBe(200);
            expect(response._getJSONData()).toEqual({
                message: 'Prototype sharing settings updated successfully.',
            });
            expect(updatePrototypeMock).toHaveBeenCalledTimes(1);
            expect(updatePrototypeMock).toHaveBeenCalledWith(
                prototypeData1.id,
                {
                    livePrototypePublic: true,
                    livePrototypePublicPassword: expectedPassword,
                    sharedWithUserIds: [user1.id],
                    workspaceId: user1PersonalWorkspaceId.toString(),
                }
            );
        }
    );
});

describe('handleLivePrototypePasswordSubmission', () => {
    let handleLivePrototypePasswordSubmission: (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        req: any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        res: any
    ) => Promise<void>;
    beforeEach(async () => {
        ({ handleLivePrototypePasswordSubmission } =
            await import('../prototype-routes'));
    });

    it('should render 404 if prototype not found', async () => {
        const request = httpMocks.createRequest({
            body: { password: 'pass' },
            method: 'POST',
            params: { id: 'notfound' },
            session: {},
        });
        const response = httpMocks.createResponse();

        await handleLivePrototypePasswordSubmission(request, response);

        expect(response.statusCode).toBe(404);
        expect(response._getRenderView()).toBe('prototype-not-found.njk');
    });

    it('should return 403 if prototype is not public', async () => {
        const request = httpMocks.createRequest({
            body: { password: 'pass' },
            method: 'POST',
            params: { id: prototypeData1.id },
            session: {},
        });
        const response = httpMocks.createResponse();

        await handleLivePrototypePasswordSubmission(request, response);

        expect(response.statusCode).toBe(403);
        expect(response._getJSONData()).toEqual({
            message: 'This prototype is not public.',
        });
    });

    it('should return 403 if password is incorrect', async () => {
        const request = httpMocks.createRequest({
            body: { password: 'wrong' },
            method: 'POST',
            params: { id: prototypeData4.id },
            session: {},
        });
        const response = httpMocks.createResponse();

        await handleLivePrototypePasswordSubmission(request, response);

        expect(response.statusCode).toBe(403);
        expect(response._getJSONData()).toEqual({
            message: 'Incorrect password for this prototype.',
        });
    });

    it('should accept correct password and set session, returning URL', async () => {
        const request = httpMocks.createRequest({
            body: {
                password: 'password123',
            },
            method: 'POST',
            params: { id: prototypeData4.id },
            session: {},
        });
        const response = httpMocks.createResponse();

        await handleLivePrototypePasswordSubmission(request, response);

        expect(response.statusCode).toBe(200);
        expect(response._getJSONData()).toEqual({
            message: 'Password accepted.',
            url: `/prototype/${prototypeData4.id}/start`,
        });
        expect(
            request.session.livePrototypePasswords?.[prototypeData4.id]
        ).toBe('password123');
    });

    it('should default to /prototype/:id/start if no redirect URL provided', async () => {
        const request = httpMocks.createRequest({
            body: { password: 'password123' },
            method: 'POST',
            params: { id: prototypeData4.id },
            session: {},
        });
        const response = httpMocks.createResponse();

        await handleLivePrototypePasswordSubmission(request, response);

        expect(response.statusCode).toBe(200);
        expect(response._getJSONData()).toEqual({
            message: 'Password accepted.',
            url: `/prototype/${prototypeData4.id}/start`,
        });
        expect(
            request.session.livePrototypePasswords?.[prototypeData4.id]
        ).toBe('password123');
    });
});

describe('handlePrototypeSubmitQuestion', () => {
    const defaultRequest = {
        method: 'POST',
        params: { id: prototypeData1.id, page: 'question-1' },
        prototypeData: prototypeData1,
        session: {},
    } as const;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let handlePrototypeSubmitQuestion: (req: any, res: any) => void;
    beforeEach(async () => {
        ({ handlePrototypeSubmitQuestion } =
            await import('../prototype-routes'));
    });

    it.each([{}, { liveData: {} }])(
        'should update liveData (session=%s)',
        (session) => {
            const request = httpMocks.createRequest({
                ...defaultRequest,
                body: { 'question-1': 'value' },
                session: session,
            });
            const response = httpMocks.createResponse();

            handlePrototypeSubmitQuestion(request, response);

            expect(request.session.liveData?.[prototypeData1.id]).toEqual({
                'question-1': 'value',
            });
        }
    );

    it.each([
        ['question-1', true],
        ['question-2', true],
        ['question-3', false],
        ['question-0', false],
        ['question-9', false],
        ['question-', false],
        ['start', false],
    ])(
        'should return 404 for an invalid question page (page=%s, isValid=%s)',
        (page, isValid) => {
            const request = httpMocks.createRequest({
                ...defaultRequest,
                params: { id: prototypeData1.id, page: page },
            });
            const response = httpMocks.createResponse();

            handlePrototypeSubmitQuestion(request, response);

            if (isValid) {
                expect(response.statusCode).toBe(302);
            } else {
                expect(response.statusCode).toBe(404);
                expect(response._getRenderView()).toBe('page-not-found.njk');
            }
        }
    );

    it.each([
        ['Yes', '/question-2'],
        ['No', '/check-answers'],
        ['Invalid', '/question-1'],
    ])(
        'for a branching_choice question with answer %s should redirect to %s',
        (userAnswer, urlEndsWith) => {
            const request = httpMocks.createRequest({
                ...defaultRequest,
                params: { id: prototypeData3.id, page: 'question-1' },
                prototypeData: prototypeData3,
                session: {
                    liveData: {
                        [prototypeData3.id]: { 'question-1': userAnswer },
                    },
                },
            });
            const response = httpMocks.createResponse();

            handlePrototypeSubmitQuestion(request, response);

            expect(response.statusCode).toBe(302);
            expect(response._getRedirectUrl()).toBe(
                `/prototype/${prototypeData3.id}${urlEndsWith}`
            );
        }
    );

    it.each([
        ['question-1', '/question-2'],
        ['question-2', '/check-answers'],
    ])(
        'for a question with next_question_value and page %s, should redirect to %s',
        (page, urlEndsWith) => {
            const request = httpMocks.createRequest({
                ...defaultRequest,
                params: { id: prototypeData2.id, page: page },
                prototypeData: prototypeData2,
            });
            const response = httpMocks.createResponse();

            handlePrototypeSubmitQuestion(request, response);

            expect(response.statusCode).toBe(302);
            expect(response._getRedirectUrl()).toBe(
                `/prototype/${prototypeData2.id}${urlEndsWith}`
            );
        }
    );

    it.each(['question-1', 'question-2'])(
        'for a question with the check answers referrer and page %s, should redirect to /check-answers',
        (page) => {
            const request = httpMocks.createRequest({
                ...defaultRequest,
                headers: {
                    referer:
                        'http://localhost/abc/question-2?referrer=check-answers',
                },
                params: { id: prototypeData1.id, page: page },
                prototypeData: prototypeData1,
            });
            const response = httpMocks.createResponse();

            handlePrototypeSubmitQuestion(request, response);

            expect(response.statusCode).toBe(302);
            expect(response._getRedirectUrl()).toBe(
                `/prototype/${prototypeData1.id}/check-answers`
            );
        }
    );
});

describe('renderPrototypePage', () => {
    const defaultRequest = {
        method: 'GET',
        params: { id: prototypeData1.id, page: 'question-1' },
        prototypeData: prototypeData1,
        session: {},
    } as const;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let renderPrototypePage: (req: any, res: any) => void;
    let generateStartPageMock: jest.Mock;
    let generateQuestionPageMock: jest.Mock;
    let generateCheckAnswersPageMock: jest.Mock;
    let generateConfirmationPageMock: jest.Mock;
    let generateBasePageMock: jest.Mock;
    let nunjucksRenderStringMock: jest.Mock;
    beforeEach(async () => {
        generateStartPageMock = jest.fn().mockReturnValue('start-page-content');
        generateQuestionPageMock = jest
            .fn()
            .mockReturnValue('question-page-content');
        generateCheckAnswersPageMock = jest
            .fn()
            .mockReturnValue('check-answers-content');
        generateConfirmationPageMock = jest
            .fn()
            .mockReturnValue('confirmation-content');
        generateBasePageMock = jest
            .fn()
            .mockReturnValue('{% extends "form-base.njk" %}');
        nunjucksRenderStringMock = jest.fn().mockReturnValue('rendered-html');
        jest.doMock('../../form-generator', () => ({
            generateBasePage: generateBasePageMock,
            generateCheckAnswersPage: generateCheckAnswersPageMock,
            generateConfirmationPage: generateConfirmationPageMock,
            generateQuestionPage: generateQuestionPageMock,
            generateStartPage: generateStartPageMock,
        }));
        jest.doMock('nunjucks', () => ({
            renderString: nunjucksRenderStringMock,
        }));
        ({ renderPrototypePage } = await import('../prototype-routes'));
    });

    it('should render the start page', () => {
        const request = httpMocks.createRequest({
            ...defaultRequest,
            params: { id: prototypeData1.id, page: 'start' },
        });
        const response = httpMocks.createResponse();

        renderPrototypePage(request, response);

        expect(generateStartPageMock).toHaveBeenCalled();
        expect(generateBasePageMock).toHaveBeenCalled();
        expect(nunjucksRenderStringMock).toHaveBeenCalledWith(
            expect.stringContaining('start-page-content'),
            expect.any(Object)
        );
        expect(response._getData()).toBe('rendered-html');
    });

    it('should render a question page', () => {
        const request = httpMocks.createRequest({
            ...defaultRequest,
            params: { id: prototypeData1.id, page: 'question-1' },
        });
        const response = httpMocks.createResponse();

        renderPrototypePage(request, response);

        expect(generateQuestionPageMock).toHaveBeenCalled();
        expect(generateBasePageMock).toHaveBeenCalled();
        expect(nunjucksRenderStringMock).toHaveBeenCalledWith(
            expect.stringContaining('question-page-content'),
            expect.any(Object)
        );
        expect(response._getData()).toBe('rendered-html');
    });

    it('should render the check-answers page', () => {
        const request = httpMocks.createRequest({
            ...defaultRequest,
            params: { id: prototypeData1.id, page: 'check-answers' },
        });
        const response = httpMocks.createResponse();

        renderPrototypePage(request, response);

        expect(generateCheckAnswersPageMock).toHaveBeenCalled();
        expect(generateBasePageMock).toHaveBeenCalled();
        expect(nunjucksRenderStringMock).toHaveBeenCalledWith(
            expect.stringContaining('check-answers-content'),
            expect.any(Object)
        );
        expect(response._getData()).toBe('rendered-html');
    });

    it('should render the confirmation page and reset the session data', () => {
        const request = httpMocks.createRequest({
            ...defaultRequest,
            params: { id: prototypeData1.id, page: 'confirmation' },
            session: {
                liveData: { [prototypeData1.id]: { some: 'data' } },
                livePrototypeHistory: {
                    [prototypeData1.id]: ['/url1', '/url2'],
                },
            },
        });
        const response = httpMocks.createResponse();

        renderPrototypePage(request, response);

        expect(generateConfirmationPageMock).toHaveBeenCalled();
        expect(generateBasePageMock).toHaveBeenCalled();
        expect(request.session.liveData?.[prototypeData1.id]).toStrictEqual({});
        expect(
            request.session.livePrototypeHistory?.[prototypeData1.id]
        ).toStrictEqual([]);
        expect(nunjucksRenderStringMock).toHaveBeenCalledWith(
            expect.stringContaining('confirmation-content'),
            expect.any(Object)
        );
        expect(response._getData()).toBe('rendered-html');
    });

    it.each(['question-99', 'question-invalid', 'invalid-page'])(
        'should return 404 for invalid page number (page=%s)',
        (page) => {
            const request = httpMocks.createRequest({
                ...defaultRequest,
                params: { id: prototypeData1.id, page: page },
            });
            const response = httpMocks.createResponse();

            renderPrototypePage(request, response);

            expect(response.statusCode).toBe(404);
            expect(response._getRenderView()).toBe('page-not-found.njk');
        }
    );

    it('removes the last URL from the history if the user navigated back', () => {
        const request = httpMocks.createRequest({
            ...defaultRequest,
            params: { id: prototypeData1.id, page: 'question-1' },
            path: '/url2',
            query: { back: 'true' },
            session: {
                livePrototypeHistory: {
                    [prototypeData1.id]: ['/url1', '/url2', '/url3'],
                },
            },
        });
        const response = httpMocks.createResponse();

        renderPrototypePage(request, response);

        expect(
            request.session.livePrototypeHistory?.[prototypeData1.id]
        ).toEqual(['/url1', '/url2']);
    });

    it('does not remove the last URL from the history if the user did not navigate back', () => {
        const request = httpMocks.createRequest({
            ...defaultRequest,
            params: { id: prototypeData1.id, page: 'question-1' },
            path: '/url3',
            query: { back: 'true' },
            session: {
                livePrototypeHistory: {
                    [prototypeData1.id]: ['/url1', '/url2'],
                },
            },
        });
        const response = httpMocks.createResponse();

        renderPrototypePage(request, response);

        expect(
            request.session.livePrototypeHistory?.[prototypeData1.id]
        ).toEqual(['/url1', '/url2', '/url3']);
    });

    it('adds the URL to the history', () => {
        const request = httpMocks.createRequest({
            ...defaultRequest,
            params: { id: prototypeData1.id, page: 'question-1' },
            path: '/url2',
            session: {
                livePrototypeHistory: {
                    [prototypeData1.id]: ['/url1'],
                },
            },
        });
        const response = httpMocks.createResponse();

        renderPrototypePage(request, response);

        expect(
            request.session.livePrototypeHistory?.[prototypeData1.id]
        ).toEqual(['/url1', '/url2']);
    });

    it('does not add duplicate URLs to the history', () => {
        const request = httpMocks.createRequest({
            ...defaultRequest,
            params: { id: prototypeData1.id, page: 'question-1' },
            path: '/url2',
            session: {
                livePrototypeHistory: {
                    [prototypeData1.id]: ['/url1', '/url2'],
                },
            },
        });
        const response = httpMocks.createResponse();

        renderPrototypePage(request, response);

        expect(
            request.session.livePrototypeHistory?.[prototypeData1.id]
        ).toEqual(['/url1', '/url2']);
    });

    it.each([
        [['/url1', '/url2'], '/url2?back=true'],
        [['/url1'], '/url1?back=true'],
        [[], undefined],
        [undefined, undefined],
    ])(
        'where the history is %s, sets the back link to %s',
        (history, backLinkHref) => {
            const request = httpMocks.createRequest({
                ...defaultRequest,
                params: { id: prototypeData1.id, page: 'question-1' },
                path: '/url3',
                session: {
                    livePrototypeHistory: {
                        [prototypeData1.id]: history,
                    },
                },
            });
            const response = httpMocks.createResponse();

            renderPrototypePage(request, response);

            expect(nunjucksRenderStringMock).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({ backLinkHref: backLinkHref })
            );
        }
    );
});

describe('renderResultsPage', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let renderResultsPage: (req: any, res: any) => Promise<void>;
    let momentFromNowMock: jest.Mock;
    beforeEach(async () => {
        momentFromNowMock = jest.fn().mockReturnValue('2 hours ago');
        jest.doMock('moment', () => {
            const moment = jest.fn(() => ({
                fromNow: momentFromNowMock,
            }));
            return moment;
        });
        ({ renderResultsPage } = await import('../prototype-routes'));
    });

    it('should render results.njk for prototype owner', async () => {
        const request = httpMocks.createRequest({
            method: 'GET',
            params: { id: prototypeData1.id },
            prototypeData: prototypeData1,
            user: user1,
        });
        const response = httpMocks.createResponse();

        await renderResultsPage(request, response);

        expect(response.statusCode).toBe(200);
        expect(response._getRenderView()).toBe('results.njk');
        const data = response._getRenderData() as ResultsTemplatePayload;
        expect(data.enableSuggestions).toBe(true);
        expect(data.isOwner).toBe(true);
        expect(data.prototypeId).toBe(prototypeData1.id);
        expect(data.prototypeTitle).toBe(prototypeData1.json.title);
    });

    it('should render results.njk for non-owner', async () => {
        canUserAccessWorkspaceMock.mockResolvedValueOnce(false);
        const request = httpMocks.createRequest({
            method: 'GET',
            params: { id: prototypeData3.id },
            prototypeData: prototypeData3,
            user: user1,
        });
        const response = httpMocks.createResponse();

        await renderResultsPage(request, response);

        expect(response.statusCode).toBe(200);
        expect(response._getRenderView()).toBe('results.njk');
        const data = response._getRenderData() as ResultsTemplatePayload;
        expect(data.allUsers).toEqual([]);
        expect(data.allWorkspaces).toHaveLength(1);
        expect(data.allWorkspaces[0].selected).toBe(true);
        expect(data.isOwner).toBe(false);
    });

    it('should include previous prototypes in render data', async () => {
        const previousPrototypes = [
            {
                ...prototypeData2,
                changesMade: 'Added question',
                creatorUserId: user1.id,
            },
            {
                ...prototypeData3,
                changesMade: 'Changed title',
                creatorUserId: user2.id,
            },
        ];
        getPreviousPrototypesMock.mockResolvedValueOnce(previousPrototypes);
        const request = httpMocks.createRequest({
            method: 'GET',
            params: { id: prototypeData1.id },
            prototypeData: prototypeData1,
            user: user1,
        });
        const response = httpMocks.createResponse();

        await renderResultsPage(request, response);

        const data = response._getRenderData() as ResultsTemplatePayload;
        expect(data.additionalCountPreviousPrototypes).toBe(0);
        expect(data.previousPrototypesRows).toHaveLength(3); // 2 previous + 1 current
        expect(data.totalCountPreviousPrototypes).toBe(2);
    });

    it('should limit previous prototypes to NUMBER_OF_PREVIOUS_PROTOTYPES_TO_SHOW', async () => {
        const manyPreviousPrototypes = Array.from({ length: 15 }, (_, i) => ({
            ...prototypeData2,
            changesMade: `Change ${String(i)}`,
            creatorUserId: user1.id,
            id: `prototype-${String(i)}`,
        }));
        getPreviousPrototypesMock.mockResolvedValueOnce(manyPreviousPrototypes);
        const request = httpMocks.createRequest({
            method: 'GET',
            params: { id: prototypeData1.id },
            prototypeData: prototypeData1,
            user: user1,
        });
        const response = httpMocks.createResponse();

        await renderResultsPage(request, response);

        const data = response._getRenderData() as ResultsTemplatePayload;
        expect(data.additionalCountPreviousPrototypes).toBe(8);
        expect(data.previousPrototypesRows).toHaveLength(8); // 7 shown + 1 current
        expect(data.totalCountPreviousPrototypes).toBe(15);
    });

    it('should show an unknown user if creator of previous prototype does not exist', async () => {
        const manyPreviousPrototypes = Array.from({ length: 15 }, (_, i) => ({
            ...prototypeData2,
            changesMade: `Change ${String(i)}`,
            creatorUserId: 'unknown-id',
            id: `prototype-${String(i)}`,
        }));
        getPreviousPrototypesMock.mockResolvedValueOnce(manyPreviousPrototypes);
        const request = httpMocks.createRequest({
            method: 'GET',
            params: { id: prototypeData1.id },
            prototypeData: prototypeData1,
            user: user1,
        });
        const response = httpMocks.createResponse();

        await renderResultsPage(request, response);

        const data = response._getRenderData() as ResultsTemplatePayload;
        expect(data.additionalCountPreviousPrototypes).toBe(8);
        expect(data.previousPrototypesRows).toHaveLength(8); // 7 shown + 1 current
        expect(data.previousPrototypesRows[2][0].html).toContain(
            'an&nbsp;unknown&nbsp;user'
        );
        expect(data.totalCountPreviousPrototypes).toBe(15);
    });

    it.each([
        ['json', true],
        ['text', false],
    ])(
        'should set showJsonPrompt based on generatedFrom (%s)',
        async (generatedFrom, expected) => {
            const prototypeWithGeneratedFrom = {
                ...prototypeData1,
                generatedFrom,
            };
            const request = httpMocks.createRequest({
                method: 'GET',
                params: { id: prototypeData1.id },
                prototypeData: prototypeWithGeneratedFrom,
                user: user1,
            });
            const response = httpMocks.createResponse();

            await renderResultsPage(request, response);

            const data = response._getRenderData() as ResultsTemplatePayload;
            expect(data.showJsonPrompt).toBe(expected);
        }
    );

    it.each([
        [true, true],
        [false, false],
    ])(
        'should set enableSuggestions based on environment (%s)',
        async (suggestionsEnabled, expected) => {
            getEnvironmentVariablesMock.mockReturnValueOnce({
                SUGGESTIONS_ENABLED: suggestionsEnabled,
            });
            const request = httpMocks.createRequest({
                method: 'GET',
                params: { id: prototypeData1.id },
                prototypeData: prototypeData1,
                user: user1,
            });
            const response = httpMocks.createResponse();

            await renderResultsPage(request, response);

            const data = response._getRenderData() as ResultsTemplatePayload;
            expect(data.enableSuggestions).toBe(expected);
        }
    );

    it.each([true, false])(
        'should set isLivePrototypePublic correctly (%s)',
        async (livePrototypePublic) => {
            const prototypeWithPublic = {
                ...prototypeData1,
                livePrototypePublic: livePrototypePublic,
            };
            const request = httpMocks.createRequest({
                method: 'GET',
                params: { id: prototypeData1.id },
                prototypeData: prototypeWithPublic,
                user: user1,
            });
            const response = httpMocks.createResponse();

            await renderResultsPage(request, response);

            const data = response._getRenderData() as ResultsTemplatePayload;
            expect(data.isLivePrototypePublic).toBe(livePrototypePublic);
        }
    );

    it('should include shared users in render data', async () => {
        const prototypeWithSharedUsers = {
            ...prototypeData1,
            sharedWithUserIds: [user2.id],
        };
        const request = httpMocks.createRequest({
            method: 'GET',
            params: { id: prototypeData1.id },
            prototypeData: prototypeWithSharedUsers,
            user: user1,
        });
        const response = httpMocks.createResponse();

        await renderResultsPage(request, response);

        const data = response._getRenderData() as ResultsTemplatePayload;
        expect(data.sharedWithUsers).toHaveLength(1);
        expect(data.sharedWithUsers[0].id).toBe(user2.id);
    });

    it('should filter out non-existent shared users', async () => {
        const prototypeWithInvalidUsers = {
            ...prototypeData1,
            sharedWithUserIds: [user2.id, 'non-existent-user'],
        };
        const request = httpMocks.createRequest({
            method: 'GET',
            params: { id: prototypeData1.id },
            prototypeData: prototypeWithInvalidUsers,
            user: user1,
        });
        const response = httpMocks.createResponse();

        await renderResultsPage(request, response);

        const data = response._getRenderData() as ResultsTemplatePayload;
        expect(data.sharedWithUsers).toHaveLength(1);
        expect(data.sharedWithUsers[0].id).toBe(user2.id);
    });

    it('should generate workspace names correctly for personal workspace', async () => {
        getWorkspaceByIdMock.mockResolvedValueOnce(user1PersonalWorkspace);
        getWorkspacesByUserIdMock.mockResolvedValueOnce([
            user1PersonalWorkspace,
        ]);
        const request = httpMocks.createRequest({
            method: 'GET',
            params: { id: prototypeData1.id },
            prototypeData: prototypeData1,
            user: user1,
        });
        const response = httpMocks.createResponse();

        await renderResultsPage(request, response);

        const data = response._getRenderData() as ResultsTemplatePayload;
        expect(data.allWorkspaces[0].text).toContain('(private)');
    });

    it('should generate workspace names correctly for multi-user workspace', async () => {
        const multiUserWorkspace = {
            ...workspace3,
            userIds: [user1.id, user2.id, 'user3'],
        };
        getWorkspaceByIdMock.mockResolvedValueOnce(multiUserWorkspace);
        getWorkspacesByUserIdMock.mockResolvedValueOnce([multiUserWorkspace]);
        const request = httpMocks.createRequest({
            method: 'GET',
            params: { id: prototypeData2.id },
            prototypeData: prototypeData2,
            user: user1,
        });
        const response = httpMocks.createResponse();

        await renderResultsPage(request, response);

        const data = response._getRenderData() as ResultsTemplatePayload;
        expect(data.allWorkspaces[0].text).toContain('(3 users)');
    });

    it('should generate workspace names correctly for single-user workspace', async () => {
        const singleUserWorkspace = {
            ...workspace3,
            userIds: [user1.id],
        };
        getWorkspaceByIdMock.mockResolvedValueOnce(singleUserWorkspace);
        getWorkspacesByUserIdMock.mockResolvedValueOnce([singleUserWorkspace]);
        const request = httpMocks.createRequest({
            method: 'GET',
            params: { id: prototypeData2.id },
            prototypeData: prototypeData2,
            user: user1,
        });
        const response = httpMocks.createResponse();

        await renderResultsPage(request, response);

        const data = response._getRenderData() as ResultsTemplatePayload;
        expect(data.allWorkspaces[0].text).toContain('(just you)');
    });

    it('should escape quotes in jsonText correctly', async () => {
        const prototypeWithQuotes = {
            ...prototypeData1,
            json: {
                ...prototypeData1.json,
                description: 'A description with "quotes"',
                title: 'Test "quoted" title',
            },
        };
        const request = httpMocks.createRequest({
            method: 'GET',
            params: { id: prototypeData1.id },
            prototypeData: prototypeWithQuotes,
            user: user1,
        });
        const response = httpMocks.createResponse();

        await renderResultsPage(request, response);

        const data = response._getRenderData() as ResultsTemplatePayload;
        expect(data.jsonText).toContain('\\\\"quoted\\\\"');
    });

    it('should set correct livePrototypeUrl', async () => {
        const request = httpMocks.createRequest({
            method: 'GET',
            params: { id: prototypeData1.id },
            prototypeData: prototypeData1,
            user: user1,
        });
        const response = httpMocks.createResponse();

        await renderResultsPage(request, response);

        const data = response._getRenderData() as ResultsTemplatePayload;
        expect(data.livePrototypeUrl).toBe(
            `/prototype/${prototypeData1.id}/start`
        );
    });

    it('should include all required data fields', async () => {
        const request = httpMocks.createRequest({
            method: 'GET',
            params: { id: prototypeData1.id },
            prototypeData: prototypeData1,
            user: user1,
        });
        const response = httpMocks.createResponse();

        await renderResultsPage(request, response);

        const data = response._getRenderData() as ResultsTemplatePayload;
        const requiredFields = [
            'additionalCountPreviousPrototypes',
            'allUsers',
            'allWorkspaces',
            'designSystem',
            'enableSuggestions',
            'explanation',
            'firstPrompt',
            'isLivePrototypePublic',
            'isOwner',
            'json',
            'jsonText',
            'livePrototypePublicPassword',
            'livePrototypeUrl',
            'previousPrototypesRows',
            'prototypeId',
            'prototypeTitle',
            'sharedWithUsers',
            'showJsonPrompt',
            'totalCountPreviousPrototypes',
            'workspace',
        ];
        for (const field of requiredFields) {
            expect(data).toHaveProperty(field);
        }
    });

    it('should filter allUsers to exclude current user for owners', async () => {
        const request = httpMocks.createRequest({
            method: 'GET',
            params: { id: prototypeData1.id },
            prototypeData: prototypeData1,
            user: user1,
        });
        const response = httpMocks.createResponse();

        await renderResultsPage(request, response);

        const data = response._getRenderData() as ResultsTemplatePayload;
        expect(data.isOwner).toBe(true);
        expect(data.allUsers).toHaveLength(1);
        expect(data.allUsers[0].id).toBe(user2.id);
        expect(
            data.allUsers.find((u: IUser) => u.id === user1.id)
        ).toBeUndefined();
    });

    it('should include structureVM with list matching questions and valid Mermaid flow', async () => {
        const request = httpMocks.createRequest({
            method: 'GET',
            params: { id: prototypeData1.id },
            prototypeData: prototypeData1,
            user: user1,
        });

        const response = httpMocks.createResponse();

        await renderResultsPage(request, response);

        expect(response.statusCode).toBe(200);
        expect(response._getRenderView()).toBe('results.njk');

        const data = response._getRenderData() as Record<string, unknown>;
        expect(data.structureVM).toBeDefined();

        const structureVM = data.structureVM as {
            list: {
                answerType: string;
                branchingOptions?: unknown[];
                index: number;
                nextJumpTarget?: unknown;
                options?: unknown[];
                questionText: string;
                showNextJump?: boolean;
            }[];
            mermaid: string;
        };

        expect(Array.isArray(structureVM.list)).toBe(true);

        expect(structureVM.list.length).toBe(
            prototypeData1.json.questions.length
        );

        structureVM.list.forEach((item, idx) => {
            expect(item.index).toBe(idx + 1);
            expect(typeof item.answerType).toBe('string');
            expect(typeof item.questionText).toBe('string');
        });

        expect(typeof structureVM.mermaid).toBe('string');

        expect(structureVM.mermaid).toContain('flowchart TD');
        expect(structureVM.mermaid).toContain('Finish(["End"])');

        for (let i = 1; i <= prototypeData1.json.questions.length; i++) {
            expect(structureVM.mermaid).toContain(`Q${i}[`);
        }
    });

    it('includes overviewVM with correct prompt mode and suggestion flags', async () => {
        const request = httpMocks.createRequest({
            method: 'GET',
            params: { id: prototypeData1.id },
            prototypeData: prototypeData1,
            user: user1,
        });
        const response = httpMocks.createResponse();

        await renderResultsPage(request, response);

        const data = response._getRenderData() as ResultsTemplatePayload & {
            overviewVM: OverviewVM;
            structureVM: StructureVM;
        };

        const overviewVM = data.overviewVM;
        expect(['json', 'text']).toContain(overviewVM.promptType);
        expect(typeof overviewVM.showJsonEditor).toBe('boolean');
        expect(typeof overviewVM.switchPromptButtonText).toBe('string');
        expect(Array.isArray(overviewVM.suggestions)).toBe(true);
    });

    it('includes historyVM with correct row structure and counts', async () => {
        const request = httpMocks.createRequest({
            method: 'GET',
            params: { id: prototypeData1.id },
            prototypeData: prototypeData1,
            user: user1,
        });
        const response = httpMocks.createResponse();

        await renderResultsPage(request, response);

        const renderData =
            response._getRenderData() as ResultsTemplatePayload & {
                historyVM: HistoryVM;
            };

        const historyVM = renderData.historyVM;

        expect(historyVM).toBeDefined();
        expect(Array.isArray(historyVM.rows)).toBe(true);
        expect(historyVM.rows.length).toBeGreaterThan(0);

        expect(historyVM.rows[0][0].html).toContain('this&nbsp;version');

        expect(historyVM.totalCount).toBeGreaterThanOrEqual(
            historyVM.rows.length - 1
        );

        expect(typeof historyVM.hasMultiple).toBe('boolean');
    });
});

describe('handleUpdatePrototype', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let handleUpdatePrototype: (req: any, res: any) => Promise<void>;
    let updateFormWithOpenAIMock: jest.Mock;
    let validateTemplateDataTextMock: jest.Mock;
    let getFormSchemaForJsonInputValidationMock: jest.Mock;

    beforeEach(async () => {
        updateFormWithOpenAIMock = jest
            .fn()
            .mockResolvedValue(JSON.stringify(prototypeData2.json));
        validateTemplateDataTextMock = jest
            .fn()
            .mockImplementation((text: string) => {
                return JSON.parse(text) as TemplateData;
            });
        getFormSchemaForJsonInputValidationMock = jest.fn().mockReturnValue({});
        jest.doMock('../../openai', () => ({
            updateFormWithOpenAI: updateFormWithOpenAIMock,
        }));
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        jest.doMock('../../utils', () => ({
            ...jest.requireActual('../../utils'),
            getEnvironmentVariables: getEnvironmentVariablesMock,
            getFormSchemaForJsonInputValidation:
                getFormSchemaForJsonInputValidationMock,
            validateTemplateDataText: validateTemplateDataTextMock,
        }));

        ({ handleUpdatePrototype } = await import('../prototype-routes'));
    });

    describe('prototype access scenarios', () => {
        it('should return 404 JSON response if prototype not found and request is fetch', async () => {
            getPrototypeByIdMock.mockResolvedValueOnce(null);
            const request = httpMocks.createRequest({
                body: { prompt: 'Update this', prototypeId: 'non-existent-id' },
                headers: { 'sec-fetch-dest': 'empty' },
                method: 'POST',
                user: user1,
            });
            const response = httpMocks.createResponse();

            await handleUpdatePrototype(request, response);

            expect(response.statusCode).toBe(404);
            expect(response._getJSONData()).toEqual({
                message: 'Prototype not found',
            });
        });

        it.each([
            ['navigate', false],
            ['iframe', true],
        ])(
            'should render 404 page if prototype not found (header=%s)',
            async (secFetchDest, insideIframe) => {
                getPrototypeByIdMock.mockResolvedValueOnce(null);
                const request = httpMocks.createRequest({
                    body: {
                        prompt: 'Update this',
                        prototypeId: 'non-existent-id',
                    },
                    headers: { 'sec-fetch-dest': secFetchDest },
                    method: 'POST',
                    user: user1,
                });
                const response = httpMocks.createResponse();

                await handleUpdatePrototype(request, response);

                expect(response.statusCode).toBe(404);
                expect(response._getRenderView()).toBe(
                    'prototype-not-found.njk'
                );
                expect(response._getRenderData()).toEqual({
                    insideIframe: insideIframe,
                });
            }
        );

        it.each([
            ['navigate', false],
            ['iframe', true],
        ])(
            'should render 404 page if user cannot access prototype (header=%s)',
            async (secFetchDest, insideIframe) => {
                canUserAccessPrototypeMock.mockResolvedValueOnce(false);
                const request = httpMocks.createRequest({
                    body: {
                        prompt: 'Update this',
                        prototypeId: 'non-existent-id',
                    },
                    headers: { 'sec-fetch-dest': secFetchDest },
                    method: 'POST',
                    user: user1,
                });
                const response = httpMocks.createResponse();

                await handleUpdatePrototype(request, response);

                expect(response.statusCode).toBe(404);
                expect(response._getRenderView()).toBe(
                    'prototype-not-found.njk'
                );
                expect(response._getRenderData()).toEqual({
                    insideIframe: insideIframe,
                });
            }
        );
    });

    describe('OpenAI prompt handling', () => {
        it('should call updateFormWithOpenAI when prompt is provided', async () => {
            const prompt = 'Add a new email question';
            const request = httpMocks.createRequest({
                body: {
                    designSystem: 'GOV.UK',
                    prompt,
                    prototypeId: prototypeData1.id,
                },
                method: 'POST',
                user: user1,
            });
            const response = httpMocks.createResponse();

            await handleUpdatePrototype(request, response);

            expect(updateFormWithOpenAIMock).toHaveBeenCalledWith(
                expect.objectContaining({ SUGGESTIONS_ENABLED: true }),
                prompt,
                prototypeData1.json,
                'GOV.UK',
                true
            );
            expect(response.statusCode).toBe(201);
            expect(response._getJSONData()).toEqual({
                message: 'Prototype updated successfully',
                url: `/prototype/${prototypeData2.id}`,
            });
        });

        it('should handle escaped quotes in OpenAI response', async () => {
            const responseWithEscapedQuotes = JSON.stringify({
                ...prototypeData2.json,
                description: 'A form with \\"quoted\\" text',
            });
            updateFormWithOpenAIMock.mockResolvedValueOnce(
                responseWithEscapedQuotes
            );

            const request = httpMocks.createRequest({
                body: {
                    prompt: 'Update description with quotes',
                    prototypeId: prototypeData1.id,
                },
                method: 'POST',
                user: user1,
            });
            const response = httpMocks.createResponse();

            await handleUpdatePrototype(request, response);

            expect(validateTemplateDataTextMock).toHaveBeenCalledWith(
                expect.stringContaining('\\\\“quoted\\\\“'),
                expect.objectContaining({}) // formSchema
            );
            expect(response.statusCode).toBe(201);
        });

        it('should handle backslashes in OpenAI response', async () => {
            const responseWithBackslashes = JSON.stringify({
                ...prototypeData2.json,
                description: 'A form with \\backslashes',
            });
            updateFormWithOpenAIMock.mockResolvedValueOnce(
                responseWithBackslashes
            );

            const request = httpMocks.createRequest({
                body: {
                    prompt: 'Add line breaks',
                    prototypeId: prototypeData1.id,
                },
                method: 'POST',
                user: user1,
            });
            const response = httpMocks.createResponse();

            await handleUpdatePrototype(request, response);

            const validateCall = (
                validateTemplateDataTextMock.mock.calls[0] as TemplateData[]
            )[0];
            expect(validateCall).toContain('\\\\');
            expect(response.statusCode).toBe(201);
        });
    });

    describe('design system handling', () => {
        it.each([
            ['GOV.UK', 'GOV.UK'],
            ['HMRC', 'HMRC'],
            ['invalid-system', 'GOV.UK'], // Should default to GOV.UK
            [undefined, 'GOV.UK'], // Should use existing design system
        ])(
            'should handle design system correctly (%s)',
            async (designSystem, expectedDesignSystem) => {
                const request = httpMocks.createRequest({
                    body: {
                        designSystem,
                        prototypeId: prototypeData1.id,
                        // No prompt provided - should trigger design system update only
                    },
                    method: 'POST',
                    user: user1,
                });
                const response = httpMocks.createResponse();

                await handleUpdatePrototype(request, response);

                expect(response.statusCode).toBe(201);
                expect(response._getJSONData()).toEqual({
                    message: 'Prototype updated successfully',
                    url: `/prototype/${prototypeData2.id}`,
                });

                const storeCall = (
                    storePrototypeMock.mock.calls[0] as IPrototypeData[]
                )[0];
                expect(storeCall.designSystem).toBe(expectedDesignSystem);
                expect(storeCall.json.changes_made).toBe(
                    `Updated design system to ${expectedDesignSystem}`
                );
                expect(storeCall.json.explanation).toBe(
                    `The design system has been updated to ${expectedDesignSystem}.`
                );
            }
        );
    });

    describe('workspace handling', () => {
        it('should use provided workspace ID if user has access', async () => {
            const targetWorkspaceId = workspaceId3.toString();
            const request = httpMocks.createRequest({
                body: {
                    prompt: 'Update form',
                    prototypeId: prototypeData1.id,
                    workspaceId: targetWorkspaceId,
                },
                method: 'POST',
                user: user1,
            });
            const response = httpMocks.createResponse();

            await handleUpdatePrototype(request, response);

            expect(canUserAccessWorkspaceMock).toHaveBeenCalledWith(
                user1.id,
                targetWorkspaceId
            );
            const storeCall = (
                storePrototypeMock.mock.calls[0] as IPrototypeData[]
            )[0];
            expect(storeCall.workspaceId).toBe(targetWorkspaceId);
            expect(response.statusCode).toBe(201);
        });

        it('should fall back to personal workspace if user cannot access provided workspace', async () => {
            canUserAccessWorkspaceMock.mockImplementation(
                (userId: string, workspaceId: string) => {
                    if (workspaceId === user1.personalWorkspaceId)
                        return Promise.resolve(true);
                    return Promise.resolve(false);
                }
            );

            const request = httpMocks.createRequest({
                body: {
                    prompt: 'Update form',
                    prototypeId: prototypeData1.id,
                    workspaceId: 'inaccessible-workspace',
                },
                method: 'POST',
                user: user1,
            });
            const response = httpMocks.createResponse();

            await handleUpdatePrototype(request, response);

            const storeCall = (
                storePrototypeMock.mock.calls[0] as IPrototypeData[]
            )[0];
            expect(storeCall.workspaceId).toBe(user1.personalWorkspaceId);
            expect(response.statusCode).toBe(201);
        });
    });

    describe('prototype data handling', () => {
        it('should create new prototype with correct data structure', async () => {
            const prompt = 'Add validation to email field';
            const request = httpMocks.createRequest({
                body: {
                    designSystem: 'HMRC',
                    prompt,
                    prototypeId: prototypeData1.id,
                    workspaceId: workspaceId3.toString(),
                },
                method: 'POST',
                user: user1,
            });
            const response = httpMocks.createResponse();

            await handleUpdatePrototype(request, response);

            const storeCall = (
                storePrototypeMock.mock.calls[0] as IPrototypeData[]
            )[0];
            expect(storeCall).toEqual({
                changesMade: prototypeData2.json.changes_made,
                creatorUserId: user1.id,
                designSystem: 'HMRC',
                firstPrompt: prototypeData1.firstPrompt,
                generatedFrom: 'text',
                json: prototypeData2.json,
                livePrototypePublic: false,
                livePrototypePublicPassword: '',
                previousId: prototypeData1.id,
                prompt: prompt,
                sharedWithUserIds: [...prototypeData1.sharedWithUserIds],
                workspaceId: workspaceId3.toString(),
            });
            expect(response.statusCode).toBe(201);
        });

        it('should preserve shared user IDs and remove duplicates', async () => {
            const prototypeWithSharedUsers = {
                ...prototypeData1,
                sharedWithUserIds: [user2.id, user1.id, user2.id], // Has duplicates
            };
            getPrototypeByIdMock.mockResolvedValueOnce(
                prototypeWithSharedUsers
            );

            const request = httpMocks.createRequest({
                body: {
                    prompt: 'Update form',
                    prototypeId: prototypeData1.id,
                },
                method: 'POST',
                user: user1,
            });
            const response = httpMocks.createResponse();

            await handleUpdatePrototype(request, response);

            const storeCall = (
                storePrototypeMock.mock.calls[0] as IPrototypeData[]
            )[0];
            expect(storeCall.sharedWithUserIds).toEqual([user2.id, user1.id]);
            expect(response.statusCode).toBe(201);
        });
        it('should handle missing changes_made in template data', async () => {
            const templateDataWithoutChanges = {
                ...prototypeData2.json,
                changes_made: undefined,
            };
            validateTemplateDataTextMock.mockReturnValueOnce(
                templateDataWithoutChanges
            );

            const request = httpMocks.createRequest({
                body: {
                    prompt: 'Update form',
                    prototypeId: prototypeData1.id,
                },
                method: 'POST',
                user: user1,
            });
            const response = httpMocks.createResponse();

            await handleUpdatePrototype(request, response);

            const storeCall = (
                storePrototypeMock.mock.calls[0] as IPrototypeData[]
            )[0];
            expect(storeCall.changesMade).toBe('Updated prototype');
            expect(response.statusCode).toBe(201);
        });
    });

    describe('validation schema handling', () => {
        it('should use design system schema for design system updates only', async () => {
            const request = httpMocks.createRequest({
                body: {
                    designSystem: 'HMRC',
                    prototypeId: prototypeData1.id,
                    // No prompt - design system update only
                },
                method: 'POST',
                user: user1,
            });
            const response = httpMocks.createResponse();

            await handleUpdatePrototype(request, response);

            expect(getFormSchemaForJsonInputValidationMock).toHaveBeenCalled();
            expect(validateTemplateDataTextMock).toHaveBeenCalledWith(
                expect.any(String),
                {}
            );
            expect(response.statusCode).toBe(201);
        });

        it('should use regular form schema for prompt updates', async () => {
            const request = httpMocks.createRequest({
                body: {
                    prompt: 'Add a question',
                    prototypeId: prototypeData1.id,
                },
                method: 'POST',
                user: user1,
            });
            const response = httpMocks.createResponse();

            await handleUpdatePrototype(request, response);

            expect(
                getFormSchemaForJsonInputValidationMock
            ).not.toHaveBeenCalled();
            expect(validateTemplateDataTextMock).toHaveBeenCalledWith(
                expect.any(String),
                formSchema
            );
            expect(response.statusCode).toBe(201);
        });
    });

    describe('error handling', () => {
        it('should handle validation errors gracefully', async () => {
            const validationError = new Error('Invalid JSON schema');
            validateTemplateDataTextMock.mockImplementation(() => {
                throw validationError;
            });

            const request = httpMocks.createRequest({
                body: {
                    prompt: 'Update form',
                    prototypeId: prototypeData1.id,
                },
                method: 'POST',
                user: user1,
            });
            const response = httpMocks.createResponse();

            await expect(
                handleUpdatePrototype(request, response)
            ).rejects.toThrow(validationError);
        });

        it('should throw for OpenAI API errors', async () => {
            const openAIError = new Error('OpenAI API error');
            updateFormWithOpenAIMock.mockRejectedValueOnce(openAIError);

            const request = httpMocks.createRequest({
                body: {
                    prompt: 'Update form',
                    prototypeId: prototypeData1.id,
                },
                method: 'POST',
                user: user1,
            });
            const response = httpMocks.createResponse();

            await expect(
                handleUpdatePrototype(request, response)
            ).rejects.toThrow(openAIError);
        });

        it('should throw for database storage errors', async () => {
            const storageError = new Error('Database connection failed');
            storePrototypeMock.mockRejectedValueOnce(storageError);

            const request = httpMocks.createRequest({
                body: {
                    prompt: 'Update form',
                    prototypeId: prototypeData1.id,
                },
                method: 'POST',
                user: user1,
            });
            const response = httpMocks.createResponse();

            await expect(
                handleUpdatePrototype(request, response)
            ).rejects.toThrow(storageError);
        });
    });

    describe('comprehensive scenarios', () => {
        it('should handle complete update flow with all parameters', async () => {
            const fullRequest = {
                designSystem: 'HMRC',
                prompt: 'Add comprehensive validation and improve user experience',
                prototypeId: prototypeData1.id,
                workspaceId: workspaceId3.toString(),
            };

            const request = httpMocks.createRequest({
                body: fullRequest,
                method: 'POST',
                user: user1,
            });
            const response = httpMocks.createResponse();

            await handleUpdatePrototype(request, response);

            // Verify all the integration points were called correctly
            expect(getPrototypeByIdMock).toHaveBeenCalledWith(
                fullRequest.prototypeId
            );
            expect(canUserAccessPrototypeMock).toHaveBeenCalledWith(
                user1.id,
                prototypeData1.id
            );
            expect(updateFormWithOpenAIMock).toHaveBeenCalledWith(
                expect.objectContaining({ SUGGESTIONS_ENABLED: true }),
                fullRequest.prompt,
                prototypeData1.json,
                fullRequest.designSystem,
                true
            );
            expect(validateTemplateDataTextMock).toHaveBeenCalled();
            expect(canUserAccessWorkspaceMock).toHaveBeenCalledWith(
                user1.id,
                fullRequest.workspaceId
            );
            expect(storePrototypeMock).toHaveBeenCalled();

            expect(response.statusCode).toBe(201);
            expect(response._getJSONData()).toEqual({
                message: 'Prototype updated successfully',
                url: `/prototype/${prototypeData2.id}`,
            });
        });

        it.each([
            ['with empty prompt', { prompt: '' }],
            ['with null prompt', { prompt: null }],
            ['without prompt property', {}],
        ])(
            'should handle design system update %s',
            async (scenario, promptOverride) => {
                const request = httpMocks.createRequest({
                    body: {
                        designSystem: 'HMRC',
                        prototypeId: prototypeData1.id,
                        ...promptOverride,
                    },
                    method: 'POST',
                    user: user1,
                });
                const response = httpMocks.createResponse();

                await handleUpdatePrototype(request, response);

                // Should not call OpenAI for design system updates
                expect(updateFormWithOpenAIMock).not.toHaveBeenCalled();
                expect(validateTemplateDataTextMock).toHaveBeenCalledWith(
                    expect.stringContaining('Updated design system to HMRC'),
                    {}
                );

                const storeCall = (
                    storePrototypeMock.mock.calls[0] as IPrototypeData[]
                )[0];
                expect(storeCall.designSystem).toBe('HMRC');
                expect(storeCall.json.changes_made).toBe(
                    'Updated design system to HMRC'
                );
                expect(storeCall.json.explanation).toBe(
                    'The design system has been updated to HMRC.'
                );

                expect(response.statusCode).toBe(201);
            }
        );
    });
});

describe('handleCreatePrototype', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let handleCreatePrototype: (req: any, res: any) => Promise<void>;
    let createFormWithOpenAIMock: jest.Mock;
    let validateTemplateDataTextMock: jest.Mock;
    let getFormSchemaForJsonInputValidationMock: jest.Mock;

    beforeEach(async () => {
        createFormWithOpenAIMock = jest
            .fn()
            .mockResolvedValue(JSON.stringify(prototypeData2.json));
        validateTemplateDataTextMock = jest
            .fn()
            .mockImplementation((text: string) => {
                return JSON.parse(text) as TemplateData;
            });
        getFormSchemaForJsonInputValidationMock = jest.fn().mockReturnValue({});
        jest.doMock('../../openai', () => ({
            createFormWithOpenAI: createFormWithOpenAIMock,
        }));
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        jest.doMock('../../utils', () => ({
            ...jest.requireActual('../../utils'),
            getEnvironmentVariables: getEnvironmentVariablesMock,
            getFormSchemaForJsonInputValidation:
                getFormSchemaForJsonInputValidationMock,
            validateTemplateDataText: validateTemplateDataTextMock,
        }));

        ({ handleCreatePrototype } = await import('../prototype-routes'));
    });

    describe('OpenAI prompt handling', () => {
        it('should create a prototype from text prompt with OpenAI', async () => {
            const prompt = 'Create a form for feedback';
            const request = httpMocks.createRequest({
                body: {
                    designSystem: 'GOV.UK',
                    prompt,
                    promptType: 'text',
                    workspaceId: workspaceId3.toString(),
                },
                method: 'POST',
                user: user1,
            });
            const response = httpMocks.createResponse();

            await handleCreatePrototype(request, response);

            expect(createFormWithOpenAIMock).toHaveBeenCalledWith(
                expect.objectContaining({ SUGGESTIONS_ENABLED: true }),
                prompt,
                'GOV.UK',
                true
            );
            expect(validateTemplateDataTextMock).toHaveBeenCalled();
            expect(storePrototypeMock).toHaveBeenCalled();
            expect(response.statusCode).toBe(201);
            expect(response._getJSONData()).toEqual({
                message: 'Prototype created successfully',
                url: `/prototype/${prototypeData2.id}`,
            });
        });

        it('should create a prototype from JSON prompt without OpenAI', async () => {
            const jsonPrompt = JSON.stringify(prototypeData2.json);
            const request = httpMocks.createRequest({
                body: {
                    designSystem: 'GOV.UK',
                    prompt: jsonPrompt,
                    promptType: 'json',
                    workspaceId: workspaceId3.toString(),
                },
                method: 'POST',
                user: user1,
            });
            const response = httpMocks.createResponse();

            await handleCreatePrototype(request, response);

            expect(createFormWithOpenAIMock).not.toHaveBeenCalled();
            expect(validateTemplateDataTextMock).toHaveBeenCalledWith(
                jsonPrompt,
                {}
            );
            expect(storePrototypeMock).toHaveBeenCalled();
            expect(response.statusCode).toBe(201);
        });

        it('should handle escaped quotes in OpenAI response', async () => {
            const responseWithEscapedQuotes = JSON.stringify({
                ...prototypeData2.json,
                description: 'A form with \\"quoted\\" text',
            });
            createFormWithOpenAIMock.mockResolvedValueOnce(
                responseWithEscapedQuotes
            );

            const request = httpMocks.createRequest({
                body: {
                    prompt: 'Update description with quotes',
                    prototypeId: prototypeData1.id,
                },
                method: 'POST',
                user: user1,
            });
            const response = httpMocks.createResponse();

            await handleCreatePrototype(request, response);

            expect(validateTemplateDataTextMock).toHaveBeenCalledWith(
                expect.stringContaining('\\\\“quoted\\\\“'),
                expect.objectContaining({}) // formSchema
            );
            expect(response.statusCode).toBe(201);
        });

        it('should handle backslashes in OpenAI response', async () => {
            const responseWithBackslashes = JSON.stringify({
                ...prototypeData2.json,
                description: 'A form with \\backslashes',
            });
            createFormWithOpenAIMock.mockResolvedValueOnce(
                responseWithBackslashes
            );

            const request = httpMocks.createRequest({
                body: {
                    prompt: 'Add line breaks',
                    prototypeId: prototypeData1.id,
                },
                method: 'POST',
                user: user1,
            });
            const response = httpMocks.createResponse();

            await handleCreatePrototype(request, response);

            const validateCall = (
                validateTemplateDataTextMock.mock.calls[0] as TemplateData[]
            )[0];
            expect(validateCall).toContain('\\\\');
            expect(response.statusCode).toBe(201);
        });
    });

    describe('design system handling', () => {
        it.each([
            ['GOV.UK', 'GOV.UK'],
            ['HMRC', 'HMRC'],
            ['invalid-system', 'GOV.UK'], // Should default to GOV.UK
        ])(
            'should handle design system correctly (%s)',
            async (designSystem, expectedDesignSystem) => {
                const request = httpMocks.createRequest({
                    body: {
                        designSystem,
                        prompt: 'Create a form',
                        promptType: 'text',
                    },
                    method: 'POST',
                    user: user1,
                });
                const response = httpMocks.createResponse();

                await handleCreatePrototype(request, response);

                const storeCall = (
                    storePrototypeMock.mock.calls[0] as IPrototypeData[]
                )[0];
                expect(storeCall.designSystem).toBe(expectedDesignSystem);
            }
        );
    });

    describe('workspace handling', () => {
        it('should use provided workspace ID if user has access', async () => {
            const targetWorkspaceId = workspaceId3.toString();
            const request = httpMocks.createRequest({
                body: {
                    prompt: 'Create a form',
                    promptType: 'text',
                    workspaceId: targetWorkspaceId,
                },
                method: 'POST',
                user: user1,
            });
            const response = httpMocks.createResponse();

            await handleCreatePrototype(request, response);

            expect(canUserAccessWorkspaceMock).toHaveBeenCalledWith(
                user1.id,
                targetWorkspaceId
            );
            const storeCall = (
                storePrototypeMock.mock.calls[0] as IPrototypeData[]
            )[0];
            expect(storeCall.workspaceId).toBe(targetWorkspaceId);
        });

        it('should fall back to personal workspace if user cannot access provided workspace', async () => {
            canUserAccessWorkspaceMock.mockImplementationOnce(
                (userId: string, wsId: string) => {
                    if (wsId === user1.personalWorkspaceId)
                        return Promise.resolve(true);
                    return Promise.resolve(false);
                }
            );
            const request = httpMocks.createRequest({
                body: {
                    prompt: 'Create a form',
                    promptType: 'text',
                    workspaceId: 'invalid-workspace',
                },
                method: 'POST',
                user: user1,
            });
            const response = httpMocks.createResponse();

            await handleCreatePrototype(request, response);

            const storeCall = (
                storePrototypeMock.mock.calls[0] as IPrototypeData[]
            )[0];
            expect(storeCall.workspaceId).toBe(user1.personalWorkspaceId);
        });
    });

    describe('prototype data handling', () => {
        it('should create new prototype with correct data structure', async () => {
            const prompt = 'Create a new form';
            const request = httpMocks.createRequest({
                body: {
                    designSystem: 'GOV.UK',
                    prompt,
                    promptType: 'text',
                    workspaceId: workspaceId3.toString(),
                },
                method: 'POST',
                user: user1,
            });
            const response = httpMocks.createResponse();

            await handleCreatePrototype(request, response);

            const storeCall = (
                storePrototypeMock.mock.calls[0] as IPrototypeData[]
            )[0];
            expect(storeCall).toEqual(
                expect.objectContaining({
                    changesMade: 'Created prototype',
                    creatorUserId: user1.id,
                    designSystem: 'GOV.UK',
                    firstPrompt: prompt,
                    generatedFrom: 'text',
                    json: prototypeData2.json,
                    livePrototypePublic: false,
                    livePrototypePublicPassword: '',
                    workspaceId: workspaceId3.toString(),
                })
            );
        });

        it.each([
            [
                'text',
                'Create a form to ask for a name',
                'Create a form to ask for a name',
            ],
            ['json', JSON.stringify(prototypeData1), undefined],
        ])(
            'should set prompt correctly where promptType is %s',
            async (
                promptType: string,
                userPrompt: string,
                savedPrompt: string | undefined
            ) => {
                const request = httpMocks.createRequest({
                    body: {
                        prompt: userPrompt,
                        promptType: promptType,
                        prototypeId: prototypeData3.id,
                    },
                    method: 'POST',
                    user: user1,
                });
                const response = httpMocks.createResponse();

                await handleCreatePrototype(request, response);

                const storeCall = (
                    storePrototypeMock.mock.calls[0] as IPrototypeData[]
                )[0];
                expect(storeCall.prompt).toEqual(savedPrompt);
            }
        );

        it('should preserve shared user IDs from old prototype', async () => {
            const request = httpMocks.createRequest({
                body: {
                    prompt: JSON.stringify(prototypeData2.json),
                    promptType: 'json',
                    prototypeId: prototypeData3.id,
                },
                method: 'POST',
                user: user1,
            });
            const response = httpMocks.createResponse();

            await handleCreatePrototype(request, response);

            const storeCall = (
                storePrototypeMock.mock.calls[0] as IPrototypeData[]
            )[0];
            expect(storeCall.sharedWithUserIds).toEqual([user2.id]);
        });
    });

    describe('validation schema handling', () => {
        it('should use modified form schema for JSON validation for JSON prompt', async () => {
            const request = httpMocks.createRequest({
                body: {
                    prompt: JSON.stringify(prototypeData2.json),
                    promptType: 'json',
                },
                method: 'POST',
                user: user1,
            });
            const response = httpMocks.createResponse();

            await handleCreatePrototype(request, response);

            expect(getFormSchemaForJsonInputValidationMock).toHaveBeenCalled();
            expect(validateTemplateDataTextMock).toHaveBeenCalledWith(
                expect.any(String),
                {}
            );
        });

        it('should use regular form schema for JSON validation for text prompt', async () => {
            const request = httpMocks.createRequest({
                body: {
                    prompt: 'Create a form',
                    promptType: 'text',
                },
                method: 'POST',
                user: user1,
            });
            const response = httpMocks.createResponse();

            await handleCreatePrototype(request, response);

            expect(
                getFormSchemaForJsonInputValidationMock
            ).not.toHaveBeenCalled();
            expect(validateTemplateDataTextMock).toHaveBeenCalledWith(
                expect.any(String),
                formSchema
            );
        });
    });

    describe('error handling', () => {
        it('should return 400 for invalid JSON prompt', async () => {
            validateTemplateDataTextMock.mockImplementationOnce(() => {
                throw new Error('Invalid JSON');
            });
            const request = httpMocks.createRequest({
                body: {
                    prompt: '{invalid:}',
                    promptType: 'json',
                },
                method: 'POST',
                user: user1,
            });
            const response = httpMocks.createResponse();

            await handleCreatePrototype(request, response);

            expect(response.statusCode).toBe(400);
            expect(response._getJSONData()).toHaveProperty('message');
            expect(setSpanAttributeMock).toHaveBeenCalledTimes(0);
        });

        it('should set span attributes with error details if there is an active span', async () => {
            validateTemplateDataTextMock.mockImplementationOnce(() => {
                const error = new Error('Invalid JSON');
                error.name = 'ValidationError';
                error.message = 'Invalid JSON';
                error.stack = 'custom stack trace';
                throw error;
            });
            const request = httpMocks.createRequest({
                body: {
                    prompt: '{invalid:}',
                    promptType: 'json',
                },
                method: 'POST',
                user: user1,
            });
            const response = httpMocks.createResponse();
            getActiveSpanMock.mockReturnValueOnce({
                setAttribute: setSpanAttributeMock,
            });

            await handleCreatePrototype(request, response);

            expect(response.statusCode).toBe(400);
            expect(response._getJSONData()).toHaveProperty('message');
            expect(setSpanAttributeMock).toHaveBeenCalledTimes(3);
            expect(setSpanAttributeMock).toHaveBeenCalledWith(
                'error.name',
                'ValidationError'
            );
            expect(setSpanAttributeMock).toHaveBeenCalledWith(
                'error.message',
                'Invalid JSON'
            );
            expect(setSpanAttributeMock).toHaveBeenCalledWith(
                'error.stack',
                'custom stack trace'
            );
        });

        it('should set span attributes with empty strings if there is an active span', async () => {
            validateTemplateDataTextMock.mockImplementationOnce(() => {
                const error = new Error('Invalid JSON');
                error.name = undefined as unknown as string;
                error.message = undefined as unknown as string;
                error.stack = undefined as unknown as string;
                throw error;
            });
            const request = httpMocks.createRequest({
                body: {
                    prompt: '{invalid:}',
                    promptType: 'json',
                },
                method: 'POST',
                user: user1,
            });
            const response = httpMocks.createResponse();
            getActiveSpanMock.mockReturnValueOnce({
                setAttribute: setSpanAttributeMock,
            });

            await handleCreatePrototype(request, response);

            expect(response.statusCode).toBe(400);
            expect(response._getJSONData()).toHaveProperty('message');
            expect(setSpanAttributeMock).toHaveBeenCalledTimes(3);
            expect(setSpanAttributeMock).toHaveBeenCalledWith('error.name', '');
            expect(setSpanAttributeMock).toHaveBeenCalledWith(
                'error.message',
                ''
            );
            expect(setSpanAttributeMock).toHaveBeenCalledWith(
                'error.stack',
                ''
            );
        });

        it('should throw for OpenAI API errors', async () => {
            const openAIError = new Error('OpenAI error');
            createFormWithOpenAIMock.mockRejectedValueOnce(openAIError);
            const request = httpMocks.createRequest({
                body: {
                    prompt: 'Create a form',
                    promptType: 'text',
                },
                method: 'POST',
                user: user1,
            });
            const response = httpMocks.createResponse();

            await expect(
                handleCreatePrototype(request, response)
            ).rejects.toThrow(openAIError);
        });

        it('should throw for database storage errors', async () => {
            const storageError = new Error('DB error');
            storePrototypeMock.mockRejectedValueOnce(storageError);
            const request = httpMocks.createRequest({
                body: {
                    prompt: 'Create a form',
                    promptType: 'text',
                },
                method: 'POST',
                user: user1,
            });
            const response = httpMocks.createResponse();

            await expect(
                handleCreatePrototype(request, response)
            ).rejects.toThrow(storageError);
        });
    });

    describe('comprehensive scenarios', () => {
        it('should handle complete create flow with all parameters', async () => {
            const fullRequest = {
                designSystem: 'HMRC',
                prompt: 'Create a comprehensive feedback form',
                promptType: 'text',
                workspaceId: workspaceId3.toString(),
            };

            const request = httpMocks.createRequest({
                body: fullRequest,
                method: 'POST',
                user: user1,
            });
            const response = httpMocks.createResponse();

            await handleCreatePrototype(request, response);

            // Verify all the integration points were called correctly
            expect(createFormWithOpenAIMock).toHaveBeenCalledWith(
                expect.objectContaining({ SUGGESTIONS_ENABLED: true }),
                fullRequest.prompt,
                fullRequest.designSystem,
                true
            );
            expect(validateTemplateDataTextMock).toHaveBeenCalled();
            expect(canUserAccessWorkspaceMock).toHaveBeenCalledWith(
                user1.id,
                fullRequest.workspaceId
            );
            expect(storePrototypeMock).toHaveBeenCalled();

            expect(response.statusCode).toBe(201);
            expect(response._getJSONData()).toEqual({
                message: 'Prototype created successfully',
                url: `/prototype/${prototypeData2.id}`,
            });
        });
    });
});

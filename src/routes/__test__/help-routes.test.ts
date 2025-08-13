import httpMocks from 'node-mocks-http';

const mockHelpFiles = {
    help_files: [
        { filename: 'introduction', title: 'Introduction' },
        { filename: 'usage', title: 'Usage' },
        { filename: 'sharing', title: 'Sharing your prototype' },
    ],
};
beforeEach(() => {
    jest.resetModules();
    jest.doMock('../middleware', () => ({
        verifyUser: jest.fn(),
    }));
    jest.doMock('../../../docs/help/help-files.json', () => mockHelpFiles);
    jest.doMock('fs', () => ({
        readFileSync: jest.fn().mockImplementation((filePath: string) => {
            if (filePath.includes('introduction.md')) return '# Introduction';
            if (filePath.includes('usage.md')) return '# Usage';
            if (filePath.includes('sharing.md'))
                return '# Sharing your prototype';
            throw new Error('File not found');
        }),
    }));
});

afterEach(() => {
    jest.clearAllMocks();
});

describe('redirectToFirstHelpFile', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let redirectToFirstHelpFile: (req: any, res: any) => void;
    beforeEach(async () => {
        ({ redirectToFirstHelpFile } = await import('../help-routes'));
    });

    it('should redirect permanently to the first help file', () => {
        const request = httpMocks.createRequest({
            method: 'GET',
            url: '/help',
        });
        const response = httpMocks.createResponse();

        redirectToFirstHelpFile(request, response);

        expect(response.statusCode).toBe(302);
        expect(response._getRedirectUrl()).toBe('/help/introduction');
    });
});

describe('renderHelpFile', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let renderHelpFile: (req: any, res: any) => void;
    beforeEach(async () => {
        ({ renderHelpFile } = await import('../help-routes'));
    });

    it('should render the help file if it exists', () => {
        const request = httpMocks.createRequest({
            method: 'GET',
            params: { filename: 'introduction' },
            url: '/help/introduction',
        });
        const response = httpMocks.createResponse();

        renderHelpFile(request, response);

        expect(response.statusCode).toBe(200);
        expect(response._getRenderView()).toBe('help.njk');
        expect(response._getRenderData()).toEqual({
            helpFileMarkdown: '# Introduction',
            pagination: {
                next: {
                    href: '/help/usage',
                    labelText: 'Usage',
                },
                previous: undefined,
            },
            tableOfContents: [
                {
                    current: true,
                    title: 'Introduction',
                    url: '/help/introduction',
                },
                { current: false, title: 'Usage', url: '/help/usage' },
                {
                    current: false,
                    title: 'Sharing your prototype',
                    url: '/help/sharing',
                },
            ],
            title: 'Introduction',
        });
    });

    it('should render 404 page if help file does not exist', () => {
        const request = httpMocks.createRequest({
            method: 'GET',
            params: { filename: 'non-existent-file' },
            url: '/help/non-existent-file',
        });
        const response = httpMocks.createResponse();

        renderHelpFile(request, response);

        expect(response.statusCode).toBe(404);
        expect(response._getRenderView()).toBe('page-not-found.njk');
    });

    it('should set correct pagination for middle file', () => {
        const request = httpMocks.createRequest({
            method: 'GET',
            params: { filename: 'usage' },
            url: '/help/usage',
        });
        const response = httpMocks.createResponse();

        renderHelpFile(request, response);

        expect(response.statusCode).toBe(200);
        expect(response._getRenderView()).toBe('help.njk');
        expect(response._getRenderData()).toEqual({
            helpFileMarkdown: '# Usage',
            pagination: {
                next: {
                    href: '/help/sharing',
                    labelText: 'Sharing your prototype',
                },
                previous: {
                    href: '/help/introduction',
                    labelText: 'Introduction',
                },
            },
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            tableOfContents: expect.any(Array),
            title: 'Usage',
        });
    });

    it('should set correct pagination for middle file', () => {
        const request = httpMocks.createRequest({
            method: 'GET',
            params: { filename: 'sharing' },
            url: '/help/sharing',
        });
        const response = httpMocks.createResponse();

        renderHelpFile(request, response);

        expect(response.statusCode).toBe(200);
        expect(response._getRenderView()).toBe('help.njk');
        expect(response._getRenderData()).toEqual({
            helpFileMarkdown: '# Sharing your prototype',
            pagination: {
                next: undefined,
                previous: {
                    href: '/help/usage',
                    labelText: 'Usage',
                },
            },
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            tableOfContents: expect.any(Array),
            title: 'Sharing your prototype',
        });
    });
});

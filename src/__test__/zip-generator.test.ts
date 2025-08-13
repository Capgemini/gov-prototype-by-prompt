import { InputWithSizeMeta } from 'client-zip';
import * as fs from 'fs';

import exampleLlmResponse from '../../data/example-llm-response.json';
import { PrototypeDesignSystemsType, TemplateData } from '../types';

// Mocking the assets directory structure
const firstAssetFiles: fs.Dirent[] = [
    {
        isDirectory: () => false,
        isFile: () => true,
        name: 'manifest.json',
    } as fs.Dirent,
    {
        isDirectory: () => true,
        isFile: () => false,
        name: 'fonts',
    } as fs.Dirent,
];
const secondAssetFiles: fs.Dirent[] = [
    {
        isDirectory: () => false,
        isFile: () => true,
        name: 'fonts/font.woff',
    } as fs.Dirent,
];

describe('buildZipOfForm', () => {
    const exampleTemplateData = exampleLlmResponse as TemplateData;
    const urlPrefix = 'test-prototype';
    const author = 'Test Author';
    const hmrcVersion = '12.34.56';

    let downloadZipMock: jest.Mock;
    let readdirSyncMock: jest.Mock;
    let buildZipOfForm: (
        data: TemplateData,
        urlPrefix: string,
        designSystem: PrototypeDesignSystemsType,
        author: string
    ) => Promise<Blob>;
    beforeEach(async () => {
        downloadZipMock = jest.fn().mockReturnValue({
            blob: () => Promise.resolve('mock-blob'),
        });
        readdirSyncMock = jest
            .fn()
            .mockReturnValueOnce(firstAssetFiles)
            .mockReturnValueOnce(secondAssetFiles);
        jest.doMock('client-zip', () => ({
            downloadZip: downloadZipMock,
        }));
        jest.doMock('fs', () => ({
            readdirSync: readdirSyncMock,
            readFileSync: jest.fn().mockReturnValue('mock-file'),
        }));
        jest.doMock(
            '../data/zip-download/package-lock.json',
            () => ({ name: 'mock', packages: { '': { name: 'mock' } } }),
            { virtual: true }
        );
        jest.doMock(
            '../data/zip-download/package.json',
            () => ({ author: 'mock', description: 'mock', name: 'mock' }),
            { virtual: true }
        );
        jest.doMock('../zip-generator', () =>
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            jest.requireActual('../zip-generator')
        );
        jest.doMock('../utils', () => ({
            getHmrcAssetsVersion: jest.fn().mockReturnValue(hmrcVersion),
        }));
        // Mocking form-generator methods as we're not testing them here
        jest.doMock('../form-generator', () => ({
            generateBasePage: jest.fn().mockReturnValue('mock-base-page'),
            generateCheckAnswersPage: jest
                .fn()
                .mockReturnValue('mock-check-answers-page'),
            generateConfirmationPage: jest
                .fn()
                .mockReturnValue('mock-confirmation-page'),
            generateQuestionPage: jest
                .fn()
                .mockReturnValue('mock-question-page'),
            generateStartPage: jest.fn().mockReturnValue('mock-start-page'),
        }));
        ({ buildZipOfForm } = await import('../zip-generator'));
    });

    afterEach(() => {
        jest.resetAllMocks();
        jest.resetModules();
    });

    it('returns a blob from downloadZip for the GOV.UK design system', async () => {
        const result = await buildZipOfForm(
            exampleTemplateData,
            urlPrefix,
            'GOV.UK' as PrototypeDesignSystemsType,
            author
        );
        expect(readdirSyncMock).toHaveBeenCalled();
        expect(downloadZipMock).toHaveBeenCalledTimes(1);
        const data = (
            downloadZipMock.mock.calls[0] as InputWithSizeMeta[][]
        )[0];
        expect(data).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    input: JSON.stringify(exampleTemplateData, null, 2),
                    name: `${urlPrefix}.json`,
                }),
            ])
        );
        // 8 files from app, 7 from assets,
        // questions.length + 4 from form pages, 1 from template data
        expect(data).toHaveLength(
            8 + 7 + exampleTemplateData.questions.length + 4 + 1
        );
        expect(result).toBe('mock-blob');
    });

    it('returns a blob from downloadZip for the HMRC design system', async () => {
        // Mocking the HMRC asset files
        const hmrcAssetFiles: string[] = [
            `hmrc-frontend-${hmrcVersion}.min.css`,
            `hmrc-frontend-${hmrcVersion}.min.js`,
        ];
        readdirSyncMock
            .mockReturnValueOnce(hmrcAssetFiles)
            .mockReturnValueOnce(hmrcAssetFiles);

        const result = await buildZipOfForm(
            exampleTemplateData,
            urlPrefix,
            'HMRC' as PrototypeDesignSystemsType,
            author
        );

        expect(readdirSyncMock).toHaveBeenCalled();
        expect(downloadZipMock).toHaveBeenCalledTimes(1);
        const data = (
            downloadZipMock.mock.calls[0] as InputWithSizeMeta[][]
        )[0];
        expect(data).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    input: JSON.stringify(exampleTemplateData, null, 2),
                    name: `${urlPrefix}.json`,
                }),
            ])
        );
        // 8 files from app, 9 from assets,
        // questions.length + 4 from form pages, 1 from template data
        expect(data).toHaveLength(
            8 + 9 + exampleTemplateData.questions.length + 4 + 1
        );
        expect(result).toBe('mock-blob');
    });
});

import { Request, Response } from 'express';
import { ValidationError, ValidatorResultError } from 'jsonschema';
import httpMocks from 'node-mocks-http';
import { ZodError } from 'zod';

import { ITemplateField } from '../types';
import {
    formatHtml,
    generatePagination,
    generateSlug,
    getContentType,
    getEnvironmentVariables,
    getFormSchemaForJsonInputValidation,
    prepareJsonValidationErrorMessage,
    validateTemplateDataText,
} from '../utils';

describe('getEnvironmentVariables', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        jest.resetModules();
    });

    afterEach(() => {
        process.env = { ...originalEnv };
    });

    const setEnv = (overrides: Partial<NodeJS.ProcessEnv> = {}) => {
        process.env = {
            ...originalEnv,
            ...overrides,
        };
    };

    it('returns environment variables when all required are present', () => {
        setEnv();
        const result = getEnvironmentVariables();
        for (const key of Object.keys(result) as (keyof typeof result)[]) {
            expect(String(result[key])).toEqual(originalEnv[key]);
        }
    });

    it('throws an error if a required variable is missing', () => {
        setEnv({ AZURE_OPENAI_API_KEY: undefined, MONGODB_URI: undefined });
        try {
            getEnvironmentVariables();
            fail('Expected ZodError to be thrown');
        } catch (error: unknown) {
            expect((error as ZodError).name).toBe('ZodError');
            expect((error as ZodError).issues).toEqual([
                {
                    code: 'invalid_type',
                    expected: 'string',
                    message: 'Required',
                    path: ['AZURE_OPENAI_API_KEY'],
                    received: 'undefined',
                },
                {
                    code: 'invalid_type',
                    expected: 'string',
                    message: 'Required',
                    path: ['MONGODB_URI'],
                    received: 'undefined',
                },
            ]);
        }
    });

    it('returns default values for optional variables', () => {
        setEnv({ NODE_ENV: undefined });
        const result = getEnvironmentVariables();
        expect(result.NODE_ENV).toBe('production');
        expect(result.SUGGESTIONS_ENABLED).toBe(false);
    });
});

describe('getFormSchemaForJsonInputValidation', () => {
    it('removes null from property types and updates required array', () => {
        const schema = {
            properties: {
                age: { type: 'number' },
                name: { type: ['string', 'null'] },
            },
            required: ['name', 'age'],
            type: 'object',
        };
        const result = getFormSchemaForJsonInputValidation(schema);
        expect(result.properties?.name.type).toEqual(['string']);
        expect(result.required).toEqual(['age']);
    });

    it('handles nested object schemas', () => {
        const schema = {
            properties: {
                firstProperty: {
                    items: {
                        properties: {
                            value: { type: ['string', 'null'] },
                        },
                        required: ['value'],
                        type: 'object',
                    },
                    type: 'array',
                },
                secondProperty: {
                    type: 'number',
                },
            },
            required: ['firstProperty', 'secondProperty'],
            type: 'object',
        };
        const result = getFormSchemaForJsonInputValidation(schema);
        expect(result.properties?.firstProperty.type).toEqual('array');
        expect(result.properties?.firstProperty.items?.type).toEqual('object');
        expect(
            result.properties?.firstProperty.items?.properties?.value.type
        ).toEqual(['string']);
        expect(result.properties?.firstProperty.items?.required).toEqual([]);
        expect(result.properties?.secondProperty.type).toEqual('number');
        expect(result.required).toEqual(['firstProperty', 'secondProperty']);
    });

    it('does not modify properties without null type', () => {
        const schema = {
            properties: {
                age: { type: 'number' },
                name: { type: 'string' },
            },
            required: ['name', 'age'],
            type: 'object',
        };
        const result = getFormSchemaForJsonInputValidation(schema);
        expect(
            (result.properties as { name: { type: string } }).name.type
        ).toBe('string');
        expect(result.required).toEqual(['name', 'age']);
    });

    it('removes AI-generated properties', () => {
        const schema = {
            properties: {
                age: { type: 'number' },
                changes_made: { type: 'string' },
                explanation: { type: 'string' },
                name: { type: 'string' },
                suggestions: {
                    items: { type: 'string' },
                    type: 'array',
                },
            },
            required: ['name', 'age'],
            type: 'object',
        };
        const result = getFormSchemaForJsonInputValidation(schema);
        expect(
            (result.properties as { name: { type: string } }).name.type
        ).toBe('string');
        expect(result.required).toEqual(['name', 'age']);
        expect(
            (result.properties as { changes_made?: unknown }).changes_made
        ).toBeUndefined();
        expect(
            (result.properties as { explanation?: unknown }).explanation
        ).toBeUndefined();
        expect(
            (result.properties as { suggestions?: unknown }).suggestions
        ).toBeUndefined();
    });
});

describe('validateTemplateDataText', () => {
    it('returns cleaned object for valid JSON and schema', () => {
        const schema = {
            properties: {
                duration: { type: 'number' },
                questions: {
                    items: {
                        properties: {},
                        type: 'object',
                    },
                    type: 'array',
                },
                title: { type: 'string' },
            },
            required: ['title', 'duration', 'questions'],
            type: 'object',
        };
        const json = JSON.stringify({
            duration: 30,
            questions: [],
            title: 'Form Title',
        });
        const result = validateTemplateDataText(json, schema);
        expect(result).toEqual({
            duration: 30,
            questions: [],
            title: 'Form Title',
        });
    });

    it('removes null values from the result', () => {
        const schema = {
            properties: {
                duration: { type: 'number' },
                questions: {
                    items: {
                        properties: {},
                        type: 'object',
                    },
                    type: 'array',
                },
                title: { type: ['string', 'null'] },
            },
            required: ['duration', 'questions'],
            type: 'object',
        };
        const json = JSON.stringify({
            duration: 25,
            questions: [],
            title: null,
        });
        const result = validateTemplateDataText(json, schema);
        expect(result).toEqual({ duration: 25, questions: [] });
    });

    it('throws error for invalid JSON', () => {
        const schema = {
            properties: {
                name: { type: 'string' },
            },
            required: ['name'],
            type: 'object',
        };
        const invalidJson = '{ name: "Alice" '; // malformed JSON
        expect(() => validateTemplateDataText(invalidJson, schema)).toThrow();
    });

    it('throws error if JSON does not match schema', () => {
        const schema = {
            properties: {
                age: { type: 'number' },
                name: { type: 'string' },
            },
            required: ['name', 'age'],
            type: 'object',
        };
        const json = JSON.stringify({ name: 'Bob' }); // missing age
        expect(() => validateTemplateDataText(json, schema)).toThrow();
    });

    it('removes date of birth properties if not applicable', () => {
        const schema = {
            properties: {
                questions: {
                    items: {
                        properties: {
                            answer_type: { type: 'string' },
                            date_of_birth_maximum_age: {
                                type: ['number', 'null'],
                            },
                            date_of_birth_minimum_age: {
                                type: ['number', 'null'],
                            },
                        },
                        required: ['answer_type'],
                        type: 'object',
                    },
                    type: 'array',
                },
            },
            type: 'object',
        };
        const json = JSON.stringify({
            questions: [
                {
                    answer_type: 'text',
                    date_of_birth_maximum_age: 65,
                    date_of_birth_minimum_age: 18,
                },
                {
                    answer_type: 'date_of_birth',
                    date_of_birth_maximum_age: 65,
                    date_of_birth_minimum_age: 18,
                },
            ],
        });
        const result = validateTemplateDataText(json, schema);
        expect(result.questions[0].date_of_birth_minimum_age).toBeUndefined();
        expect(result.questions[0].date_of_birth_maximum_age).toBeUndefined();
        expect(result.questions[1].date_of_birth_minimum_age).toBe(18);
        expect(result.questions[1].date_of_birth_maximum_age).toBe(65);
    });

    it('removes options properties if not applicable', () => {
        const schema = {
            properties: {
                questions: {
                    items: {
                        properties: {
                            answer_type: { type: 'string' },
                            options: {
                                items: {
                                    type: 'string',
                                },
                                type: ['array', 'null'],
                            },
                            options_branching: {
                                items: {
                                    type: 'object',
                                },
                                type: ['array', 'null'],
                            },
                        },
                        required: ['answer_type'],
                        type: 'object',
                    },
                    type: 'array',
                },
            },
            type: 'object',
        };
        const json = JSON.stringify({
            questions: [
                {
                    answer_type: 'text',
                    options: ['Option 1', 'Option 2'],
                    options_branching: [
                        { next_question_value: 2, text_value: 'Option 1' },
                        { next_question_value: -1, text_value: 'Option 2' },
                    ],
                },
                {
                    answer_type: 'branching_choice',
                    options: ['Option 1', 'Option 2'],
                    options_branching: [
                        { next_question_value: 3, text_value: 'Option 1' },
                        { next_question_value: -1, text_value: 'Option 2' },
                    ],
                },
                {
                    answer_type: 'single_choice',
                    options: ['Option 1', 'Option 2'],
                    options_branching: [
                        { next_question_value: 4, text_value: 'Option 1' },
                        { next_question_value: -1, text_value: 'Option 2' },
                    ],
                },
                {
                    answer_type: 'multiple_choice',
                    options: ['Option 1', 'Option 2'],
                    options_branching: [
                        { next_question_value: -1, text_value: 'Option 1' },
                        { next_question_value: -1, text_value: 'Option 2' },
                    ],
                },
            ],
        });
        const result = validateTemplateDataText(json, schema);
        expect(result.questions[0].options).toBeUndefined();
        expect(result.questions[0].options_branching).toBeUndefined();
        expect(result.questions[1].options).toBeUndefined();
        expect(result.questions[1].options_branching).toBeDefined();
        expect(result.questions[2].options).toBeDefined();
        expect(result.questions[2].options_branching).toBeUndefined();
        expect(result.questions[3].options).toBeDefined();
        expect(result.questions[3].options_branching).toBeUndefined();
    });

    it.each([
        [
            [
                {
                    answer_type: 'text',
                },
                {
                    answer_type: 'branching_choice',
                    options_branching: [
                        { next_question_value: 3, text_value: 'Option 1' },
                        { next_question_value: -1, text_value: 'Option 2' },
                    ],
                },
                {
                    answer_type: 'single_choice',
                    options: ['Option 1', 'Option 2'],
                },
                {
                    answer_type: 'multiple_choice',
                    options: ['Option 1', 'Option 2'],
                },
            ],
            false,
        ],
        [
            [
                {
                    answer_type: 'branching_choice',
                    options_branching: [],
                },
            ],
            true,
        ],
        [
            [
                {
                    answer_type: 'single_choice',
                    options_branching: [],
                },
            ],
            true,
        ],
        [
            [
                {
                    answer_type: 'multiple_choice',
                },
            ],
            true,
        ],
    ])(
        'throws an error if choice questions do not have options',
        (questions: Partial<ITemplateField>[], throws: boolean) => {
            const schema = {
                properties: {
                    questions: {
                        items: {
                            properties: {
                                answer_type: { type: 'string' },
                                next_question_value: {
                                    type: ['number', 'null'],
                                },
                                options_branching: {
                                    items: {
                                        type: 'object',
                                    },
                                    type: ['array', 'null'],
                                },
                            },
                            required: ['answer_type'],
                            type: 'object',
                        },
                        type: 'array',
                    },
                },
                type: 'object',
            };
            const json = JSON.stringify({
                questions: questions,
            });
            if (throws) {
                expect(() => validateTemplateDataText(json, schema)).toThrow();
            } else {
                expect(() =>
                    validateTemplateDataText(json, schema)
                ).not.toThrow();
            }
        }
    );

    it.each([
        [
            [
                {
                    answer_type: 'text',
                    next_question_value: 2,
                },
                {
                    answer_type: 'text',
                    next_question_value: -1,
                },
            ],
            false,
        ],
        [
            [
                {
                    answer_type: 'branching_choice',
                    options_branching: [
                        { next_question_value: 2, text_value: 'Option 1' },
                        { next_question_value: -1, text_value: 'Option 1' },
                    ],
                },
                {
                    answer_type: 'text',
                    next_question_value: -1,
                },
            ],
            false,
        ],
        [
            [
                {
                    answer_type: 'text',
                    next_question_value: 99,
                },
                {
                    answer_type: 'text',
                    next_question_value: 1,
                },
            ],
            true,
        ],
        [
            [
                {
                    answer_type: 'text',
                    next_question_value: 2,
                },
                {
                    answer_type: 'branching_choice',
                    options_branching: [
                        { next_question_value: 1, text_value: 'Option 1' },
                        { next_question_value: -1, text_value: 'Option 1' },
                    ],
                },
            ],
            true,
        ],
    ])(
        'throws an error if next_question_value is not valid',
        (questions: Partial<ITemplateField>[], throws: boolean) => {
            const schema = {
                properties: {
                    questions: {
                        items: {
                            properties: {
                                answer_type: { type: 'string' },
                                next_question_value: {
                                    type: ['number', 'null'],
                                },
                                options_branching: {
                                    items: {
                                        type: 'object',
                                    },
                                    type: ['array', 'null'],
                                },
                            },
                            required: ['answer_type'],
                            type: 'object',
                        },
                        type: 'array',
                    },
                },
                type: 'object',
            };
            const json = JSON.stringify({
                questions: questions,
            });
            if (throws) {
                expect(() => validateTemplateDataText(json, schema)).toThrow();
            } else {
                expect(() =>
                    validateTemplateDataText(json, schema)
                ).not.toThrow();
            }
        }
    );
});

describe('prepareJsonValidationErrorMessage', () => {
    it('returns correct message for SyntaxError', () => {
        const error = new SyntaxError('Unexpected token');
        const result = prepareJsonValidationErrorMessage(error);
        expect(result).toContain('The JSON did not parse correctly');
        expect(result).toContain('Unexpected token');
    });

    it('returns validation error messages for ValidatorResultError', () => {
        const validationErrors = [
            Object.assign(new ValidationError('', ''), {
                message: 'is required',
                property: 'name',
            }),
            Object.assign(new ValidationError('', ''), {
                message: 'must be a number',
                property: 'age',
            }),
        ];
        const error = new ValidatorResultError('Validation failed');
        error.errors = validationErrors as unknown as ValidationError;
        const result = prepareJsonValidationErrorMessage(error);
        expect(result).toContain(
            'The JSON did not validate against the schema'
        );
        expect(result).toContain('<strong>name</strong>: is required');
        expect(result).toContain('<strong>age</strong>: must be a number');
    });

    it('returns unexpected error message for generic Error', () => {
        const error = new Error('Something went wrong');
        const result = prepareJsonValidationErrorMessage(error);
        expect(result).toContain('An unexpected error occurred');
        expect(result).toContain('Something went wrong');
    });
});

describe('generatePagination', () => {
    it('returns correct pagination for 1 page', () => {
        const result = generatePagination(1, 10, 1, '/base');
        expect(result.paginationPreviousHref).toBe('');
        expect(result.paginationNextHref).toBe('');
        expect(result.paginationItems).toEqual([
            {
                current: true,
                href: '/base&page=1&perPage=10',
                number: 1,
            },
        ]);
    });

    it('returns correct pagination for 2 pages', () => {
        const result = generatePagination(1, 10, 2, '/base');
        expect(result.paginationPreviousHref).toBe('');
        expect(result.paginationNextHref).toBe('/base&page=2&perPage=10');
        expect(result.paginationItems).toEqual([
            {
                current: true,
                href: '/base&page=1&perPage=10',
                number: 1,
            },
            {
                current: false,
                href: '/base&page=2&perPage=10',
                number: 2,
            },
        ]);
    });

    it('returns correct pagination for 5 pages', () => {
        const result = generatePagination(3, 10, 5, '/base');
        expect(result.paginationPreviousHref).toBe('/base&page=2&perPage=10');
        expect(result.paginationNextHref).toBe('/base&page=4&perPage=10');
        expect(result.paginationItems.length).toBe(5);
        expect(result.paginationItems[2]).toEqual({
            current: true,
            href: '/base&page=3&perPage=10',
            number: 3,
        });
    });

    it('returns correct pagination for first page of many', () => {
        const result = generatePagination(1, 10, 20, '/base');
        expect(result.paginationPreviousHref).toBe('');
        expect(result.paginationNextHref).toBe('/base&page=2&perPage=10');
        expect(result.paginationItems).toEqual([
            {
                current: true,
                href: '/base&page=1&perPage=10',
                number: 1,
            },
            {
                current: false,
                href: '/base&page=2&perPage=10',
                number: 2,
            },
            { ellipsis: true },
            {
                current: false,
                href: '/base&page=20&perPage=10',
                number: 20,
            },
        ]);
    });

    it('returns correct pagination for second page of many', () => {
        const result = generatePagination(2, 10, 20, '/base');
        expect(result.paginationPreviousHref).toBe('/base&page=1&perPage=10');
        expect(result.paginationNextHref).toBe('/base&page=3&perPage=10');
        // Should include first, current, next, ellipsis, and last page
        expect(result.paginationItems).toEqual([
            {
                current: false,
                href: '/base&page=1&perPage=10',
                number: 1,
            },
            {
                current: true,
                href: '/base&page=2&perPage=10',
                number: 2,
            },
            {
                current: false,
                href: '/base&page=3&perPage=10',
                number: 3,
            },
            { ellipsis: true },
            {
                current: false,
                href: '/base&page=20&perPage=10',
                number: 20,
            },
        ]);
    });

    it('returns correct pagination for a middle page of many', () => {
        const result = generatePagination(7, 10, 20, '/base');
        expect(result.paginationPreviousHref).toBe('/base&page=6&perPage=10');
        expect(result.paginationNextHref).toBe('/base&page=8&perPage=10');
        const items = result.paginationItems;
        // Should include first page, ellipsis, pages 6, 7, 8, ellipsis, last page
        expect(items).toEqual([
            {
                current: false,
                href: '/base&page=1&perPage=10',
                number: 1,
            },
            { ellipsis: true },
            {
                current: false,
                href: '/base&page=6&perPage=10',
                number: 6,
            },
            {
                current: true,
                href: '/base&page=7&perPage=10',
                number: 7,
            },
            {
                current: false,
                href: '/base&page=8&perPage=10',
                number: 8,
            },
            { ellipsis: true },
            {
                current: false,
                href: '/base&page=20&perPage=10',
                number: 20,
            },
        ]);
    });

    it('returns correct pagination for second to last page of many', () => {
        const result = generatePagination(19, 10, 20, '/base');
        expect(result.paginationPreviousHref).toBe('/base&page=18&perPage=10');
        expect(result.paginationNextHref).toBe('/base&page=20&perPage=10');
        // Should include first, ellipsis, previous, current, last page
        expect(result.paginationItems).toEqual([
            {
                current: false,
                href: '/base&page=1&perPage=10',
                number: 1,
            },
            { ellipsis: true },
            {
                current: false,
                href: '/base&page=18&perPage=10',
                number: 18,
            },
            {
                current: true,
                href: '/base&page=19&perPage=10',
                number: 19,
            },
            {
                current: false,
                href: '/base&page=20&perPage=10',
                number: 20,
            },
        ]);
    });

    it('returns correct pagination for last page of many', () => {
        const result = generatePagination(20, 10, 20, '/base');
        expect(result.paginationPreviousHref).toBe('/base&page=19&perPage=10');
        expect(result.paginationNextHref).toBe('');
        expect(result.paginationItems).toEqual([
            {
                current: false,
                href: '/base&page=1&perPage=10',
                number: 1,
            },
            { ellipsis: true },
            {
                current: false,
                href: '/base&page=19&perPage=10',
                number: 19,
            },
            {
                current: true,
                href: '/base&page=20&perPage=10',
                number: 20,
            },
        ]);
    });
});

describe('generateSlug', () => {
    it('converts string to lowercase and replaces spaces with dashes', () => {
        expect(generateSlug('Hello World')).toBe('hello-world');
    });
    it('removes special characters and collapses multiple dashes', () => {
        expect(generateSlug('Hello!@# World---Test')).toBe('hello-world-test');
    });
    it('removes leading and trailing dashes', () => {
        expect(generateSlug('---Hello World---')).toBe('hello-world');
    });
    it('handles numbers and mixed case', () => {
        expect(generateSlug('Test123 String')).toBe('test123-string');
    });
    it('returns empty string for empty input', () => {
        expect(generateSlug('')).toBe('');
    });
});

describe('formatHtml', () => {
    it('formats HTML with appropriate indentation', () => {
        const html =
            '<html>\n<body>\n<div>\n<span>Hello</span>\n<span>World</span>\n</div>\n</body>\n</html>';
        const formatted = formatHtml(html);
        expect(formatted).toContain('\n  <body>');
        expect(formatted).toContain('\n    <div>');
        expect(formatted).toContain('\n      <span>Hello</span>');
        expect(formatted).toContain('\n      <span>World</span>');
    });
    it('does not change already formatted HTML', () => {
        const pretty =
            '<div>\n  <span>Hello</span>\n  <span>World</span>\n</div>';
        const formatted = formatHtml(pretty);
        expect(formatted).toContain('<div>');
        expect(formatted).toContain('<span>Hello</span>');
        expect(formatted).toContain('<span>World</span>');
    });
    it('returns empty string for empty input', () => {
        expect(formatHtml('')).toBe('');
    });
});

describe('getContentType', () => {
    it('returns text/css for .css files', () => {
        expect(getContentType('style.css')).toBe('text/css');
    });
    it('returns application/javascript for .js files', () => {
        expect(getContentType('script.js')).toBe('application/javascript');
    });
    it('returns application/json for .js.map and .css.map files', () => {
        expect(getContentType('file.js.map')).toBe('application/json');
        expect(getContentType('file.css.map')).toBe('application/json');
    });
    it('returns text/plain for unknown extensions', () => {
        expect(getContentType('file.txt')).toBe('text/plain');
        expect(getContentType('file')).toBe('text/plain');
    });
});

describe('getHmrcAssetsVersion', () => {
    const hmrcVersionPath = 'node_modules/hmrc-frontend/hmrc/VERSION.txt';
    const hmrcVersion = '54.32.10';

    let existsSyncMock: jest.Mock;
    let readFileSyncMock: jest.Mock;
    let getHmrcAssetsVersion: () => string;
    beforeEach(async () => {
        jest.resetAllMocks();
        jest.resetModules();
        existsSyncMock = jest.fn().mockReturnValue(true);
        readFileSyncMock = jest.fn().mockReturnValue(hmrcVersion);
        jest.doMock('fs', () => ({
            existsSync: existsSyncMock,
            readFileSync: readFileSyncMock,
        }));
        ({ getHmrcAssetsVersion } = await import('../utils'));
    });

    afterAll(() => {
        jest.resetAllMocks();
        jest.resetModules();
    });

    it('returns the correct HMRC assets version when the file exists', () => {
        const version = getHmrcAssetsVersion();
        expect(existsSyncMock).toHaveBeenCalledWith(hmrcVersionPath);
        expect(readFileSyncMock).toHaveBeenCalledWith(hmrcVersionPath, 'utf8');
        expect(version).toBe(hmrcVersion);
    });

    it('throws an error when the file does not exist', () => {
        existsSyncMock.mockReturnValue(false);
        expect(() => getHmrcAssetsVersion()).toThrow(
            'HMRC frontend assets version file not found'
        );
        expect(existsSyncMock).toHaveBeenCalledWith(hmrcVersionPath);
        expect(readFileSyncMock).not.toHaveBeenCalled();
    });

    it('reads and returns the version from the real VERSION.txt file', async () => {
        jest.clearAllMocks();
        ({ getHmrcAssetsVersion } = await import('../utils'));
        const version = getHmrcAssetsVersion();
        expect(readFileSyncMock).toHaveBeenCalledWith(hmrcVersionPath, 'utf8');
        expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    });
});

describe('handleValidationErrors', () => {
    let validationResultMock: jest.Mock;
    let handleValidationErrors: (req: Request, res: Response) => boolean;
    beforeEach(async () => {
        jest.resetAllMocks();
        jest.resetModules();
        validationResultMock = jest.fn();
        jest.doMock('express-validator', () => ({
            validationResult: validationResultMock,
        }));
        ({ handleValidationErrors } = await import('../utils'));
    });

    afterEach(() => {
        jest.resetModules();
        jest.resetAllMocks();
    });

    it.each([
        [[{ msg: 'Error 1', param: 'field1' }], true, 'Error 1'],
        [
            [
                { msg: 'Same error', param: 'field1' },
                { msg: 'Same error', param: 'field2' },
            ],
            true,
            'Same error',
        ],
        [
            [
                { msg: 'Error 1', param: 'field1' },
                { msg: 'Error 2', param: 'field2' },
            ],
            true,
            'Resolve the errors and try again.',
        ],
        [[], false, undefined],
    ])(
        'returns correct response for errors: %p',
        (errorArray, expectedReturn, expectedMessage) => {
            const req = httpMocks.createRequest();
            const res = httpMocks.createResponse();
            validationResultMock.mockReturnValue({
                array: () => errorArray,
                isEmpty: () => errorArray.length === 0,
            });
            const result = handleValidationErrors(req, res);
            expect(result).toBe(expectedReturn);
            if (expectedReturn) {
                expect(res.statusCode).toBe(400);
                expect(res._getJSONData()).toEqual({
                    errors: errorArray,
                    message: expectedMessage,
                });
            } else {
                expect(res.statusCode).not.toBe(400);
                expect(res._getData()).toBe('');
            }
        }
    );
});

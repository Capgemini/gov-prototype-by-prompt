import { describe, expect, it, jest } from '@jest/globals';
import OpenAI from 'openai';

import { PrototypeDesignSystemsType, TemplateData } from '../types';
import { envVarSchema, exampleEnvVars } from '../validationSchemas/env';

// Define constants for testing
const modelId = 'model-name';
const envVars = {
    ...envVarSchema.parse(exampleEnvVars),
    OPENAI_MODEL_ID: modelId,
};

interface ResponsesCreateMockType {
    input: { content: string }[];
    model: string;
    text: {
        format: {
            name: string;
            schema: { required: string[] };
        };
    };
}

let responsesCreateMock: jest.Mock;
let setAttributeMock: jest.Mock;
let getActiveSpanMock: jest.Mock;
let nunjucksRenderMock: jest.Mock;
beforeEach(() => {
    responsesCreateMock = jest.fn().mockReturnValue(
        Promise.resolve({
            output_text: '{"name":"Test Form"}',
        })
    );
    jest.doMock('openai', () => ({
        OpenAI: jest.fn().mockImplementation(() => ({
            responses: {
                create: responsesCreateMock,
            },
        })),
    }));
    setAttributeMock = jest.fn();
    getActiveSpanMock = jest.fn().mockReturnValue({
        setAttribute: setAttributeMock,
    });
    jest.doMock('@opentelemetry/api', () => ({
        trace: {
            getActiveSpan: getActiveSpanMock,
        },
    }));
    nunjucksRenderMock = jest.fn().mockReturnValue('rendered-prompt');
    jest.doMock('nunjucks', () => ({
        render: nunjucksRenderMock,
    }));
});

afterEach(() => {
    jest.resetAllMocks();
    jest.resetModules();
});

describe('createFormWithOpenAI', () => {
    const prompt = 'Generate a form';

    let createFormWithOpenAI: (
        envVars: ReturnType<typeof envVarSchema.parse>,
        prompt: string,
        designSystem: PrototypeDesignSystemsType,
        enableSuggestions: boolean
    ) => Promise<string>;
    beforeEach(async () => {
        ({ createFormWithOpenAI } = await import('../openai'));
    });

    it.each([
        [true, 'GOV.UK', 'for the UK Government'],
        [false, 'GOV.UK', 'for the UK Government'],
        [true, 'HMRC', 'for HMRC'],
        [false, 'HMRC', 'for HMRC'],
    ] as [boolean, PrototypeDesignSystemsType, string][])(
        'returns the response content from OpenAI (enableSuggestions=%s, designSystem=%s)',
        async (
            enableSuggestions: boolean,
            designSystem: PrototypeDesignSystemsType,
            orgFor: string
        ) => {
            const result = await createFormWithOpenAI(
                envVars,
                prompt,
                designSystem,
                enableSuggestions
            );
            expect(nunjucksRenderMock).toHaveBeenCalledWith(
                'create-prompt.njk',
                {
                    orgFor: orgFor,
                    suggestions: enableSuggestions
                        ? 'You must include three suggestions.'
                        : '',
                }
            );
            expect(responsesCreateMock).toHaveBeenCalled();
            const data = responsesCreateMock.mock
                .calls[0][0] as ResponsesCreateMockType;
            expect(data.model).toBe(modelId);
            expect(data.input[0].content).toContain('rendered-prompt');
            expect(data.input[1].content).toBe(prompt);
            expect(data.text.format.name).toBe('create-form-schema');

            // Test the suggestions logic
            expect(
                data.text.format.schema.required.includes('suggestions')
            ).toBe(enableSuggestions);

            // Test the result
            expect(result).toBe('{"name":"Test Form"}');
        }
    );

    it('logs the prompt if there is an opentelemetry span', async () => {
        await createFormWithOpenAI(envVars, prompt, 'GOV.UK', false);
        expect(getActiveSpanMock).toHaveBeenCalled();
        expect(setAttributeMock).toHaveBeenCalledWith('openai.prompt', prompt);
    });

    it('does not log the prompt if there is not an opentelemetry span', async () => {
        getActiveSpanMock.mockReturnValueOnce(undefined);
        await createFormWithOpenAI(envVars, prompt, 'GOV.UK', false);
        expect(getActiveSpanMock).toHaveBeenCalled();
        expect(setAttributeMock).not.toHaveBeenCalled();
    });

    it('throws if OpenAI call fails', async () => {
        responsesCreateMock.mockImplementationOnce(() => {
            throw new Error('API error');
        });
        await expect(
            createFormWithOpenAI(envVars, prompt, 'GOV.UK', false)
        ).rejects.toThrow('API error');
    });
});

describe('updateFormWithOpenAI', () => {
    const prompt = 'Update a form';

    let updateFormWithOpenAI: (
        envVars: ReturnType<typeof envVarSchema.parse>,
        prompt: string,
        templateData: TemplateData,
        designSystem: PrototypeDesignSystemsType,
        enableSuggestions: boolean
    ) => Promise<string>;
    beforeEach(async () => {
        ({ updateFormWithOpenAI } = await import('../openai'));
    });

    it.each([
        [true, 'GOV.UK', 'for the UK Government'],
        [false, 'GOV.UK', 'for the UK Government'],
        [true, 'HMRC', 'for HMRC'],
        [false, 'HMRC', 'for HMRC'],
    ] as [boolean, PrototypeDesignSystemsType, string][])(
        'returns the response content from OpenAI (enableSuggestions=%s, designSystem=%s)',
        async (
            enableSuggestions: boolean,
            designSystem: PrototypeDesignSystemsType,
            orgFor: string
        ) => {
            const result = await updateFormWithOpenAI(
                envVars,
                prompt,
                {} as TemplateData, // Mocking TemplateData as an empty object
                designSystem,
                enableSuggestions
            );
            expect(nunjucksRenderMock).toHaveBeenCalledWith(
                'update-prompt.njk',
                {
                    orgFor: orgFor,
                    suggestions: enableSuggestions
                        ? 'You must include three brand-new suggestions.'
                        : '',
                }
            );
            expect(responsesCreateMock).toHaveBeenCalled();
            const data = responsesCreateMock.mock
                .calls[0][0] as ResponsesCreateMockType;
            expect(data.model).toBe(modelId);
            expect(data.input[0].content).toContain('rendered-prompt');
            expect(data.input[1].content).toContain(prompt);
            expect(data.text.format.name).toBe('update-form-schema');

            // Test the suggestions logic
            expect(
                data.text.format.schema.required.includes('suggestions')
            ).toBe(enableSuggestions);

            // Test the result
            expect(result).toBe('{"name":"Test Form"}');
        }
    );

    it('logs the prompt if there is an opentelemetry span', async () => {
        await updateFormWithOpenAI(
            envVars,
            prompt,
            {} as TemplateData, // Mocking TemplateData as an empty object
            'GOV.UK',
            false
        );
        expect(getActiveSpanMock).toHaveBeenCalled();
        expect(setAttributeMock).toHaveBeenCalledWith('openai.prompt', prompt);
    });

    it('does not log the prompt if there is not an opentelemetry span', async () => {
        getActiveSpanMock.mockReturnValueOnce(undefined);
        await updateFormWithOpenAI(
            envVars,
            prompt,
            {} as TemplateData, // Mocking TemplateData as an empty object
            'GOV.UK',
            false
        );
        expect(getActiveSpanMock).toHaveBeenCalled();
        expect(setAttributeMock).not.toHaveBeenCalled();
    });

    it('throws if OpenAI call fails', async () => {
        responsesCreateMock.mockImplementationOnce(() => {
            throw new Error('API error');
        });
        await expect(
            updateFormWithOpenAI(
                envVars,
                prompt,
                {} as TemplateData,
                'GOV.UK',
                false
            )
        ).rejects.toThrow('API error');
    });
});

describe('generateSuggestionsWithOpenAI', () => {
    let generateSuggestionsWithOpenAI: (
        envVars: ReturnType<typeof envVarSchema.parse>,
        templateData: TemplateData,
        designSystem: PrototypeDesignSystemsType
    ) => Promise<string>;
    beforeEach(async () => {
        ({ generateSuggestionsWithOpenAI } = await import('../openai'));
    });

    it.each([
        ['GOV.UK', 'for the UK Government'],
        ['GOV.UK', 'for the UK Government'],
        ['HMRC', 'for HMRC'],
        ['HMRC', 'for HMRC'],
    ] as [PrototypeDesignSystemsType, string][])(
        'returns the response content from OpenAI (designSystem=%s)',
        async (designSystem: PrototypeDesignSystemsType, orgFor: string) => {
            const result = await generateSuggestionsWithOpenAI(
                envVars,
                {} as TemplateData, // Mocking TemplateData as an empty object
                designSystem
            );
            expect(nunjucksRenderMock).toHaveBeenCalledWith(
                'suggestions-prompt.njk',
                {
                    orgFor: orgFor,
                }
            );
            expect(responsesCreateMock).toHaveBeenCalled();
            const data = responsesCreateMock.mock
                .calls[0][0] as ResponsesCreateMockType;
            expect(data.model).toBe(modelId);
            expect(data.input[0].content).toContain('rendered-prompt');
            expect(data.text.format.name).toBe(
                'generate-form-suggestions-schema'
            );

            // Test the result
            expect(result).toBe('{"name":"Test Form"}');
        }
    );

    it('throws if OpenAI call fails', async () => {
        responsesCreateMock.mockImplementationOnce(() => {
            throw new Error('API error');
        });
        await expect(
            generateSuggestionsWithOpenAI(envVars, {} as TemplateData, 'GOV.UK')
        ).rejects.toThrow('API error');
    });
});

describe('judgeFormWithOpenAI', () => {
    let judgeFormWithOpenAI: (
        envVars: ReturnType<typeof envVarSchema.parse>,
        prompt: string,
        templateData: TemplateData,
        criteria: string
    ) => Promise<string>;
    beforeEach(async () => {
        ({ judgeFormWithOpenAI } = await import('../openai'));
    });

    it('returns the response content from OpenAI', async () => {
        const result = await judgeFormWithOpenAI(
            envVars,
            'Judge this form',
            {} as TemplateData,
            'some criteria'
        );
        expect(nunjucksRenderMock).toHaveBeenCalledWith('judge-prompt.njk');
        expect(responsesCreateMock).toHaveBeenCalled();
        const data = responsesCreateMock.mock
            .calls[0][0] as ResponsesCreateMockType;
        expect(data.model).toBe(modelId);
        expect(data.input[0].content).toContain('rendered-prompt');
        expect(data.text.format.name).toBe('judge-form-schema');

        // Test the result
        expect(result).toBe('{"name":"Test Form"}');
    });

    it('throws if OpenAI call fails', async () => {
        responsesCreateMock.mockImplementationOnce(() => {
            throw new Error('API error');
        });
        await expect(
            judgeFormWithOpenAI(
                envVars,
                'Judge this form',
                {} as TemplateData,
                'some criteria'
            )
        ).rejects.toThrow('API error');
    });
});

describe('handleOpenAIResponse', () => {
    let handleOpenAIResponse: (response: OpenAI.Responses.Response) => string;
    beforeEach(async () => {
        ({ handleOpenAIResponse } = await import('../openai'));
    });

    it('returns output_text if present', () => {
        const response = {
            output_text: 'This is the output text',
        } as OpenAI.Responses.Response;
        const result = handleOpenAIResponse(response);
        expect(result).toBe('This is the output text');
    });

    it('throws if response contains a refusal message', () => {
        const response = {
            output: [
                {
                    content: [
                        {
                            refusal: 'I refuse to answer',
                            type: 'refusal',
                        },
                    ],
                },
            ],
        } as unknown as OpenAI.Responses.Response;
        expect(() => handleOpenAIResponse(response)).toThrow(
            'OpenAI refused to respond: I refuse to answer'
        );
    });

    it('throws if response format is unexpected', () => {
        const response = {} as OpenAI.Responses.Response;
        expect(() => handleOpenAIResponse(response)).toThrow(
            'Unexpected response format from OpenAI'
        );
    });
});

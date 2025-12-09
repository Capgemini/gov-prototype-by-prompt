import { describe, expect, it, jest } from '@jest/globals';

import { PrototypeDesignSystemsType, TemplateData } from '../types';
import { envVarSchema, exampleEnvVars } from '../validationSchemas/env';

// Define constants for testing
const modelName = 'model-name';
const envVars = {
    ...envVarSchema.parse(exampleEnvVars),
    AZURE_OPENAI_MODEL_NAME: modelName,
};

interface ChatCreateMockType {
    messages: { content: string }[];
    model: string;
    response_format: {
        json_schema: {
            name: string;
            schema: { required: string[] };
        };
    };
}

let chatCreateMock: jest.Mock;
let setAttributeMock: jest.Mock;
let getActiveSpanMock: jest.Mock;
beforeEach(() => {
    chatCreateMock = jest.fn().mockReturnValue(
        Promise.resolve({
            choices: [{ message: { content: '{"name":"Test Form"}' } }],
        })
    );
    jest.doMock('openai', () => ({
        AzureOpenAI: jest.fn().mockImplementation(() => ({
            chat: {
                completions: {
                    create: chatCreateMock,
                },
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
        [true, 'GOV.UK', ' for the UK Government'],
        [false, 'GOV.UK', ' for the UK Government'],
        [true, 'HMRC', ' for HMRC'],
        [false, 'HMRC', ' for HMRC'],
    ] as [boolean, PrototypeDesignSystemsType, string][])(
        'returns the response content from OpenAI (enableSuggestions=%s, designSystem=%s)',
        async (
            enableSuggestions: boolean,
            designSystem: PrototypeDesignSystemsType,
            orgContext: string
        ) => {
            const result = await createFormWithOpenAI(
                envVars,
                prompt,
                designSystem,
                enableSuggestions
            );
            expect(chatCreateMock).toHaveBeenCalled();
            const data = chatCreateMock.mock.calls[0][0] as ChatCreateMockType;
            expect(data.model).toBe(modelName);
            expect(data.messages[0].content).toContain(
                'generate a JSON representation of a form'
            );
            expect(data.messages[0].content).toContain(orgContext);
            expect(data.messages[1].content).toBe(prompt);
            expect(data.response_format.json_schema.name).toBe(
                'create-form-schema'
            );

            // Test the suggestions logic
            expect(
                data.messages[0].content.includes(
                    'You must include three suggestions.'
                )
            ).toBe(enableSuggestions);
            expect(
                data.response_format.json_schema.schema.required.includes(
                    'suggestions'
                )
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

    it('returns {} if OpenAI response content is undefined', async () => {
        chatCreateMock.mockReturnValueOnce(
            Promise.resolve({
                choices: [{ message: { content: undefined } }],
            })
        );
        const result = await createFormWithOpenAI(
            envVars,
            prompt,
            'GOV.UK',
            false
        );
        expect(result).toBe('{}');
    });

    it('throws if OpenAI call fails', async () => {
        chatCreateMock.mockImplementationOnce(() => {
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
        [true, 'GOV.UK', ' for the UK Government'],
        [false, 'GOV.UK', ' for the UK Government'],
        [true, 'HMRC', ' for HMRC'],
        [false, 'HMRC', ' for HMRC'],
    ] as [boolean, PrototypeDesignSystemsType, string][])(
        'returns the response content from OpenAI (enableSuggestions=%s, designSystem=%s)',
        async (
            enableSuggestions: boolean,
            designSystem: PrototypeDesignSystemsType,
            orgContext: string
        ) => {
            const result = await updateFormWithOpenAI(
                envVars,
                prompt,
                {} as TemplateData, // Mocking TemplateData as an empty object
                designSystem,
                enableSuggestions
            );
            expect(chatCreateMock).toHaveBeenCalled();
            const data = chatCreateMock.mock.calls[0][0] as ChatCreateMockType;
            expect(data.model).toBe(modelName);
            expect(data.messages[0].content).toContain(
                'update a JSON representation of a form'
            );
            expect(data.messages[0].content).toContain(orgContext);
            expect(data.messages[1].content).toBe(prompt);
            expect(data.messages[1].content).toBe(prompt);
            expect(data.response_format.json_schema.name).toBe(
                'update-form-schema'
            );

            // Test the suggestions logic
            expect(
                data.messages[0].content.includes(
                    'You must include three brand-new suggestions;'
                )
            ).toBe(enableSuggestions);
            expect(
                data.response_format.json_schema.schema.required.includes(
                    'suggestions'
                )
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

    it('returns {} if OpenAI response content is undefined', async () => {
        chatCreateMock.mockReturnValueOnce(
            Promise.resolve({
                choices: [{ message: { content: undefined } }],
            })
        );
        const result = await updateFormWithOpenAI(
            envVars,
            prompt,
            {} as TemplateData, // Mocking TemplateData as an empty object
            'GOV.UK',
            false
        );
        expect(result).toBe('{}');
    });

    it('throws if OpenAI call fails', async () => {
        chatCreateMock.mockImplementationOnce(() => {
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
        ['GOV.UK', ' for the UK Government'],
        ['GOV.UK', ' for the UK Government'],
        ['HMRC', ' for HMRC'],
        ['HMRC', ' for HMRC'],
    ] as [PrototypeDesignSystemsType, string][])(
        'returns the response content from OpenAI (designSystem=%s)',
        async (
            designSystem: PrototypeDesignSystemsType,
            orgContext: string
        ) => {
            const result = await generateSuggestionsWithOpenAI(
                envVars,
                {} as TemplateData, // Mocking TemplateData as an empty object
                designSystem
            );
            expect(chatCreateMock).toHaveBeenCalled();
            const data = chatCreateMock.mock.calls[0][0] as ChatCreateMockType;
            expect(data.model).toBe(modelName);
            expect(data.messages[0].content).toContain(
                'generate suggestions for how to update'
            );
            expect(data.messages[0].content).toContain(orgContext);
            expect(data.messages.length).toBe(1);
            expect(data.response_format.json_schema.name).toBe(
                'generate-form-suggestions-schema'
            );

            // Test the result
            expect(result).toBe('{"name":"Test Form"}');
        }
    );

    it('returns {} if OpenAI response content is undefined', async () => {
        chatCreateMock.mockReturnValueOnce(
            Promise.resolve({
                choices: [{ message: { content: undefined } }],
            })
        );
        const result = await generateSuggestionsWithOpenAI(
            envVars,
            {} as TemplateData, // Mocking TemplateData as an empty object
            'GOV.UK'
        );
        expect(result).toBe('{}');
    });

    it('throws if OpenAI call fails', async () => {
        chatCreateMock.mockImplementationOnce(() => {
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
        expect(chatCreateMock).toHaveBeenCalled();
        const data = chatCreateMock.mock.calls[0][0] as ChatCreateMockType;
        expect(data.model).toBe(modelName);
        expect(data.messages[0].content).toContain(
            'Your task is to judge whether the form meets all of the provided Criteria.'
        );
        expect(data.response_format.json_schema.name).toBe('judge-form-schema');

        // Test the result
        expect(result).toBe('{"name":"Test Form"}');
    });

    it('returns {} if OpenAI response content is undefined', async () => {
        chatCreateMock.mockReturnValueOnce(
            Promise.resolve({
                choices: [{ message: { content: undefined } }],
            })
        );
        const result = await judgeFormWithOpenAI(
            envVars,
            'Judge this form',
            {} as TemplateData,
            'some criteria'
        );
        expect(result).toBe('{}');
    });

    it('throws if OpenAI call fails', async () => {
        chatCreateMock.mockImplementationOnce(() => {
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

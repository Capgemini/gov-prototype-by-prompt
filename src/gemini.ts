import opentelemetry from '@opentelemetry/api';
import * as nunjucks from 'nunjucks';
import { GoogleGenerativeAI, type Schema } from '@google/generative-ai';

import formSchema from '../data/extract-form-questions-schema.json';
import suggestionsSchema from '../data/generate-form-suggestions-schema.json';
import judgeSchema from '../data/llm-judge-response-schema.json';
import {
    EnvironmentVariables,
    PrototypeDesignSystemsType,
    TemplateData,
} from './types';

function convertJsonSchemaToGeminiSchema(jsonSchema: Record<string, unknown>): Schema {
    const converted = structuredClone(jsonSchema);
    const fieldsToRemove = new Set([
        '$schema',
        'examples',
        'multipleOf',
        'pattern',
        'additionalProperties',
    ]);

    function transform(obj: unknown): unknown {
        if (!obj || typeof obj !== 'object') {
            return obj;
        }

        if (Array.isArray(obj)) {
            return obj.map(transform);
        }

        const result: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(obj)) {
            // Skip unsupported JSON Schema fields
            if (fieldsToRemove.has(key)) {
                continue;
            }

            // Convert 'type' array to single type (take first non-null type)
            if (key === 'type' && Array.isArray(value)) {
                const nonNullType = (value as string[]).find(t => t !== 'null');
                result[key] = nonNullType || value[0];
            } else {
                result[key] = transform(value);
            }
        }

        return result;
    }

    return transform(converted) as Schema;
}

/**
 * Prompts the Gemini API to create a form with a given prompt and returns the response.
 * @param {EnvironmentVariables} envVars The environment variables containing Gemini API configuration.
 * @param {string} prompt The prompt to send to the Gemini API.
 * @param {PrototypeDesignSystemsType} designSystem The design system to use for the form.
 * @param {boolean} enableSuggestions Whether to include suggestions in the system prompt.
 * @returns {Promise<string>} The response from the Gemini API.
 * @throws an error if the API call fails.
 */
export async function createFormWithGemini(
    envVars: EnvironmentVariables,
    prompt: string,
    designSystem: PrototypeDesignSystemsType,
    enableSuggestions: boolean
): Promise<string> {
    const activeSpan = opentelemetry.trace.getActiveSpan();
    const client = new GoogleGenerativeAI(envVars.GEMINI_API_KEY!);

    if (activeSpan) activeSpan.setAttribute('gemini.prompt', prompt);

    // Remove changes_made from the schema
    const createSchema = structuredClone(formSchema);
    delete (createSchema.properties as unknown as { changes_made?: string })
        .changes_made;

    // Remove suggestions from the schema if not enabled, otherwise ensure it is required
    if (!enableSuggestions && 'suggestions' in createSchema.properties) {
        delete (createSchema.properties as unknown as { suggestions?: string })
            .suggestions;
    } else {
        createSchema.required.push('suggestions');
    }

    // Prepare the system prompt
    const systemPrompt = nunjucks.render('create-prompt.njk', {
        orgFor: getOrgFor(designSystem),
        suggestions: enableSuggestions
            ? 'You must include three suggestions.'
            : '',
    });

    const model = client.getGenerativeModel({
        model: envVars.GEMINI_MODEL_ID,
        systemInstruction: systemPrompt,
    });

    const response = await model.generateContent({
        contents: [
            {
                role: 'user',
                parts: [
                    {
                        text: prompt,
                    },
                ],
            },
        ],
        generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: convertJsonSchemaToGeminiSchema(createSchema),
        },
    });

    return handleGeminiResponse(response);
}

/**
 * Prompts the Gemini API to generate suggestions for a form and returns the response.
 * @param {EnvironmentVariables} envVars The environment variables containing Gemini API configuration.
 * @param {TemplateData} templateData The existing form data to suggest improvements for.
 * @param {PrototypeDesignSystemsType} designSystem The design system to use for the form.
 * @returns {Promise<string>} The response from the Gemini API.
 * @throws an error if the API call fails.
 */
export async function generateSuggestionsWithGemini(
    envVars: EnvironmentVariables,
    templateData: TemplateData,
    designSystem: PrototypeDesignSystemsType
): Promise<string> {
    const client = new GoogleGenerativeAI(envVars.GEMINI_API_KEY!);
    templateData = { ...templateData, suggestions: [] }; // Ensure suggestions are empty

    // Prepare the system prompt
    const systemPrompt = nunjucks.render('suggestions-prompt.njk', {
        orgFor: getOrgFor(designSystem),
    });

    const model = client.getGenerativeModel({
        model: envVars.GEMINI_MODEL_ID,
        systemInstruction: systemPrompt,
    });

    const response = await model.generateContent({
        contents: [
            {
                role: 'user',
                parts: [
                    {
                        text: JSON.stringify(templateData),
                    },
                ],
            },
        ],
        generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: convertJsonSchemaToGeminiSchema(suggestionsSchema),
        },
    });

    return handleGeminiResponse(response);
}

/**
 * Handle the response from the Gemini API.
 * @param {GenerateContentResponse} response the response from the Gemini API to handle
 * @returns {string} The processed response text from the Gemini API.
 */
export function handleGeminiResponse(response: {
    response?: {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
}): string {
    const textContent =
        response.response?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (textContent) {
        return textContent;
    }
    throw new Error('Unexpected response format from Gemini');
}

/**
 * Prompts the Gemini API to judge a form and returns the response.
 * @param {EnvironmentVariables} envVars The environment variables containing Gemini API configuration.
 * @param {string} prompt The user prompt to create the form.
 * @param {TemplateData} templateData The form data to judge.
 * @param {string} criteria The criteria to judge the form against.
 * @returns {Promise<string>} The response from the Gemini API.
 * @throws an error if the API call fails.
 */
export async function judgeFormWithGemini(
    envVars: EnvironmentVariables,
    prompt: string,
    templateData: TemplateData,
    criteria: string
): Promise<string> {
    const client = new GoogleGenerativeAI(envVars.GEMINI_API_KEY!);

    // Prepare the system prompt
    const systemPrompt = nunjucks.render('judge-prompt.njk');

    // Prepare the user prompt
    const userMessage = `User Prompt: "${prompt}"
JSON Form: ${JSON.stringify(templateData, null, 2)}
Criteria: "${criteria}"`;

    const model = client.getGenerativeModel({
        model: envVars.GEMINI_MODEL_ID,
        systemInstruction: systemPrompt,
    });

    const response = await model.generateContent({
        contents: [
            {
                role: 'user',
                parts: [
                    {
                        text: userMessage,
                    },
                ],
            },
        ],
        generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: convertJsonSchemaToGeminiSchema(judgeSchema),
        },
    });

    return handleGeminiResponse(response);
}

/**
 * Prompts the Gemini API to update with a given prompt and returns the response.
 * @param {EnvironmentVariables} envVars The environment variables containing Gemini API configuration.
 * @param {string} prompt The prompt to send to the Gemini API.
 * @param {TemplateData} templateData The existing form data to update.
 * @param {PrototypeDesignSystemsType} designSystem The design system to use for the form.
 * @param {boolean} enableSuggestions Whether to include suggestions in the system prompt.
 * @returns {Promise<string>} The response from the Gemini API.
 * @throws an error if the API call fails.
 */
export async function updateFormWithGemini(
    envVars: EnvironmentVariables,
    prompt: string,
    templateData: TemplateData,
    designSystem: PrototypeDesignSystemsType,
    enableSuggestions: boolean
): Promise<string> {
    const activeSpan = opentelemetry.trace.getActiveSpan();
    const client = new GoogleGenerativeAI(envVars.GEMINI_API_KEY!);

    if (activeSpan) activeSpan.setAttribute('gemini.prompt', prompt);

    // Mark changes_made as required
    const updateSchema = structuredClone(formSchema);
    updateSchema.required.push('changes_made');

    // Mark suggestions as required if enabled, otherwise remove it from the schema
    if (enableSuggestions) {
        updateSchema.required.push('suggestions');
    } else {
        delete (updateSchema.properties as unknown as { suggestions?: string })
            .suggestions;
    }

    // Ensure suggestions are empty in the prototype data
    if (enableSuggestions) {
        templateData = { ...templateData, suggestions: [] };
    }

    // Prepare the system prompt
    const systemPrompt = nunjucks.render('update-prompt.njk', {
        orgFor: getOrgFor(designSystem),
        suggestions: enableSuggestions
            ? 'You must include three brand-new suggestions.'
            : '',
    });

    const model = client.getGenerativeModel({
        model: envVars.GEMINI_MODEL_ID,
        systemInstruction: systemPrompt,
    });

    const response = await model.generateContent({
        contents: [
            {
                role: 'user',
                parts: [
                    {
                        text: `TEMPLATE DATA:\n${JSON.stringify(templateData, null, 2)}\n\nPROMPT: ${prompt}`,
                    },
                ],
            },
        ],
        generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: convertJsonSchemaToGeminiSchema(updateSchema),
        },
    });

    return handleGeminiResponse(response);
}

/**
 * Gets the organization context for the design system.
 * @param {PrototypeDesignSystemsType} designSystem The design system to use.
 * @returns {string} The organization context for the design system.
 */
function getOrgFor(designSystem: PrototypeDesignSystemsType): string {
    if (designSystem === 'HMRC') {
        return 'for HMRC';
    }
    return 'for the UK Government';
}

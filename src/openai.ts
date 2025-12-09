import opentelemetry from '@opentelemetry/api';
import * as nunjucks from 'nunjucks';
import { AzureOpenAI } from 'openai';

import formSchema from '../data/extract-form-questions-schema.json';
import suggestionsSchema from '../data/generate-form-suggestions-schema.json';
import judgeSchema from '../data/llm-judge-response-schema.json';
import {
    EnvironmentVariables,
    PrototypeDesignSystemsType,
    TemplateData,
} from './types';

/**
 * Prompts the OpenAI API to create a form with a given prompt and returns the response.
 * @param {EnvironmentVariables} envVars The environment variables containing OpenAI API configuration.
 * @param {string} prompt The prompt to send to the OpenAI API.
 * @param {PrototypeDesignSystemsType} designSystem The design system to use for the form.
 * @param {boolean} enableSuggestions Whether to include suggestions in the system prompt.
 * @returns {Promise<string>} The response from the OpenAI API.
 * @throws an error if the API call fails.
 */
export async function createFormWithOpenAI(
    envVars: EnvironmentVariables,
    prompt: string,
    designSystem: PrototypeDesignSystemsType,
    enableSuggestions: boolean
): Promise<string> {
    const activeSpan = opentelemetry.trace.getActiveSpan();
    const client = new AzureOpenAI({
        apiKey: envVars.AZURE_OPENAI_API_KEY,
        apiVersion: envVars.AZURE_OPENAI_API_VERSION,
        deployment: envVars.AZURE_OPENAI_DEPLOYMENT_NAME,
        endpoint: envVars.AZURE_OPENAI_ENDPOINT,
    });

    if (activeSpan) activeSpan.setAttribute('openai.prompt', prompt);

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

    return client.chat.completions
        .create({
            messages: [
                {
                    content: systemPrompt,
                    role: 'system',
                },
                {
                    content: prompt,
                    role: 'user',
                },
            ],
            model: envVars.AZURE_OPENAI_MODEL_NAME,
            response_format: {
                json_schema: {
                    name: 'create-form-schema',
                    schema: createSchema,
                    strict: true,
                },
                type: 'json_schema',
            },
        })
        .then((response) => response.choices[0].message.content ?? '{}');
}

/**
 * Prompts the OpenAI API to update with a given prompt and returns the response.
 * @param {EnvironmentVariables} envVars The environment variables containing OpenAI API configuration.
 * @param {TemplateData} templateData The existing form data to update.
 * @param {PrototypeDesignSystemsType} designSystem The design system to use for the form.
 * @returns {Promise<string>} The response from the OpenAI API.
 * @throws an error if the API call fails.
 */
export async function generateSuggestionsWithOpenAI(
    envVars: EnvironmentVariables,
    templateData: TemplateData,
    designSystem: PrototypeDesignSystemsType
): Promise<string> {
    const client = new AzureOpenAI({
        apiKey: envVars.AZURE_OPENAI_API_KEY,
        apiVersion: envVars.AZURE_OPENAI_API_VERSION,
        deployment: envVars.AZURE_OPENAI_DEPLOYMENT_NAME,
        endpoint: envVars.AZURE_OPENAI_ENDPOINT,
    });
    templateData = { ...templateData, suggestions: [] }; // Ensure suggestions are empty

    // Prepare the system prompt
    const systemPrompt = nunjucks.render('suggestions-prompt.njk', {
        orgFor: getOrgFor(designSystem),
    });

    return client.chat.completions
        .create({
            messages: [
                {
                    content: systemPrompt,
                    role: 'system',
                },
                {
                    content: JSON.stringify(templateData),
                    role: 'user',
                },
            ],
            model: envVars.AZURE_OPENAI_MODEL_NAME,
            response_format: {
                json_schema: {
                    name: 'generate-form-suggestions-schema',
                    schema: suggestionsSchema,
                    strict: true,
                },
                type: 'json_schema',
            },
        })
        .then((response) => response.choices[0].message.content ?? '{}');
}

/**
 * Prompts the OpenAI API to judge a form and returns the response.
 * @param {EnvironmentVariables} envVars The environment variables containing OpenAI API configuration.
 * @param {string} prompt The user prompt to create the form.
 * @param {TemplateData} templateData The form data to judge.
 * @param {string} criteria The criteria to judge the form against.
 * @returns {Promise<string>} The response from the OpenAI API.
 * @throws an error if the API call fails.
 */
export async function judgeFormWithOpenAI(
    envVars: EnvironmentVariables,
    prompt: string,
    templateData: TemplateData,
    criteria: string
): Promise<string> {
    const client = new AzureOpenAI({
        apiKey: envVars.AZURE_OPENAI_API_KEY,
        apiVersion: envVars.AZURE_OPENAI_API_VERSION,
        deployment: envVars.AZURE_OPENAI_DEPLOYMENT_NAME,
        endpoint: envVars.AZURE_OPENAI_ENDPOINT,
    });

    // Prepare the system prompt
    const systemPrompt = nunjucks.render('judge-prompt.njk');

    // Prepare the user prompt
    const userMessage = `User Prompt: "${prompt}"
JSON Form: ${JSON.stringify(templateData, null, 2)}
Criteria: "${criteria}"`;

    return client.chat.completions
        .create({
            messages: [
                {
                    content: systemPrompt,
                    role: 'system',
                },
                {
                    content: userMessage,
                    role: 'user',
                },
            ],
            model: envVars.AZURE_OPENAI_MODEL_NAME,
            response_format: {
                json_schema: {
                    name: 'judge-form-schema',
                    schema: judgeSchema,
                    strict: true,
                },
                type: 'json_schema',
            },
        })
        .then((response) => response.choices[0].message.content ?? '{}');
}

/**
 * Prompts the OpenAI API to update with a given prompt and returns the response.
 * @param {EnvironmentVariables} envVars The environment variables containing OpenAI API configuration.
 * @param {string} prompt The prompt to send to the OpenAI API.
 * @param {TemplateData} templateData The existing form data to update.
 * @param {PrototypeDesignSystemsType} designSystem The design system to use for the form.
 * @param {boolean} enableSuggestions Whether to include suggestions in the system prompt.
 * @returns {Promise<string>} The response from the OpenAI API.
 * @throws an error if the API call fails.
 */
export async function updateFormWithOpenAI(
    envVars: EnvironmentVariables,
    prompt: string,
    templateData: TemplateData,
    designSystem: PrototypeDesignSystemsType,
    enableSuggestions: boolean
): Promise<string> {
    const activeSpan = opentelemetry.trace.getActiveSpan();
    const client = new AzureOpenAI({
        apiKey: envVars.AZURE_OPENAI_API_KEY,
        apiVersion: envVars.AZURE_OPENAI_API_VERSION,
        deployment: envVars.AZURE_OPENAI_DEPLOYMENT_NAME,
        endpoint: envVars.AZURE_OPENAI_ENDPOINT,
    });

    if (activeSpan) activeSpan.setAttribute('openai.prompt', prompt);

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

    return client.chat.completions
        .create({
            messages: [
                {
                    content: systemPrompt,
                    role: 'system',
                },
                {
                    content: JSON.stringify(templateData),
                    role: 'user',
                },
                {
                    content: prompt,
                    role: 'user',
                },
            ],
            model: envVars.AZURE_OPENAI_MODEL_NAME,
            response_format: {
                json_schema: {
                    name: 'update-form-schema',
                    schema: updateSchema,
                    strict: true,
                },
                type: 'json_schema',
            },
        })
        .then((response) => response.choices[0].message.content ?? '{}');
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

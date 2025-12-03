import opentelemetry from '@opentelemetry/api';
import { AzureOpenAI } from 'openai';

import formSchema from '../data/extract-form-questions-schema.json';
import suggestionsSchema from '../data/generate-form-suggestions-schema.json';
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

    const response = await client.chat.completions.create({
        messages: [
            {
                content: getCreateSystemPrompt(designSystem, enableSuggestions),
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
    });

    const responseText = response.choices[0].message.content;
    return responseText ?? '{}';
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

    const response = await client.chat.completions.create({
        messages: [
            {
                content: getGenerateSuggestionsSystemPrompt(
                    templateData,
                    designSystem
                ),
                role: 'system',
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
    });

    const responseText = response.choices[0].message.content;
    return responseText ?? '{}';
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

    const response = await client.chat.completions.create({
        messages: [
            {
                content: getUpdateSystemPrompt(
                    templateData,
                    designSystem,
                    enableSuggestions
                ),
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
                name: 'update-form-schema',
                schema: updateSchema,
                strict: true,
            },
            type: 'json_schema',
        },
    });

    const responseText = response.choices[0].message.content;
    return responseText ?? '{}';
}

/**
 * Gets the system prompt to generate a form in JSON format.
 * @param {PrototypeDesignSystemsType} designSystem The design system to use for the form.
 * @param {boolean} enableSuggestions Whether to include suggestions in the system prompt.
 * @returns {string} A system prompt for the LLM that defines its role and the expected output format.
 */
function getCreateSystemPrompt(
    designSystem: PrototypeDesignSystemsType,
    enableSuggestions: boolean
): string {
    const orgFor = getOrgFor(designSystem);
    return `You are a specialised AI assistant that helps UK government workers create online forms${orgFor}.

Your task is to generate a JSON representation of a form${orgFor} based on user input. The form should include all necessary questions and be ordered in a logical sequence.

Questions in the form are sequential depending on their next_question_value. Branching choice questions allow for different next_question_values depending on the answer selected. Example: To ask "Have you lost your licence?" and only ask "What date was it lost?" if the answer is "Yes", use a 'branching_choice' question with options_branching set accordingly.

Text should be in British English and follow the UK Government Digital Service (GDS) style guide. Do not use technical jargon or the word "please". Use simple, clear language that is easy to understand.

Your response must only be valid JSON that adheres to the schema. ${enableSuggestions ? 'You must include three suggestions. ' : ''}No other data should be included in your response.`;
}

/**
 * Gets the system prompt to generate suggestions for a form.
 * @param {TemplateData} templateData The existing form data to update.
 * @param {PrototypeDesignSystemsType} designSystem The design system to use for the form.
 * @returns {string} A system prompt for the LLM that defines its role and the expected output format.
 */
function getGenerateSuggestionsSystemPrompt(
    templateData: TemplateData,
    designSystem: PrototypeDesignSystemsType
): string {
    const orgFor = getOrgFor(designSystem);
    return `You are a specialised AI assistant that helps UK government workers create online forms${orgFor}.

Your task is to generate suggestions for how to update a JSON representation of a form${orgFor}. 

Each suggestion must be a specific and direct instruction. Suggestions must be to add, update, or remove a question, or to update the form. Suggestions should be phrased as direct instructions, such as 'Add a question about the user's preferred contact method' or 'Ensure the user is at least 18 years old in question 5.'

Text should be in UK English and follow the Government Digital Service (GDS) style guide. Do not use technical jargon or the word "please". Use simple, clear language that is easy to understand.

Your response must only be valid JSON that adheres to the schema. No other data should be included in your response.

The form${orgFor} to generate suggestions for is as follows:
${JSON.stringify(templateData, null, 2)}`;
}

/**
 * Gets the organization context for the design system.
 * @param {PrototypeDesignSystemsType} designSystem The design system to use.
 * @returns {string} The organization context for the design system.
 */
function getOrgFor(designSystem: PrototypeDesignSystemsType): string {
    if (designSystem === 'HMRC') {
        return ' for HMRC';
    }
    return ' for the UK Government';
}

/**
 * Gets the system prompt to update a form in JSON format.
 * @param {TemplateData} templateData The existing form data to update.
 * @param {PrototypeDesignSystemsType} designSystem The design system to use for the form.
 * @param {boolean} enableSuggestions Whether to include suggestions in the system prompt.
 * @returns {string} A system prompt for the LLM that defines its role and the expected output format.
 */
function getUpdateSystemPrompt(
    templateData: TemplateData,
    designSystem: PrototypeDesignSystemsType,
    enableSuggestions: boolean
): string {
    const orgFor = getOrgFor(designSystem);
    return `You are a specialised AI assistant that helps UK government workers create online forms${orgFor}.

Your task is to update a JSON representation of a form${orgFor} based on user input. The form should include all necessary questions and be ordered in a logical sequence. Only make the changes specified by the user, do not make any other changes.

Questions in the form are sequential depending on their next_question_value. Branching choice questions allow for different next_question_values depending on the answer selected. Example: To ask "Have you lost your licence?" and only ask "What date was it lost?" if the answer is "Yes", use a 'branching_choice' question with options_branching set accordingly.

Text should be in UK English and follow the Government Digital Service (GDS) style guide. Do not use technical jargon or the word "please". Use simple, clear language that is easy to understand. 

Your response must only be valid JSON that adheres to the schema. The explanation should only describe the changes made to the form. ${enableSuggestions ? 'You must include three brand-new suggestions; do not reuse the existing suggestions. ' : ''}No other data should be included in your response.

The form${orgFor} to update is as follows:
${JSON.stringify(templateData, null, 2)}`;
}

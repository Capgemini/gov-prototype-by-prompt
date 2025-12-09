import opentelemetry from '@opentelemetry/api';
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

    return client.chat.completions
        .create({
            messages: [
                {
                    content: getCreateSystemPrompt(
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

    return client.chat.completions
        .create({
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
        })
        .then((response) => response.choices[0].message.content ?? '{}');
}

/**
 * Gets the system prompt to generate a form in JSON format.
 * @param {PrototypeDesignSystemsType} designSystem The design system to use for the form.
 * @param {boolean} enableSuggestions Whether to include suggestions in the system prompt.
 * @returns {string} A system prompt for the LLM that defines its role and the expected output format.
 */
export function getCreateSystemPrompt(
    designSystem: PrototypeDesignSystemsType,
    enableSuggestions: boolean
): string {
    const orgFor = getOrgFor(designSystem);
    return `You are a specialised AI assistant that helps UK government workers create online forms${orgFor}.

Your task is to generate a JSON representation of a form${orgFor} based on user input. The form should include all necessary questions and be ordered in a logical sequence. The question flow must be clear and logical with next_question_values, and make the most sense for the user's journey.

Questions in the form are sequential depending on their next_question_value. Branching choice questions allow for different next_question_values depending on the answer selected. Example: To ask "Have you lost your licence?" and only ask "What date was it lost?" if the answer is "Yes", use a 'branching_choice' question with options_branching set accordingly. 

Eligibility requirements or pre-requisites should not be included as questions. They should be stated before the user starts. 

Text should be in British English and follow the UK Government Digital Service (GDS) style guide. Do not use technical jargon or the word "please". Use plain, direct language that is easy to understand.

Your response must only be valid JSON that adheres to the schema. ${enableSuggestions ? 'You must include three suggestions. ' : ''}No other data should be included in your response.`;
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

    const userMessage = `User Prompt: "${prompt}"
JSON Form: ${JSON.stringify(templateData, null, 2)}
Criteria: "${criteria}"`;

    return client.chat.completions
        .create({
            messages: [
                {
                    content: getJudgeSystemPrompt(),
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

    return client.chat.completions
        .create({
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
        })
        .then((response) => response.choices[0].message.content ?? '{}');
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

Text should be in British English and follow the UK Government Digital Service (GDS) style guide. Do not use technical jargon or the word "please". Use plain, direct language that is easy to understand.

Your response must only be valid JSON that adheres to the schema. No other data should be included in your response.

The form${orgFor} to generate suggestions for is as follows:
${JSON.stringify(templateData, null, 2)}`;
}

/**
 * Gets the system prompt to judge a form in JSON format.
 * @returns {string} A system prompt for the LLM that defines its role and the expected output format.
 */
function getJudgeSystemPrompt(): string {
    return `You are grading a JSON Form according to given Criteria. The user has used their own Prompt to create a JSON Form. Your task is to judge whether the form meets all of the provided Criteria. 

In the form, the next_question_value is the index (starting from 1) of the next question in the form sequence, or -1 to finish the form.

The JSON Form must fully meet the Criteria to pass. If it does not meet all aspects of the Criteria, it fails. Provide a concise reason explaining why the form does or does not meet the Criteria. You respond with a JSON object with this structure: {reason: string, pass: boolean}.

Examples:

User Prompt: "Create a form to collect user information that asks for a name and email."
JSON Form: {questions: [{type: "text", question_text: "What is your name?", next_question_value: 2}, {type: "email", question_text: "What is your email?", next_question_value: -1}]}
Criteria: "The form includes all necessary questions and is logically ordered."
{reason: "The form includes questions for name and email, and the questions are in a logical order.", pass: true}

User Prompt: "Create a form to register for a mailing list that asks for name and address."
JSON Form: {questions: [{type: "text", question_text: "What is your name?", next_question_value: -1}, {type: "address", question_text: "What is your address?", next_question_value: -1}]}
Criteria: "The form includes all necessary questions and is logically ordered."
{reason: "The questions are not in a logical order; the address question is unreachable.", pass: false}`;
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

Your task is to update a JSON representation of a form${orgFor} based on user input. The form should include all necessary questions and be ordered in a logical sequence. The question flow must be clear and logical with next_question_values, and make the most sense for the user's journey. Only make the changes specified by the user, do not make any other changes.

Questions in the form are sequential depending on their next_question_value. Branching choice questions allow for different next_question_values depending on the answer selected. Example: To ask "Have you lost your licence?" and only ask "What date was it lost?" if the answer is "Yes", use a 'branching_choice' question with options_branching set accordingly.

Eligibility requirements or pre-requisites should not be included as questions. They should be stated before the user starts. 

Text should be in British English and follow the UK Government Digital Service (GDS) style guide. Do not use technical jargon or the word "please". Use plain, direct language that is easy to understand. 

Your response must only be valid JSON that adheres to the schema. The explanation should only describe the changes made to the form. ${enableSuggestions ? 'You must include three brand-new suggestions; do not reuse the existing suggestions. ' : ''}No other data should be included in your response.

The form${orgFor} to update is as follows:
${JSON.stringify(templateData, null, 2)}`;
}

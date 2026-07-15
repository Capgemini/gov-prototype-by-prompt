import {
    createFormWithGemini,
    generateSuggestionsWithGemini,
    judgeFormWithGemini,
    updateFormWithGemini,
} from './gemini';
import {
    createFormWithOpenAI,
    generateSuggestionsWithOpenAI,
    judgeFormWithOpenAI,
    updateFormWithOpenAI,
} from './openai';
import {
    EnvironmentVariables,
    PrototypeDesignSystemsType,
    TemplateData,
} from './types';

/**
 * Creates a form using the configured LLM provider.
 */
export async function createForm(
    envVars: EnvironmentVariables,
    prompt: string,
    designSystem: PrototypeDesignSystemsType,
    enableSuggestions: boolean
): Promise<string> {
    if (envVars.LLM_PROVIDER === 'gemini') {
        return createFormWithGemini(
            envVars,
            prompt,
            designSystem,
            enableSuggestions
        );
    }
    return createFormWithOpenAI(
        envVars,
        prompt,
        designSystem,
        enableSuggestions
    );
}

/**
 * Updates a form using the configured LLM provider.
 */
export async function updateForm(
    envVars: EnvironmentVariables,
    prompt: string,
    templateData: TemplateData,
    designSystem: PrototypeDesignSystemsType,
    enableSuggestions: boolean
): Promise<string> {
    if (envVars.LLM_PROVIDER === 'gemini') {
        return updateFormWithGemini(
            envVars,
            prompt,
            templateData,
            designSystem,
            enableSuggestions
        );
    }
    return updateFormWithOpenAI(
        envVars,
        prompt,
        templateData,
        designSystem,
        enableSuggestions
    );
}

/**
 * Generates suggestions for a form using the configured LLM provider.
 */
export async function generateSuggestions(
    envVars: EnvironmentVariables,
    templateData: TemplateData,
    designSystem: PrototypeDesignSystemsType
): Promise<string> {
    if (envVars.LLM_PROVIDER === 'gemini') {
        return generateSuggestionsWithGemini(
            envVars,
            templateData,
            designSystem
        );
    }
    return generateSuggestionsWithOpenAI(
        envVars,
        templateData,
        designSystem
    );
}

/**
 * Judges a form using the configured LLM provider.
 */
export async function judgeForm(
    envVars: EnvironmentVariables,
    prompt: string,
    templateData: TemplateData,
    criteria: string
): Promise<string> {
    if (envVars.LLM_PROVIDER === 'gemini') {
        return judgeFormWithGemini(envVars, prompt, templateData, criteria);
    }
    return judgeFormWithOpenAI(envVars, prompt, templateData, criteria);
}

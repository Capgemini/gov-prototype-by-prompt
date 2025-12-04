import 'dotenv/config';

import formSchema from '../data/extract-form-questions-schema.json';
import { createFormWithOpenAI } from '../src/openai';
import { DefaultPrototypeDesignSystem, ITemplateData } from '../src/types';
import {
    getEnvironmentVariables,
    validateTemplateDataText,
} from '../src/utils';
import testData from './test-data.json';

const envVars = getEnvironmentVariables();

interface TestCase {
    actual: ITemplateData;
    expected: ITemplateData;
    prompt: string;
}

/**
 * Generate a validated response from OpenAI for a given prompt.
 * @param {string} prompt the prompt to send to OpenAI
 * @returns {Promise<ITemplateData>} the validated response
 */
async function generateAndValidateForm(prompt: string): Promise<ITemplateData> {
    let responseText = await createFormWithOpenAI(
        envVars,
        prompt,
        DefaultPrototypeDesignSystem,
        false
    );
    responseText = responseText
        .replace(/\\"/g, '“')
        .replace(/(?<!\\)\\(?!\\)/g, '\\\\');
    const templateData = validateTemplateDataText(responseText, formSchema);
    return templateData;
}

let cachedResponses: null | TestCase[] = null;

/**
 * Generate and cache test data by processing prompts through OpenAI.
 * @returns {Promise<TestCase[]>} the test data
 */
export async function getTestData(): Promise<TestCase[]> {
    if (cachedResponses) return cachedResponses;

    const result: TestCase[] = [];
    for (const testCase of testData as {
        expected: ITemplateData;
        prompt: string;
    }[]) {
        const actual = await generateAndValidateForm(testCase.prompt);
        result.push({
            actual,
            expected: testCase.expected,
            prompt: testCase.prompt,
        });
    }
    cachedResponses = result;
    return cachedResponses;
}

/**
 * Get the total number of test data cases.
 * @returns {number} the total number of test data cases
 */
export function getTestDataLength(): number {
    return testData.length;
}

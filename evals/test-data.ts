import 'dotenv/config';

import { createFormWithOpenAI } from '../src/openai';
import { DefaultPrototypeDesignSystem, TemplateData } from '../src/types';
import { getEnvironmentVariables } from '../src/utils';
import testData from './test-data.json';

const envVars = getEnvironmentVariables();

interface TestCase {
    actual: TemplateData;
    expected: TemplateData;
    prompt: string;
}

/**
 * Generate a validated response from OpenAI for a given prompt.
 * @param {string} prompt the prompt to send to OpenAI
 * @returns {Promise<TemplateData>} the validated response
 */
async function generateAndValidateForm(prompt: string): Promise<TemplateData> {
    return createFormWithOpenAI(
        envVars,
        prompt,
        DefaultPrototypeDesignSystem,
        false
    ).then((responseText) => {
        responseText = responseText
            .replace(/\\"/g, '“')
            .replace(/(?<!\\)\\(?!\\)/g, '\\\\');

        // Parse the JSON and remove any null values
        const templateData = JSON.parse(responseText, (key, value) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            if (value !== null) return value;
        }) as TemplateData;
        return templateData;
    });
}

let cachedResponses: null | TestCase[] = null;

/**
 * Generate and cache test data by processing prompts through OpenAI.
 * @returns {Promise<TestCase[]>} the test data
 */
export async function getTestData(): Promise<TestCase[]> {
    if (cachedResponses) return cachedResponses;

    cachedResponses = await Promise.all(
        testData.map(async (testCase) => {
            return generateAndValidateForm(testCase.prompt).then((actual) => ({
                actual,
                expected: testCase.expected,
                prompt: testCase.prompt,
            }));
        })
    );
    return cachedResponses;
}

/**
 * Get the total number of test data cases.
 * @returns {number} the total number of test data cases
 */
export function getTestDataLength(): number {
    return testData.length;
}

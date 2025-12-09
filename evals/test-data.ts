import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

import testData from '../data/evals-test-data.json';
import { createFormWithOpenAI } from '../src/openai';
import { DefaultPrototypeDesignSystem, TemplateData } from '../src/types';
import { getEnvironmentVariables } from '../src/utils';

const envVars = getEnvironmentVariables();

interface TestCase {
    actual: TemplateData;
    expected: TemplateData;
    prompt: string;
}

// Define the cache file path using the global variable
const cachePath = path.join(
    process.cwd(),
    'evals',
    '.tmp',
    (globalThis as unknown as { CACHE_FILE: string }).CACHE_FILE
);
fs.mkdirSync(path.dirname(cachePath), { recursive: true });

/**
 * Generate and cache test data by processing prompts through OpenAI.
 * @returns {Promise<TestCase[]>} the test data
 */
export async function getTestData(): Promise<TestCase[]> {
    const cache = readCache();
    if (cache) return cache;

    const cachedResponses = await Promise.all(
        testData.map(
            async (testCase: { expected: TemplateData; prompt: string }) => {
                return generateAndValidateForm(testCase.prompt).then(
                    (actual) => ({
                        actual,
                        expected: testCase.expected,
                        prompt: testCase.prompt,
                    })
                );
            }
        )
    );
    writeCache(cachedResponses);
    return cachedResponses;
}

/**
 * Get the total number of test data cases.
 * @returns {number} the total number of test data cases
 */
export function getTestDataLength(): number {
    return testData.length;
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

function readCache(): null | TestCase[] {
    try {
        return JSON.parse(fs.readFileSync(cachePath, 'utf8')) as TestCase[];
    } catch {
        return null;
    }
}

function writeCache(obj: TestCase[]): void {
    fs.writeFileSync(cachePath, JSON.stringify(obj, null, 2));
}

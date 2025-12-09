import path from 'node:path';
import * as nunjucks from 'nunjucks';

import { judgeFormWithOpenAI } from '../src/openai';
import { EnvironmentVariables, TemplateData } from '../src/types';

// Configure Nunjucks templating environment to make templates available during tests
export const nunjucksEnv = nunjucks.configure(
    [path.join(__dirname, '../data/prompts/')],
    {
        autoescape: true,
    }
);

// Custom Jest matcher to evaluate form data using an LLM judge
expect.extend({
    async toPassLLMJudge(
        actual: TemplateData,
        envVars: EnvironmentVariables,
        prompt: string,
        criteria: string
    ): Promise<jest.CustomMatcherResult> {
        const responseText = await judgeFormWithOpenAI(
            envVars,
            prompt,
            actual,
            criteria
        );
        const result = JSON.parse(responseText) as {
            pass?: boolean;
            reason?: string;
        };
        if (result.pass) {
            return {
                message: () =>
                    `Form for prompt "${prompt}" fully meets criteria "${criteria}".`,
                pass: true,
            };
        } else {
            return {
                message: () =>
                    `Form did not meet criteria.\nCriteria: ${criteria}\nReason: ${result.reason ?? 'unspecified'}\nPrompt: ${prompt}`,
                pass: false,
            };
        }
    },
});

// Declare the custom matcher in the Jest namespace
declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace jest {
        interface Matchers<R> {
            toPassLLMJudge(
                envVars: EnvironmentVariables,
                prompt: string,
                criteria: string
            ): Promise<R>;
        }
    }
}

import 'dotenv/config';

import { getEnvironmentVariables } from '../src/utils';
import { getTestData, getTestDataLength } from './test-data';

const envVars = getEnvironmentVariables();
const indexes = Array.from({ length: getTestDataLength() }, (_, i) => i);

describe('Form LLM evaluation', () => {
    it.each(indexes)('not missing any questions (i=%i)', async (index) => {
        const { actual, prompt } = (await getTestData())[index];
        await expect(actual).toPassLLMJudge(
            envVars,
            prompt,
            `Form is not missing any questions.`
        );
    });

    it.each(indexes)('all questions are reachable (i=%i)', async (index) => {
        const { actual, prompt } = (await getTestData())[index];
        await expect(actual).toPassLLMJudge(
            envVars,
            prompt,
            'All questions are reachable.'
        );
    });

    it.each(indexes)(
        'no duplicate or redundant questions (i=%i)',
        async (index) => {
            const { actual, prompt } = (await getTestData())[index];
            await expect(actual).toPassLLMJudge(
                envVars,
                prompt,
                `Form has no duplicate or redundant questions.`
            );
        }
    );

    it.each(indexes)(
        'next_question_fields are set correctly and logically (i=%i)',
        async (index) => {
            const { actual, prompt } = (await getTestData())[index];
            await expect(actual).toPassLLMJudge(
                envVars,
                prompt,
                'The next_question_value fields are set correctly and lead to a logical flow through the form.'
            );
        }
    );

    it.each(indexes)(
        'options are mutually exclusive and collectively exhaustive (i=%i)',
        async (index) => {
            const { actual, prompt } = (await getTestData())[index];
            await expect(actual).toPassLLMJudge(
                envVars,
                prompt,
                `For single_choice, multiple_choice, and branching_choice questions, the options cover all reasonable user responses without overlap.`
            );
        }
    );

    it.each(indexes)(
        'wording should align to the GDS style guide (i=%i)',
        async (index) => {
            const { actual, prompt } = (await getTestData())[index];
            await expect(actual).toPassLLMJudge(
                envVars,
                prompt,
                'The wording adheres to the UK Government Digital Service (GDS) style guide.'
            );
        }
    );

    it.each(indexes)(
        'error messages are clear, concise, and actionable (i=%i)',
        async (index) => {
            const { actual, prompt } = (await getTestData())[index];
            await expect(actual).toPassLLMJudge(
                envVars,
                prompt,
                `All required_error_texts are direct, use plain English, and do not start with "please" or "you must".`
            );
        }
    );

    it.each(indexes)(
        'optional questions end with (optional) (i=%i)',
        async (index) => {
            const { actual, prompt } = (await getTestData())[index];
            await expect(actual).toPassLLMJudge(
                envVars,
                prompt,
                `All questions that are not required, and only non-required questions, end with the phrase "(optional)". Pass if no optional questions exist.`
            );
        }
    );

    it.each(indexes)(
        'hint text is a single short sentence where needed (i=%i)',
        async (index) => {
            const { actual, prompt } = (await getTestData())[index];
            await expect(actual).toPassLLMJudge(
                envVars,
                prompt,
                `Hint text is only present if needed, and is a single short sentence.`
            );
        }
    );

    it.each(indexes)(
        'form title is concise and descriptive (i=%i)',
        async (index) => {
            const { actual, prompt } = (await getTestData())[index];
            await expect(actual).toPassLLMJudge(
                envVars,
                prompt,
                `Form title starts with a verb and describes what the form allows users to do.`
            );
        }
    );

    it.each(indexes)(
        'questions are unambiguous and use plain language (i=%i)',
        async (index) => {
            const { actual, prompt } = (await getTestData())[index];
            await expect(actual).toPassLLMJudge(
                envVars,
                prompt,
                `Questions are unambiguous, use plain language, and avoid technical jargon.`
            );
        }
    );
});

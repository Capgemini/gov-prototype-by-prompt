import { MockAgent, setGlobalDispatcher } from 'undici';

import { prototypeData1 } from '../jest/mockTestData';
import { ITemplateData } from '../src/types';

const mockAgent = new MockAgent();
mockAgent.disableNetConnect();
mockAgent.enableNetConnect('127.0.0.1');
mockAgent.enableNetConnect('localhost');

/**
 * Convert the prototype JSON data into the format returned by OpenAI.
 * @param {ITemplateData} input the prototype JSON data.
 * @returns {object} the normalised data in the format returned by OpenAI.
 */
export function normaliseTemplateData(input: ITemplateData): object {
    if (!Array.isArray(input.questions)) return input;

    return {
        ...input,
        questions: input.questions.map((q): object => {
            const isRequired = q.required;

            return {
                ...q,
                date_of_birth_maximum_age: q.date_of_birth_maximum_age ?? null,
                date_of_birth_minimum_age: q.date_of_birth_minimum_age ?? null,
                detailed_explanation: q.detailed_explanation ?? null,
                hint_text: q.hint_text ?? null,
                options: q.options ?? null,
                options_branching: q.options_branching ?? null,
                required_error_text:
                    q.required_error_text ??
                    (isRequired
                        ? `No answer provided for required question: "${q.question_text}"`
                        : null),
            };
        }),
    };
}

mockAgent
    .get('https://example.com')
    .intercept({
        method: 'POST',
        path: '/v1/responses',
    })
    .reply(
        200,
        {
            id: 'resp_test_123',
            object: 'response',
            output: [
                {
                    content: [
                        {
                            text: JSON.stringify(
                                normaliseTemplateData(prototypeData1.json)
                            ),
                            type: 'output_text',
                        },
                    ],
                    role: 'assistant',
                    type: 'message',
                },
            ],
            output_text: JSON.stringify(
                normaliseTemplateData(prototypeData1.json)
            ),
        },
        {
            headers: {
                'content-type': 'application/json',
            },
        }
    );

setGlobalDispatcher(mockAgent);

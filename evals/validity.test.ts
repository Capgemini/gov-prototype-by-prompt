import 'dotenv/config';

import { getTestData, getTestDataLength } from './test-data';

const indexes = Array.from({ length: getTestDataLength() }, (_, i) => i);

describe('Form validity', () => {
    it.each(indexes)(
        'should have valid question next_question_values (i=%i)',
        async (index) => {
            const { actual } = (await getTestData())[index];
            for (const [index, question] of actual.questions.entries()) {
                if (question.next_question_value !== undefined) {
                    const validNextQuestionValues = new Set<number>([
                        -1,
                        ...Array.from(
                            { length: actual.questions.length - index - 1 },
                            (_, i) => index + 2 + i
                        ),
                    ]);
                    expect(validNextQuestionValues).toContain(
                        question.next_question_value
                    );
                }
            }
        }
    );

    it.each(indexes)(
        'should have valid branching_choice next_question_values (i=%i)',
        async (index) => {
            const { actual } = (await getTestData())[index];
            for (const [index, question] of actual.questions.entries()) {
                if (question.answer_type === 'branching_choice') {
                    const validNextQuestionValues = new Set<number>([
                        -1,
                        ...Array.from(
                            { length: actual.questions.length - index - 1 },
                            (_, i) => index + 2 + i
                        ),
                    ]);
                    for (const option of question.options_branching ?? []) {
                        expect(validNextQuestionValues).toContain(
                            option.next_question_value
                        );
                    }
                }
            }
        }
    );

    it.each(indexes)(
        'should have at least one option for choice questions (i=%i)',
        async (index) => {
            const { actual } = (await getTestData())[index];
            actual.questions
                .filter(
                    (q) =>
                        q.answer_type === 'single_choice' ||
                        q.answer_type === 'multiple_choice'
                )
                .forEach((q) => {
                    expect(q.options && q.options.length > 0).toBe(true);
                });
            actual.questions
                .filter((q) => q.answer_type === 'branching_choice')
                .forEach((q) => {
                    expect(
                        q.options_branching && q.options_branching.length > 0
                    ).toBe(true);
                });
        }
    );
});

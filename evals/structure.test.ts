import 'dotenv/config';

import { getTestData, getTestDataLength } from './test-data';

const indexes = Array.from({ length: getTestDataLength() }, (_, i) => i);

describe('Form structure', () => {
    it.each(indexes)(
        'should have the correct number of questions (i=%i)',
        async (index) => {
            const { actual, expected } = (await getTestData())[index];
            expect(actual.questions.length).toEqual(expected.questions.length);
        }
    );

    it.each(indexes)(
        'should have the correct question answer_types (i=%i)',
        async (index) => {
            const { actual, expected } = (await getTestData())[index];
            expect(actual.questions.map((q) => q.answer_type)).toEqual(
                expected.questions.map((q) => q.answer_type)
            );
        }
    );

    it.each(indexes)(
        'should have the correct question next_question_values (i=%i)',
        async (index) => {
            const { actual, expected } = (await getTestData())[index];
            expect(actual.questions.map((q) => q.next_question_value)).toEqual(
                expected.questions.map((q) => q.next_question_value)
            );
        }
    );

    it.each(indexes)(
        'should have the correct branching_choice next_question_values (i=%i)',
        async (index) => {
            const { actual, expected } = (await getTestData())[index];
            expect(
                actual.questions
                    .filter((q) => q.answer_type === 'branching_choice')
                    .map((q) => q.next_question_value)
            ).toEqual(
                expected.questions
                    .filter((q) => q.answer_type === 'branching_choice')
                    .map((q) => q.next_question_value)
            );
        }
    );

    it.each(indexes)(
        'should have the correct form_type (i=%i)',
        async (index) => {
            const { actual, expected } = (await getTestData())[index];
            expect(actual.form_type).toEqual(expected.form_type);
        }
    );
});

import { PrototypeDesignSystemsType, TemplateData } from '../types';

const urlPrefix = 'my-prototype';
const assetPath = '/assets';
const designSystem: PrototypeDesignSystemsType = 'GOV.UK';
const showDemoWarning = true;
let formatHtmlMocked: jest.Mock;
beforeEach(() => {
    formatHtmlMocked = jest.fn(
        (html: string) => `<formatted>${html}</formatted>`
    );
    jest.doMock('../utils', () => ({
        formatHtml: formatHtmlMocked,
    }));
});

afterEach(() => {
    jest.resetAllMocks();
    jest.resetModules();
});

describe('generateBasePage', () => {
    let generateBasePage: (
        assetPath: string,
        designSystem: PrototypeDesignSystemsType
    ) => string;
    let getMultiPageBaseMocked: jest.Mock;
    beforeEach(async () => {
        getMultiPageBaseMocked = jest.fn(() => '<html>base template</html>');
        jest.doMock('../form-constants', () => ({
            getMultiPageBase: getMultiPageBaseMocked,
        }));
        ({ generateBasePage } = await import('../form-generator'));
    });

    it('returns formatted base template', () => {
        const result: string = generateBasePage(assetPath, designSystem);

        expect(getMultiPageBaseMocked).toHaveBeenCalledWith(
            assetPath,
            designSystem
        );
        expect(formatHtmlMocked).toHaveBeenCalledWith(
            '<html>base template</html>'
        );
        expect(result).toBe(
            '<formatted><html>base template</html></formatted>'
        );
    });
});

describe('generateCheckAnswersPage', () => {
    let getCheckAnswersHeaderMocked: jest.Mock;
    let getCheckAnswersFooterMocked: jest.Mock;
    let generateCheckAnswersPage: (
        data: TemplateData,
        urlPrefix: string,
        designSystem: PrototypeDesignSystemsType,
        showDemoWarning: boolean
    ) => string;
    beforeEach(async () => {
        getCheckAnswersHeaderMocked = jest.fn(() => '<header>');
        getCheckAnswersFooterMocked = jest.fn(() => '<footer>');
        jest.doMock('../form-constants', () => ({
            getCheckAnswersFooter: getCheckAnswersFooterMocked,
            getCheckAnswersHeader: getCheckAnswersHeaderMocked,
        }));
        ({ generateCheckAnswersPage } = await import('../form-generator'));
    });

    it('returns formatted check answers page', () => {
        const data = {
            questions: [
                { answer_type: 'text', question_text: 'Q1' },
                { answer_type: 'text', question_text: 'Q2' },
            ],
            title: 'Test Form',
        } as TemplateData;
        const result = generateCheckAnswersPage(
            data,
            urlPrefix,
            designSystem,
            showDemoWarning
        );
        expect(getCheckAnswersHeaderMocked).toHaveBeenCalledWith(
            data.title,
            `/${urlPrefix}/question-${String(data.questions.length)}`,
            designSystem,
            showDemoWarning
        );
        expect(getCheckAnswersFooterMocked).toHaveBeenCalledWith(urlPrefix);
        expect(formatHtmlMocked).toHaveBeenCalled();
        expect(result).toContain('<formatted>');
        expect(result).toContain('<header>');
        expect(result).toContain('<footer>');
        expect(result).toContain('govukSummaryList');
    });

    it('includes the correct number of question rows in the check answers page', () => {
        const data = {
            questions: [
                { answer_type: 'text', question_text: 'Q1' },
                { answer_type: 'text', question_text: 'Q2' },
                { answer_type: 'address', question_text: 'Q3' },
                { answer_type: 'date', question_text: 'Q4' },
            ],
            title: 'Test Form',
        } as TemplateData;
        const result = generateCheckAnswersPage(
            data,
            urlPrefix,
            'GOV.UK',
            false
        );
        expect(result.split('?referrer=check-answers').length - 1).toBe(
            data.questions.length
        );
        for (const [index, question] of data.questions.entries()) {
            expect(result).toContain(
                `href: '/${urlPrefix}/question-${String(index + 1)}?referrer=check-answers'`
            );
            expect(result).toContain(`text: '${question.question_text}'`);
        }
    });

    it('generates correct Nunjucks for a multiple-choice question', () => {
        const data = {
            questions: [
                { answer_type: 'multiple_choice', question_text: 'Q1' },
            ],
            title: 'Test Form',
        } as TemplateData;
        const result = generateCheckAnswersPage(
            data,
            urlPrefix,
            'GOV.UK',
            false
        );
        expect(result).toContain(
            "(data['question-1'] if not data['question-1'] | isArray else data['question-1'] | formatList)"
        );
        expect(result).not.toContain('force-multiline-row');
        expect(result).not.toContain('force-multiline-value');
    });

    it.each([
        {
            answer_type: 'address',
            expectedFields: [
                '-addressLine1',
                '-addressLine2',
                '-addressTown',
                '-addressCounty',
                '-addressPostcode',
            ],
        },
        {
            answer_type: 'bank_details',
            expectedFields: [
                '-nameOnTheAccount',
                '-sortCode',
                '-accountNumber',
                '-rollNumber',
            ],
        },
        {
            answer_type: 'emergency_contact_details',
            expectedFields: [
                '-fullName',
                '-relationship',
                '-phoneNumber',
                '-alternativePhoneNumber',
            ],
        },
        {
            answer_type: 'passport_information',
            expectedFields: [
                '-passportNumber',
                '-countryOfIssue',
                '-nationality',
                '-issueDate',
                '-expiryDate',
            ],
        },
    ])(
        'generates correct Nunjucks for a $answer_type question',
        ({ answer_type, expectedFields }) => {
            const data = {
                questions: [{ answer_type, question_text: 'Q1' }],
                title: 'Test Form',
            } as TemplateData;
            const result = generateCheckAnswersPage(
                data,
                urlPrefix,
                'GOV.UK',
                false
            );
            for (const field of expectedFields) {
                expect(result).toContain(field);
            }
            expect(result).toContain('force-multiline-row');
            expect(result).toContain('force-multiline-value');
        }
    );

    it('generates correct Nunjucks for date and date of birth questions', () => {
        const data = {
            questions: [
                {
                    answer_type: 'date',
                    question_text: 'Q1',
                },
                {
                    answer_type: 'date_of_birth',
                    question_text: 'Q2',
                },
            ],
            title: 'Test Form',
        } as TemplateData;
        const result = generateCheckAnswersPage(
            data,
            urlPrefix,
            'GOV.UK',
            false
        );
        expect(result.match(/data \| isoDateFromDateInput/g)?.length).toBe(2);
        expect(result).toContain('isoDateFromDateInput("question-1")');
        expect(result).toContain('isoDateFromDateInput("question-2")');
        expect(result).not.toContain('force-multiline-row');
        expect(result).not.toContain('force-multiline-value');
    });

    it('generates correct Nunjucks for gbp_currency_amount and all other questions', () => {
        const data = {
            questions: [
                {
                    answer_type: 'gbp_currency_amount',
                    question_text: 'Q1',
                },
                {
                    answer_type: 'text',
                    question_text: 'Q2',
                },
                {
                    answer_type: 'email',
                    question_text: 'Q3',
                },
            ],
            title: 'Test Form',
        } as TemplateData;
        const result = generateCheckAnswersPage(
            data,
            urlPrefix,
            'GOV.UK',
            false
        );
        expect(result.match(/'£' ~ /g)?.length).toBe(1);
        expect(result).toContain(
            "text: data['question-2'] if data['question-2'] else 'Not provided'"
        );
        expect(result).toContain(
            "text: data['question-3'] if data['question-3'] else 'Not provided'"
        );
        expect(result).not.toContain('force-multiline-row');
        expect(result).not.toContain('force-multiline-value');
    });
});

describe('generateConfirmationPage', () => {
    let generateConfirmationPage: (
        templateData: TemplateData,
        designSystem: PrototypeDesignSystemsType,
        showDemoWarning: boolean
    ) => string;
    let getConfirmationPageMocked: jest.Mock;
    beforeEach(async () => {
        getConfirmationPageMocked = jest.fn(
            () => '<html>confirmation page</html>'
        );
        jest.doMock('../form-constants', () => ({
            getConfirmationPage: getConfirmationPageMocked,
        }));
        ({ generateConfirmationPage } = await import('../form-generator'));
    });

    it('returns formatted confirmation page', () => {
        const templateData = {
            questions: [{ question_text: 'Q1' }],
            title: 'Test Form',
        } as TemplateData;
        const result: string = generateConfirmationPage(
            templateData,
            designSystem,
            showDemoWarning
        );

        expect(getConfirmationPageMocked).toHaveBeenCalledWith(
            templateData,
            designSystem,
            showDemoWarning
        );
        expect(formatHtmlMocked).toHaveBeenCalledWith(
            '<html>confirmation page</html>'
        );
        expect(result).toBe(
            '<formatted><html>confirmation page</html></formatted>'
        );
    });
});

describe('generateQuestionPage', () => {
    let generateQuestionPage: (
        data: TemplateData,
        urlPrefix: string,
        questionIndex: number,
        designSystem: PrototypeDesignSystemsType,
        showDemoWarning: boolean
    ) => string;
    let getQuestionHeaderMocked: jest.Mock;
    let getQuestionFooterMocked: jest.Mock;
    beforeEach(async () => {
        getQuestionHeaderMocked = jest.fn(() => '<html>question header</html>');
        getQuestionFooterMocked = jest.fn(() => '<html>question footer</html>');
        jest.doMock('../form-constants', () => ({
            getQuestionFooter: getQuestionFooterMocked,
            getQuestionHeader: getQuestionHeaderMocked,
        }));
        ({ generateQuestionPage } = await import('../form-generator'));
    });

    it('throws an error if questionIndex is out of bounds', () => {
        const data = {
            questions: [{ question_text: 'Q1' }, { question_text: 'Q2' }],
            title: 'Test Form',
        } as TemplateData;

        // Throw error for invalid index
        for (const index of [-12, -1, 3, 99]) {
            expect(() =>
                generateQuestionPage(
                    data,
                    urlPrefix,
                    index,
                    designSystem,
                    showDemoWarning
                )
            ).toThrow(`Invalid question index: ${String(index)}`);
        }

        // Don't throw error for valid index
        for (const index of [0, 1]) {
            expect(() =>
                generateQuestionPage(
                    data,
                    urlPrefix,
                    index,
                    designSystem,
                    showDemoWarning
                )
            ).not.toThrow();
        }
    });

    it('calls getQuestionHeader with correct parameters', () => {
        // Arrange
        const data = {
            questions: [
                { question_text: 'Q1' },
                { question_text: 'Q2' },
                { question_text: 'Q3' },
            ],
            title: 'Test Form',
        } as TemplateData;

        // Act
        for (const [index, question] of data.questions.entries()) {
            generateQuestionPage(
                data,
                urlPrefix,
                index,
                designSystem,
                showDemoWarning
            );
        }

        // Assert
        expect(getQuestionHeaderMocked).toHaveBeenCalledWith({
            backLinkHref: `/${urlPrefix}/start`,
            designSystem,
            formAction: `/${urlPrefix}/question-2`,
            questionTitle: 'Q1',
            showDemoWarning,
            title: data.title,
        });
        expect(getQuestionHeaderMocked).toHaveBeenCalledWith({
            backLinkHref: `/${urlPrefix}/question-1`,
            designSystem,
            formAction: `/${urlPrefix}/question-3`,
            questionTitle: 'Q2',
            showDemoWarning,
            title: data.title,
        });
        expect(getQuestionHeaderMocked).toHaveBeenCalledWith({
            backLinkHref: `/${urlPrefix}/question-2`,
            designSystem,
            formAction: `/${urlPrefix}/check-answers`,
            questionTitle: 'Q3',
            showDemoWarning,
            title: data.title,
        });
        expect(getQuestionHeaderMocked).toHaveBeenCalledTimes(3);
    });

    it.each([
        ['With full stop.', 'With full stop'],
        ['No full stop', 'No full stop'],
        [undefined, ''],
    ])(`format hint text appropriately: '%s'`, (inputHint, outputHint) => {
        const data = {
            questions: [
                {
                    answer_type: 'text',
                    hint_text: inputHint,
                    question_text: 'Q1',
                },
            ],
            title: 'Test Form',
        } as TemplateData;

        const result = generateQuestionPage(
            data,
            urlPrefix,
            0,
            designSystem,
            showDemoWarning
        );

        expect(result.match(/govukInput/g)?.length).toBe(1);
        if (inputHint) {
            expect(result).toContain(`text: '${outputHint}'`);
        } else {
            expect(result).toContain('hint: {\n\n},');
        }
    });

    describe.each([
        {
            answer_type: 'address',
            fieldNames: [
                "name: 'question-1-addressLine1'",
                "name: 'question-1-addressLine2'",
                "name: 'question-1-addressTown'",
                "name: 'question-1-addressCounty'",
                "name: 'question-1-addressPostcode'",
            ],
            inputCount: 5,
            requiredCount: 3,
        },
        {
            answer_type: 'bank_details',
            fieldNames: [
                "name: 'question-1-nameOnTheAccount'",
                "name: 'question-1-sortCode'",
                "name: 'question-1-accountNumber'",
                "name: 'question-1-rollNumber'",
            ],
            inputCount: 4,
            requiredCount: 3,
        },
        {
            answer_type: 'emergency_contact_details',
            fieldNames: [
                "name: 'question-1-fullName'",
                "name: 'question-1-relationship'",
                "name: 'question-1-phoneNumber'",
                "name: 'question-1-alternativePhoneNumber'",
            ],
            inputCount: 4,
            requiredCount: 3,
        },
        {
            answer_type: 'passport_information',
            fieldNames: [
                "name: 'question-1-passportNumber'",
                "name: 'question-1-countryOfIssue'",
                "namePrefix: 'question-1-issueDate'",
                "namePrefix: 'question-1-expiryDate'",
                "name: 'question-1-nationality'",
            ],
            inputCount: 1,
            requiredCount: 5,
        },
    ])(
        'generates the correct question page for multi-field options',
        ({ answer_type, fieldNames, inputCount, requiredCount }) => {
            it.each([requiredCount, undefined])(
                `generates the correct question page for ${answer_type} (requiredCount=%s)`,
                (requiredCount) => {
                    const required = !!requiredCount;
                    const data = {
                        questions: [
                            {
                                answer_type,
                                question_text: 'Q1',
                                required,
                            },
                        ],
                        title: 'Test Form',
                    } as TemplateData;

                    const result = generateQuestionPage(
                        data,
                        urlPrefix,
                        0,
                        designSystem,
                        showDemoWarning
                    );

                    expect(result.match(/govukInput/g)?.length).toBe(
                        inputCount
                    );
                    for (const fieldName of fieldNames) {
                        expect(result).toContain(fieldName);
                    }
                    expect(
                        result.match(/data-required-error-text/g)?.length
                    ).toBe(requiredCount);
                }
            );
        }
    );

    describe.each([
        {
            answer_type: 'country',
            label: 'Choose country',
            option: 'United Kingdom',
        },
        {
            answer_type: 'nationality',
            label: 'Choose nationality',
            option: 'British',
        },
    ])(
        'generates the correct question page for hardcoded select options',
        ({ answer_type, label, option }) => {
            it.each([true, false])(
                `generates the correct question page for ${answer_type} (required=%s)`,
                (required) => {
                    const data = {
                        questions: [
                            {
                                answer_type,
                                question_text: 'Q1',
                                required,
                            },
                        ],
                        title: 'Test Form',
                    } as TemplateData;

                    const result = generateQuestionPage(
                        data,
                        urlPrefix,
                        0,
                        designSystem,
                        showDemoWarning
                    );

                    expect(result.match(/govukSelect/g)?.length).toBe(1);
                    expect(result).toContain(label);
                    expect(result).toContain(option);
                    expect(result.includes('data-required-error-text')).toBe(
                        required
                    );
                }
            );
        }
    );

    describe.each([
        {
            answer_type: 'date',
            attributes: {},
        },
        {
            answer_type: 'date_of_birth',
            attributes: {},
            autocomplete: 'bday-',
        },
        {
            answer_type: 'date_of_birth',
            attributes: {
                date_of_birth_maximum_age: 100,
                date_of_birth_minimum_age: 18,
            },
            autocomplete: 'bday-',
        },
    ])(
        'generates the correct question page for date inputs',
        ({ answer_type, attributes, autocomplete }) => {
            it.each([true, false])(
                `generates the correct question page for ${answer_type} (required=%s)`,
                (required) => {
                    const data = {
                        questions: [
                            {
                                answer_type,
                                question_text: 'Q1',
                                required,
                                ...attributes,
                            },
                        ],
                        title: 'Test Form',
                    } as TemplateData;

                    const result = generateQuestionPage(
                        data,
                        urlPrefix,
                        0,
                        designSystem,
                        showDemoWarning
                    );

                    expect(result.match(/govukDateInput/g)?.length).toBe(1);
                    expect(result).toContain('For example, 31 3 2016');
                    if (autocomplete === undefined) {
                        expect(result).not.toContain('autocomplete');
                    } else {
                        expect(result).toContain(
                            `autocomplete: '${autocomplete}`
                        );
                    }
                    expect(
                        result.includes('data-date-of-birth-error-text')
                    ).toBe(answer_type === 'date_of_birth');
                    expect(result.includes('data-required-error-text')).toBe(
                        required
                    );
                    for (const [key, value] of Object.entries(attributes)) {
                        expect(result).toContain(
                            `'data-${key.replace(/_/g, '-')}': '${String(value)}'`
                        );
                    }
                }
            );
        }
    );

    describe.each([
        {
            answer_type: 'email',
            autocomplete: 'email',
            type: 'email',
            validationAttribute: 'data-email-error-text',
        },
        {
            answer_type: 'gbp_currency_amount',
            validationAttribute: 'data-gbp-currency-amount-error-text',
        },
        { answer_type: 'name', autocomplete: 'name' },
        {
            answer_type: 'national_insurance_number',
            validationAttribute: 'data-national-insurance-number-error-text',
        },
        {
            answer_type: 'phone_number',
            autocomplete: 'tel',
            type: 'tel',
            validationAttribute: 'data-phone-number-error-text',
        },
        {
            answer_type: 'tax_code',
            validationAttribute: 'data-tax-code-error-text',
        },
        { answer_type: 'text' },
        {
            answer_type: 'vat_registration_number',
            validationAttribute: 'data-vat-registration-number-error-text',
        },
    ])(
        'generates the correct question page for text inputs',
        ({ answer_type, autocomplete, type, validationAttribute }) => {
            it.each([true, false])(
                `generates the correct question page for ${answer_type} (required=%s)`,
                (required) => {
                    const data = {
                        questions: [
                            {
                                answer_type,
                                question_text: 'Q1',
                                required,
                            },
                        ],
                        title: 'Test Form',
                    } as TemplateData;

                    const result = generateQuestionPage(
                        data,
                        urlPrefix,
                        0,
                        designSystem,
                        showDemoWarning
                    );

                    expect(result.match(/govukInput/g)?.length).toBe(1);
                    if (autocomplete === undefined) {
                        expect(result).not.toContain('autocomplete');
                    } else {
                        expect(result).toContain(
                            `autocomplete: '${autocomplete}'`
                        );
                    }
                    if (type === undefined) {
                        expect(result).not.toContain('type');
                    } else {
                        expect(result).toContain(`type: '${type}'`);
                    }
                    if (validationAttribute) {
                        expect(result.includes(validationAttribute)).toBe(true);
                    }
                    expect(result.includes('data-required-error-text')).toBe(
                        required
                    );
                }
            );
        }
    );

    it.each([true, false])(
        `generates the correct question page for file upload (required=%s)`,
        (required) => {
            const data = {
                questions: [
                    {
                        answer_type: 'file_upload',
                        question_text: 'Q1',
                        required,
                    },
                ],
                title: 'Test Form',
            } as TemplateData;

            const result = generateQuestionPage(
                data,
                urlPrefix,
                0,
                designSystem,
                showDemoWarning
            );

            expect(result.match(/govukFileUpload/g)?.length).toBe(1);
            expect(result.includes('data-required-error-text')).toBe(required);
        }
    );

    describe.each([
        {
            answer_type: 'multiple_choice',
            fieldName: 'govukCheckboxes',
        },
        {
            answer_type: 'single_choice',
            fieldName: 'govukRadios',
        },
    ])(
        'generates the correct question page for choice inputs',
        ({ answer_type, fieldName }) => {
            it.each([true, false])(
                `generates the correct question page for ${answer_type} (required=%s)`,
                (required) => {
                    const options = ['Option 1', 'Option 2', 'Option 3'];
                    const data = {
                        questions: [
                            {
                                answer_type,
                                options,
                                question_text: 'Q1',
                                required,
                            },
                        ],
                        title: 'Test Form',
                    } as TemplateData;

                    const result = generateQuestionPage(
                        data,
                        urlPrefix,
                        0,
                        designSystem,
                        showDemoWarning
                    );

                    expect(
                        RegExp(new RegExp(fieldName, 'g')).exec(result)?.length
                    ).toBe(1);
                    for (const option of options) {
                        expect(result.split(option).length - 1).toBe(3);
                    }
                    expect(result.includes('data-required-error-text')).toBe(
                        required
                    );
                }
            );
        }
    );

    it.each([true, false])(
        `generates the correct question page for text area (required=%s)`,
        (required) => {
            const data = {
                questions: [
                    {
                        answer_type: 'text_area',
                        question_text: 'Q1',
                        required,
                    },
                ],
                title: 'Test Form',
            } as TemplateData;

            const result = generateQuestionPage(
                data,
                urlPrefix,
                0,
                designSystem,
                showDemoWarning
            );

            expect(result.match(/govukTextarea/g)?.length).toBe(1);
            expect(result.includes('data-required-error-text')).toBe(required);
        }
    );
});

describe('generateStartPage', () => {
    let generateStartPage: (
        templateData: TemplateData,
        urlPrefix: string,
        designSystem: PrototypeDesignSystemsType,
        showDemoWarning: boolean
    ) => string;
    let getStartPageMocked: jest.Mock;
    beforeEach(async () => {
        getStartPageMocked = jest.fn(() => '<html>start page</html>');
        jest.doMock('../form-constants', () => ({
            getStartPage: getStartPageMocked,
        }));
        ({ generateStartPage } = await import('../form-generator'));
    });

    it('returns formatted start page', () => {
        const templateData = {
            questions: [{ question_text: 'Q1' }],
            title: 'Test Form',
        } as TemplateData;
        const result: string = generateStartPage(
            templateData,
            urlPrefix,
            designSystem,
            showDemoWarning
        );

        expect(getStartPageMocked).toHaveBeenCalledWith(
            templateData,
            urlPrefix,
            designSystem,
            showDemoWarning
        );
        expect(formatHtmlMocked).toHaveBeenCalledWith(
            '<html>start page</html>'
        );
        expect(result).toBe('<formatted><html>start page</html></formatted>');
    });
});

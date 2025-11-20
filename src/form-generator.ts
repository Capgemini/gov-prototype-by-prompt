import countryData from '../data/country-data.json';
import {
    getCheckAnswersFooter,
    getCheckAnswersHeader,
    getConfirmationPage,
    getMultiPageBase,
    getQuestionFooter,
    getQuestionHeader,
    getStartPage,
} from './form-constants';
import {
    CheckAnswersMacroOptions,
    FieldGeneratorOptions,
    FieldMacroOptions,
    IBranchingOptions,
    PrototypeDesignSystemsType,
    QuestionHeaderOptions,
    TemplateData,
    TemplateField,
} from './types';
import { formatHtml } from './utils';

/**
 * Generate the base HTML for the multi-page form.
 * @param {string} assetPath The path to the assets
 * @param {PrototypeDesignSystemsType} designSystem The design system to use for the prototype
 * @returns {string} The Nunjucks HTML string for the base template.
 */
export function generateBasePage(
    assetPath: string,
    designSystem: PrototypeDesignSystemsType
): string {
    return formatHtml(getMultiPageBase(assetPath, designSystem));
}
/**
 * Generate the check answers page for the multi-page form.
 * @param {TemplateData} data The template data representing the form structure.
 * @param {string} urlPrefix The URL prefix for the prototype, typically the prototype ID.
 * @param {PrototypeDesignSystemsType} designSystem The design system to use for the prototype
 * @param {boolean} showDemoWarning Whether to warn the user that this is a demo of a service
 * @returns {string} The Nunjucks HTML string for the check answers page.
 */
export function generateCheckAnswersPage(
    data: TemplateData,
    urlPrefix: string,
    designSystem: PrototypeDesignSystemsType,
    showDemoWarning: boolean
): string {
    const formFields: TemplateField[] = data.questions;
    const macroOptions: CheckAnswersMacroOptions = { rows: [] };
    for (let i = 0; i < formFields.length; i++) {
        let data;
        const indexPlusOne = String(i + 1);
        if (formFields[i].answer_type === 'multiple_choice') {
            data = `'Not provided' if not data['question-${indexPlusOne}'] else (data['question-${indexPlusOne}'] if not data['question-${indexPlusOne}'] | isArray else data['question-${indexPlusOne}'] | formatList)`;
        } else if (formFields[i].answer_type === 'address') {
            const address1Data = `(data['question-${indexPlusOne}-addressLine1'] if data['question-${indexPlusOne}-addressLine1'] else '') ~ ('\\n' if data['question-${indexPlusOne}-addressLine2'])`;
            const address2Data = `(data['question-${indexPlusOne}-addressLine2'] if data['question-${indexPlusOne}-addressLine2'] else '')`;
            const addressTownData = `(data['question-${indexPlusOne}-addressTown'] if data['question-${indexPlusOne}-addressTown'] else '') ~ ('\\n' if data['question-${indexPlusOne}-addressCounty'])`;
            const addressCountyData = `(data['question-${indexPlusOne}-addressCounty'] if data['question-${indexPlusOne}-addressCounty'] else '')`;
            const addressPostcodeData = `(data['question-${indexPlusOne}-addressPostcode'] if data['question-${indexPlusOne}-addressPostcode'] else '')`;
            data = `(${address1Data} ~ ${address2Data} ~ '\\n' ~ ${addressTownData} ~ ${addressCountyData} ~ '\\n' ~ ${addressPostcodeData}) if (${address1Data} or ${address2Data} or ${addressTownData} or ${addressCountyData} or ${addressPostcodeData}) else 'Not provided'`;
        } else if (formFields[i].answer_type === 'bank_details') {
            const nameOnTheAccountData = `(data['question-${indexPlusOne}-nameOnTheAccount'] if data['question-${indexPlusOne}-nameOnTheAccount'] else '')`;
            const sortCodeData = `(data['question-${indexPlusOne}-sortCode'] if data['question-${indexPlusOne}-sortCode'] else '')`;
            const accountNumberData = `(data['question-${indexPlusOne}-accountNumber'] if data['question-${indexPlusOne}-accountNumber'] else '') ~ ('\\n' if data['question-${indexPlusOne}-rollNumber'])`;
            const rollNumberData = `(data['question-${indexPlusOne}-rollNumber'] if data['question-${indexPlusOne}-rollNumber'] else '')`;
            data = `(${nameOnTheAccountData} ~ '\\n' ~  ${sortCodeData} ~ '\\n' ~  ${accountNumberData} ~  ${rollNumberData}) if (${nameOnTheAccountData} or ${sortCodeData} or ${accountNumberData} or ${rollNumberData}) else 'Not provided'`;
        } else if (formFields[i].answer_type === 'emergency_contact_details') {
            const fullNameData = `(data['question-${indexPlusOne}-fullName'] if data['question-${indexPlusOne}-fullName'] else '')`;
            const relationship = `(data['question-${indexPlusOne}-relationship'] if data['question-${indexPlusOne}-relationship'] else '')`;
            const phoneNumberData = `(data['question-${indexPlusOne}-phoneNumber'] if data['question-${indexPlusOne}-phoneNumber'] else '') ~ ('\\n' if data['question-${indexPlusOne}-alternativePhoneNumber'])`;
            const alternativePhoneNumberData = `(data['question-${indexPlusOne}-alternativePhoneNumber'] if data['question-${indexPlusOne}-alternativePhoneNumber'] else '')`;
            data = `(${fullNameData} ~ '\\n' ~  ${relationship} ~ '\\n' ~  ${phoneNumberData} ~  ${alternativePhoneNumberData}) if (${fullNameData} or ${relationship} or ${phoneNumberData} or ${alternativePhoneNumberData}) else 'Not provided'`;
        } else if (formFields[i].answer_type === 'passport_information') {
            const passportNumberData = `(data['question-${indexPlusOne}-passportNumber'] if data['question-${indexPlusOne}-passportNumber'] else '')`;
            const countryOfIssueData = `(data['question-${indexPlusOne}-countryOfIssue'] if data['question-${indexPlusOne}-countryOfIssue'] != 'choose' else '')`;
            const nationalityData = `(data['question-${indexPlusOne}-nationality'] if data['question-${indexPlusOne}-nationality'] != 'choose' else '')`;
            const issueDateData = `('Issued on ' ~ data | isoDateFromDateInput("question-${indexPlusOne}-issueDate") | govukDate if data['question-${indexPlusOne}-issueDate-day'] and data['question-${indexPlusOne}-issueDate-month'] and data['question-${indexPlusOne}-issueDate-year'] else '')`;
            const expiryDateData = `('Expires on ' ~ data | isoDateFromDateInput("question-${indexPlusOne}-expiryDate") | govukDate if data['question-${indexPlusOne}-expiryDate-day'] and data['question-${indexPlusOne}-expiryDate-month'] and data['question-${indexPlusOne}-expiryDate-year'] else '')`;
            data = `(${passportNumberData} ~ '\\n' ~ ${countryOfIssueData} ~ '\\n' ~ ${issueDateData} ~ '\\n' ~ ${expiryDateData} ~ '\\n' ~ ${nationalityData}) if (${passportNumberData} or ${countryOfIssueData} or ${expiryDateData} or ${issueDateData} or ${nationalityData} ) else 'Not provided'`;
        } else if (
            ['date', 'date_of_birth'].includes(formFields[i].answer_type)
        ) {
            data = `data | isoDateFromDateInput("question-${indexPlusOne}") | govukDate if data['question-${indexPlusOne}-day'] and data['question-${indexPlusOne}-month'] and data['question-${indexPlusOne}-year'] else 'Not provided'`;
        } else if (formFields[i].answer_type === 'gbp_currency_amount') {
            data = `'£' ~ data['question-${indexPlusOne}'] if data['question-${indexPlusOne}'] else 'Not provided'`;
        } else {
            data = `data['question-${indexPlusOne}'] if data['question-${indexPlusOne}'] else 'Not provided'`;
        }
        macroOptions.rows.push({
            actions: {
                items: [
                    {
                        href: `/${urlPrefix}/question-${indexPlusOne}?referrer=check-answers`,
                        text: 'Change',
                        visuallyHiddenText: formFields[i].question_text,
                    },
                ],
            },
            classes: data.includes('\\n') ? 'force-multiline-row' : '',
            key: {
                text: formFields[i].question_text,
            },
            value: {
                classes: data.includes('\\n') ? 'force-multiline-value' : '',
                text: data,
            },
        });
    }
    return formatHtml(
        `${getCheckAnswersHeader(
            data.title,
            `/${urlPrefix}/question-${String(data.questions.length)}`,
            designSystem,
            showDemoWarning
        )}\n{{ govukSummaryList(${objectToJSFormat(macroOptions)}) }}\n${getCheckAnswersFooter(urlPrefix)}`
    );
}

/**
 * Generate the confirmation page for the multi-page form.
 * @param {TemplateData} data The template data representing the form structure.
 * @param {PrototypeDesignSystemsType} designSystem The design system to use for the prototype
 * @param {boolean} showDemoWarning Whether to warn the user that this is a demo of a service
 * @returns {string} The Nunjucks HTML string for the confirmation page.
 */
export function generateConfirmationPage(
    data: TemplateData,
    designSystem: PrototypeDesignSystemsType,
    showDemoWarning: boolean
): string {
    return formatHtml(getConfirmationPage(data, designSystem, showDemoWarning));
}

/**
 * Generate a single question page for the multi-page form.
 * @param {TemplateData} data The template data representing the form structure.
 * @param {string} urlPrefix The URL prefix for the prototype, typically the prototype ID.
 * @param {number} questionIndex The question index to generate, starting from 0.
 * @param {PrototypeDesignSystemsType} designSystem The design system to use for the prototype
 * @param {boolean} showDemoWarning Whether to warn the user that this is a demo of a service
 * @returns {string} The Nunjucks HTML string for the specified question page.
 */
export function generateQuestionPage(
    data: TemplateData,
    urlPrefix: string,
    questionIndex: number,
    designSystem: PrototypeDesignSystemsType,
    showDemoWarning: boolean
): string {
    // Check that the question number is valid
    if (
        !Number.isInteger(questionIndex) ||
        questionIndex < 0 ||
        questionIndex >= data.questions.length
    ) {
        throw new Error(`Invalid question index: ${String(questionIndex)}`);
    }
    const currentQuestion = data.questions[questionIndex];

    let formAction: string;
    if (currentQuestion.next_question_value != null) {
        formAction =
            currentQuestion.next_question_value === -1
                ? `/${urlPrefix}/check-answers`
                : `/${urlPrefix}/question-${String(currentQuestion.next_question_value + 1)}`;
    } else {
        formAction =
            questionIndex === data.questions.length - 1
                ? `/${urlPrefix}/check-answers`
                : `/${urlPrefix}/question-${String(questionIndex + 2)}`;
    }

    const questionHeaderOptions: QuestionHeaderOptions = {
        backLinkHref:
            questionIndex === 0
                ? `/${urlPrefix}/start`
                : `/${urlPrefix}/question-${String(questionIndex)}`,
        designSystem: designSystem,
        formAction: formAction,
        questionTitle: data.questions[questionIndex].question_text,
        showDemoWarning: showDemoWarning,
        title: data.title,
    };
    const fieldGeneratorOptions: FieldGeneratorOptions = {
        fieldItem: data.questions[questionIndex],
        questionNumber: questionIndex + 1,
        questionsAsHeadings: true,
        totalQuestions: data.questions.length,
    };

    return formatHtml(
        `${getQuestionHeader(questionHeaderOptions)}\n${generateField(
            fieldGeneratorOptions
        )}\n${getQuestionFooter()}`
    );
}

/**
 * Generate the start page for the multi-page form.
 * @param {TemplateData} data The template data representing the form structure.
 * @param {string} urlPrefix The URL prefix for the prototype, typically the prototype ID.
 * @param {PrototypeDesignSystemsType} designSystem The design system to use for the prototype
 * @param {boolean} showDemoWarning Whether to warn the user that this is a demo of a service
 * @returns {string} The Nunjucks HTML string for the start page.
 */
export function generateStartPage(
    data: TemplateData,
    urlPrefix: string,
    designSystem: PrototypeDesignSystemsType,
    showDemoWarning: boolean
): string {
    return formatHtml(
        getStartPage(data, urlPrefix, designSystem, showDemoWarning)
    );
}

// Functions to convert an object to JS text for Nunjucks
function formatValue(value: unknown): string {
    if (typeof value === 'string') {
        return value.startsWith("data['") ||
            value.startsWith('data |') ||
            value.startsWith("'Not provided' if not data['") ||
            value.startsWith('((data') ||
            value.startsWith("'£' ~ data['")
            ? value
            : `'${value.replace(/'/g, "\\'")}'`;
    } else if (Array.isArray(value)) {
        return `[${value.map(formatValue).join(', ')}]`;
    } else if (typeof value === 'object' && value !== null) {
        return objectToJSFormat(value);
    } else {
        return String(value);
    }
}

/**
 * Generate a form field based on the provided field item and field number.
 * @param {FieldGeneratorOptions} opts Options for generating the field
 * @param {TemplateField} opts.fieldItem The field item from the JSON template
 * @param {number} opts.questionNumber The question number in the form
 * @param {boolean} opts.questionsAsHeadings Whether to treat question titles as headings
 * @param {number} [opts.totalQuestions] The total number of questions in the form (optional)
 * @returns {string} The Nunjucks macro string for the field
 */
function generateField({
    fieldItem,
    questionNumber,
    questionsAsHeadings,
    totalQuestions,
}: FieldGeneratorOptions): string {
    const questionTextSize = questionsAsHeadings ? 'l' : 'm';
    const questionNumberString = String(questionNumber);

    let macroOptions: FieldMacroOptions;
    let items;
    let result;

    // Remove the full stop at the end of the hint text if it exists
    if (fieldItem.hint_text) {
        fieldItem.hint_text = fieldItem.hint_text.replace(/\.$/, '');
    }

    switch (fieldItem.answer_type) {
        case 'address':
            macroOptions = {
                attributes: {},
                legend: {
                    classes: `govuk-fieldset__legend--l`,
                    isPageHeading: true,
                    text: fieldItem.question_text,
                },
            };
            result = `{% call govukFieldset(${objectToJSFormat(macroOptions)})%}`;

            macroOptions = {
                attributes: {},
                autocomplete: 'address-line1',
                id: 'address-line-1',
                label: {
                    text: 'Address Line 1',
                },
                name: `question-${questionNumberString}-addressLine1`,
                value: `data['question-${questionNumberString}-addressLine1']`,
            };
            if (fieldItem.required) {
                macroOptions.attributes['data-required-error-text'] =
                    'Enter address line 1, typically the building and street';
            }
            result += `\n{{ govukInput(${objectToJSFormat(macroOptions)}) }}`;

            macroOptions = {
                attributes: {},
                autocomplete: 'address-line2',
                id: 'address-line-2',
                label: {
                    text: 'Address line 2 (optional)',
                },
                name: `question-${questionNumberString}-addressLine2`,
                value: `data['question-${questionNumberString}-addressLine2']`,
            };
            result += `\n{{ govukInput(${objectToJSFormat(macroOptions)}) }}`;

            macroOptions = {
                attributes: {},
                autocomplete: 'address-level2',
                classes: 'govuk-!-width-two-thirds',
                id: 'address-town',
                label: {
                    text: 'Town or city',
                },
                name: `question-${questionNumberString}-addressTown`,
                value: `data['question-${questionNumberString}-addressTown']`,
            };
            if (fieldItem.required) {
                macroOptions.attributes['data-required-error-text'] =
                    'Enter a town or city';
            }
            result += `\n{{ govukInput(${objectToJSFormat(macroOptions)}) }}`;

            macroOptions = {
                attributes: {},
                autocomplete: 'address-level1',
                classes: 'govuk-!-width-two-thirds',
                id: 'address-county',
                label: {
                    text: 'County (optional)',
                },
                name: `question-${questionNumberString}-addressCounty`,
                value: `data['question-${questionNumberString}-addressCounty']`,
            };
            result += `\n{{ govukInput(${objectToJSFormat(macroOptions)}) }}`;

            macroOptions = {
                attributes: {
                    'data-proper-postcode-error-text': `Enter a full UK postcode`,
                },
                autocomplete: 'postal-code',
                classes: 'govuk-input--width-10',
                id: 'address-postcode',
                label: {
                    text: 'Postcode',
                },
                name: `question-${questionNumberString}-addressPostcode`,
                value: `data['question-${questionNumberString}-addressPostcode']`,
            };
            if (fieldItem.required) {
                macroOptions.attributes['data-required-error-text'] =
                    'Enter a postcode';
            }
            result += `\n{{ govukInput(${objectToJSFormat(macroOptions)}) }}\n{% endcall %}`;
            break;
        case 'bank_details':
            result = `<h1 class="govuk-heading-l">${fieldItem.question_text}</h1>`;

            macroOptions = {
                attributes: {},
                autocomplete: 'name',
                id: 'name-on-the-account',
                label: {
                    text: 'Name on the account',
                },
                name: `question-${questionNumberString}-nameOnTheAccount`,
                value: `data['question-${questionNumberString}-nameOnTheAccount']`,
            };
            if (fieldItem.required) {
                macroOptions.attributes['data-required-error-text'] =
                    'Enter the name on the account';
            }
            result += `\n{{ govukInput(${objectToJSFormat(macroOptions)}) }}`;

            macroOptions = {
                attributes: {
                    'invalid-sort-code': `Enter a valid sort code like 309430`,
                },
                classes:
                    'govuk-input--width-5 govuk-input--extra-letter-spacing',
                hint: {
                    text: 'Must be 6 digits long',
                },
                id: 'sort-code',
                inputmode: 'numeric',
                label: {
                    text: 'Sort code',
                },
                name: `question-${questionNumberString}-sortCode`,
                spellcheck: false,
                value: `data['question-${questionNumberString}-sortCode']`,
            };
            if (fieldItem.required) {
                macroOptions.attributes['data-required-error-text'] =
                    'Enter a sort code';
            }
            result += `\n{{ govukInput(${objectToJSFormat(macroOptions)}) }}`;

            macroOptions = {
                attributes: {
                    'invalid-account-number': `Enter a valid account number like 00733445`,
                    'invalid-account-number-length': `Account number must be between 6 and 8 digits`,
                },
                classes:
                    'govuk-input--width-10 govuk-input--extra-letter-spacing',
                hint: {
                    text: 'Must be between 6 and 8 digits long',
                },
                id: 'account-number',
                inputmode: 'numeric',
                label: {
                    text: 'Account number',
                },
                name: `question-${questionNumberString}-accountNumber`,
                spellcheck: false,
                value: `data['question-${questionNumberString}-accountNumber']`,
            };
            if (fieldItem.required) {
                macroOptions.attributes['data-required-error-text'] =
                    'Enter an account number';
            }
            result += `\n{{ govukInput(${objectToJSFormat(macroOptions)}) }}`;

            macroOptions = {
                attributes: {
                    'invalid-characters-building-society-number': `Building society roll number must only include letters a to z, numbers, hyphens, spaces, forward slashes and full stops`,
                    'invalid-length-building-society-number': `Building society roll number must be between 1 and 18 characters`,
                },
                classes:
                    'govuk-input--width-10 govuk-input--extra-letter-spacing',
                hint: {
                    text: 'You can find it on your card, statement or passbook',
                },
                id: 'roll-number',
                inputmode: 'numeric',
                label: {
                    text: 'Building society roll number (if you have one)',
                },
                name: `question-${questionNumberString}-rollNumber`,
                spellcheck: false,
                value: `data['question-${questionNumberString}-rollNumber']`,
            };
            result += `\n{{ govukInput(${objectToJSFormat(macroOptions)}) }}`;
            break;
        case 'branching_choice':
            items = fieldItem.options_branching?.map(
                (option: IBranchingOptions) => {
                    return {
                        checked: `data['question-${questionNumberString}'] == '${option.text_value.replace(/'/g, "\\'")}'`,
                        text: option.text_value,
                        value: option.text_value,
                    };
                }
            );
            macroOptions = {
                attributes: {},
                fieldset: {
                    legend: {
                        classes: `govuk-fieldset__legend--${questionTextSize}`,
                        isPageHeading: questionsAsHeadings,
                        text: fieldItem.question_text,
                    },
                },
                hint: {
                    text: fieldItem.hint_text,
                },
                items: items,
                name: `question-${questionNumberString}`,
            };
            if (fieldItem.required) {
                macroOptions.attributes['data-required-error-text'] =
                    fieldItem.required_error_text ??
                    `Answer this question to continue`;
            }
            result = `{{ govukRadios(${objectToJSFormat(macroOptions)}) }}`;
            break;
        case 'country':
        case 'nationality':
            macroOptions = {
                attributes: {},
                hint: {
                    text: fieldItem.hint_text,
                },
                items:
                    fieldItem.answer_type === 'country'
                        ? getItems(countryData.countries, 'Choose country')
                        : getItems(
                              countryData.nationalities,
                              'Choose nationality'
                          ),
                label: {
                    classes: `govuk-label--${questionTextSize}`,
                    isPageHeading: questionsAsHeadings,
                    text: fieldItem.question_text,
                },
                name: `question-${questionNumberString}`,
                value: `data['question-${questionNumberString}']`,
            };
            if (fieldItem.required) {
                macroOptions.attributes['data-required-error-text'] =
                    fieldItem.required_error_text ??
                    `Answer this question to continue`;
            }
            result = `{{ govukSelect(${objectToJSFormat(macroOptions)}) }}`;
            break;
        case 'date':
        case 'date_of_birth':
            macroOptions = {
                attributes: {
                    'data-invalid-error-text': `Enter a valid date${fieldItem.required ? '' : ' or leave blank'}`,
                },
                fieldset: {
                    legend: {
                        classes: `govuk-fieldset__legend--${questionTextSize}`,
                        isPageHeading: questionsAsHeadings,
                        text: fieldItem.question_text,
                    },
                },
                hint: {
                    text: 'For example, 31 3 2016', // hardcoded hint text
                },
                id: `question-${questionNumberString}`,
                items: [
                    {
                        autocomplete:
                            fieldItem.answer_type === 'date_of_birth'
                                ? 'bday-day'
                                : undefined,
                        classes:
                            'govuk-date-input__input--day govuk-input--width-2',
                        name: 'day',
                        value: `data['question-${questionNumberString}-day']`,
                    },
                    {
                        autocomplete:
                            fieldItem.answer_type === 'date_of_birth'
                                ? 'bday-month'
                                : undefined,
                        classes:
                            ' govuk-date-input__input--month govuk-input--width-2',
                        name: 'month',
                        value: `data['question-${questionNumberString}-month']`,
                    },
                    {
                        autocomplete:
                            fieldItem.answer_type === 'date_of_birth'
                                ? 'bday-year'
                                : undefined,
                        classes:
                            'govuk-date-input__input--year govuk-input--width-4',
                        name: 'year',
                        value: `data['question-${questionNumberString}-year']`,
                    },
                ],
                namePrefix: `question-${questionNumberString}`,
            };
            if (fieldItem.required) {
                macroOptions.attributes['data-required-error-text'] =
                    fieldItem.required_error_text ??
                    `Answer this question to continue`;
            }
            if (fieldItem.answer_type === 'date_of_birth') {
                macroOptions.attributes['data-date-of-birth-error-text'] =
                    'The date of birth must be in the past';
                if (fieldItem.date_of_birth_minimum_age) {
                    macroOptions.attributes['data-date-of-birth-minimum-age'] =
                        String(fieldItem.date_of_birth_minimum_age);
                    macroOptions.attributes[
                        'data-date-of-birth-minimum-age-error-text'
                    ] =
                        `You must be at least ${String(fieldItem.date_of_birth_minimum_age)} year${fieldItem.date_of_birth_minimum_age === 1 ? '' : 's'} old`;
                }
                if (fieldItem.date_of_birth_maximum_age) {
                    macroOptions.attributes['data-date-of-birth-maximum-age'] =
                        String(fieldItem.date_of_birth_maximum_age);
                    macroOptions.attributes[
                        'data-date-of-birth-maximum-age-error-text'
                    ] =
                        `You must be no more than ${String(fieldItem.date_of_birth_maximum_age)} year${fieldItem.date_of_birth_maximum_age === 1 ? '' : 's'} old`;
                }
            }
            result = `{{ govukDateInput(${objectToJSFormat(macroOptions)}) }}`;
            break;
        case 'email':
        case 'gbp_currency_amount':
        case 'name':
        case 'national_insurance_number':
        case 'phone_number':
        case 'tax_code':
        case 'text':
        case 'vat_registration_number':
            macroOptions = {
                attributes: {},
                autocomplete:
                    fieldItem.answer_type == 'name'
                        ? fieldItem.answer_type
                        : undefined,
                classes: '',
                hint: {
                    text: fieldItem.hint_text,
                },
                label: {
                    classes: `govuk-label--${questionTextSize}`,
                    isPageHeading: questionsAsHeadings,
                    text: fieldItem.question_text,
                },
                name: `question-${questionNumberString}`,
                prefix: {},
                spellcheck: fieldItem.answer_type == 'text',
                type: undefined,
                value: `data['question-${questionNumberString}']`,
            };
            if (fieldItem.required) {
                macroOptions.attributes['data-required-error-text'] =
                    fieldItem.required_error_text ??
                    `Answer this question to continue`;
            }
            if (fieldItem.answer_type == 'email') {
                macroOptions.type = 'email';
                macroOptions.autocomplete = 'email';
                macroOptions.attributes['data-email-error-text'] =
                    'Enter an email address in the correct format, like name@example.com';
            } else if (fieldItem.answer_type == 'gbp_currency_amount') {
                macroOptions.prefix = {
                    text: '£',
                };
                macroOptions.classes = 'govuk-input--width-10';
                macroOptions.attributes['data-gbp-currency-amount-error-text'] =
                    'Enter a monetary amount in pounds, like 12.34 or 1000';
            } else if (fieldItem.answer_type == 'national_insurance_number') {
                macroOptions.attributes[
                    'data-national-insurance-number-error-text'
                ] =
                    'Enter a National Insurance number that is 2 letters, 6 numbers, then A, B, C or D, like QQ 12 34 56 C';
            } else if (fieldItem.answer_type == 'phone_number') {
                macroOptions.type = 'tel';
                macroOptions.autocomplete = 'tel';
                macroOptions.attributes['data-phone-number-error-text'] =
                    'Enter a phone number, like 01632 960 001, 07700 900 982 or +44 808 157 0192';
            } else if (fieldItem.answer_type == 'tax_code') {
                macroOptions.classes = 'govuk-input--width-10';
                macroOptions.attributes['data-tax-code-error-text'] =
                    'Enter a tax code in the correct format, for example 1117L, K497, S1117L or SK497';
            } else if (fieldItem.answer_type == 'vat_registration_number') {
                macroOptions.classes = 'govuk-input--width-10';
                macroOptions.attributes[
                    'data-vat-registration-number-error-text'
                ] =
                    'Enter a VAT registration number in the correct format, like GB123456789 or 123456789';
            }
            result = `{{ govukInput(${objectToJSFormat(macroOptions)}) }}`;
            break;
        case 'emergency_contact_details':
            //  • Full name (required) – free text
            result = `<h1 class="govuk-heading-l">${fieldItem.question_text}</h1>`;

            macroOptions = {
                attributes: {
                    'invalid-name': 'Enter a valid name',
                },
                autocomplete: 'name',
                id: 'full-name',
                label: {
                    text: 'Full name',
                },
                name: `question-${questionNumberString}-fullName`,
                value: `data['question-${questionNumberString}-fullName']`,
            };
            if (fieldItem.required) {
                macroOptions.attributes['data-required-error-text'] =
                    'Enter a name';
            }
            result += `\n{{ govukInput(${objectToJSFormat(macroOptions)}) }}`;

            // 	• Relationship (required) – free text or dropdown (Parent, Spouse, Friend, etc.)
            macroOptions = {
                attributes: {},
                id: 'relationship',
                label: {
                    text: 'Relationship',
                },
                name: `question-${questionNumberString}-relationship`,
                value: `data['question-${questionNumberString}-relationship']`,
            };
            if (fieldItem.required) {
                macroOptions.attributes['data-required-error-text'] =
                    'Enter the relationship of your contact to you';
            }
            result += `\n{{ govukInput(${objectToJSFormat(macroOptions)}) }}`;

            // 	• Phone number (required) – same validation as above

            macroOptions = {
                attributes: {
                    'data-phone-number-error-text':
                        'Enter a phone number, like 01632 960 001, 07700 900 982 or +44 808 157 0192',
                },
                autocomplete: 'tel',
                id: 'phoneNumber',
                label: {
                    text: 'Phone number ',
                },
                name: `question-${questionNumberString}-phoneNumber`,
                type: 'tel',
                value: `data['question-${questionNumberString}-phoneNumber']`,
            };
            if (fieldItem.required) {
                macroOptions.attributes['data-required-error-text'] =
                    'Enter a phone number';
            }
            result += `\n{{ govukInput(${objectToJSFormat(macroOptions)}) }}`;

            // Alternative phone number (optional) – optional fallback
            macroOptions = {
                attributes: {
                    'data-phone-number-error-text':
                        'Enter a phone number, like 01632 960 001, 07700 900 982 or +44 808 157 0192',
                },
                autocomplete: 'tel',
                id: 'alternativePhoneNumber',
                label: {
                    text: 'Alternative phone number ',
                },
                name: `question-${questionNumberString}-alternativePhoneNumber`,
                type: 'tel',
                value: `data['question-${questionNumberString}-alternativePhoneNumber']`,
            };
            result += `\n{{ govukInput(${objectToJSFormat(macroOptions)}) }}`;
            break;
        case 'file_upload':
            macroOptions = {
                attributes: {},
                hint: {
                    text: fieldItem.hint_text,
                },
                javascript: true,
                label: {
                    classes: `govuk-label--${questionTextSize}`,
                    isPageHeading: questionsAsHeadings,
                    text: fieldItem.question_text,
                },
                name: `question-${questionNumberString}`,
            };
            if (fieldItem.required) {
                macroOptions.attributes['data-required-error-text'] =
                    fieldItem.required_error_text ??
                    `Answer this question to continue`;
            }
            result = `{{ govukFileUpload(${objectToJSFormat(macroOptions)}) }}`;
            break;
        case 'multiple_choice':
            items = fieldItem.options?.map((option: string) => {
                return {
                    checked: `data['question-${questionNumberString}'] | includes('${option.replace(/'/g, "\\'")}')`,
                    text: option,
                    value: option,
                };
            });
            macroOptions = {
                attributes: {},
                fieldset: {
                    legend: {
                        classes: `govuk-fieldset__legend--${questionTextSize}`,
                        isPageHeading: questionsAsHeadings,
                        text: fieldItem.question_text,
                    },
                },
                hint: {
                    text: fieldItem.hint_text,
                },
                items: items,
                name: `question-${questionNumberString}`,
            };
            if (fieldItem.required) {
                macroOptions.attributes['data-required-error-text'] =
                    fieldItem.required_error_text ??
                    `Answer this question to continue`;
            }
            result = `{{ govukCheckboxes(${objectToJSFormat(macroOptions)}) }}`;
            break;
        case 'passport_information':
            result = `<h1 class="govuk-heading-l">${fieldItem.question_text}</h1>`;
            // passport number
            macroOptions = {
                attributes: {
                    'invalid-passport-number': `Enter a valid passport number`,
                },
                autocomplete: 'passport-number',
                id: 'passport-number',
                inputmode: 'numeric',
                label: {
                    text: 'Passport Number',
                },
                name: `question-${questionNumberString}-passportNumber`,
                value: `data['question-${questionNumberString}-passportNumber']`,
            };
            if (fieldItem.required) {
                macroOptions.attributes['data-required-error-text'] =
                    'Enter passport number';
            }
            result += `{{ govukInput(${objectToJSFormat(macroOptions)}) }}`;

            // country of issue
            macroOptions = {
                attributes: {},
                items: getItems(countryData.countries, 'Choose country'),
                label: {
                    text: 'Country of issue',
                },
                name: `question-${questionNumberString}-countryOfIssue`,
                value: `data['question-${questionNumberString}-countryOfIssue']`,
            };
            if (fieldItem.required) {
                macroOptions.attributes['data-required-error-text'] =
                    'Select a country';
            }
            result += `{{ govukSelect(${objectToJSFormat(macroOptions)}) }}`;

            // issue date
            macroOptions = {
                attributes: {
                    'data-invalid-error-text': `Enter a valid date${fieldItem.required ? '' : ' or leave blank'}`,
                },
                fieldset: {
                    legend: {
                        text: 'Issue Date',
                    },
                },
                hint: {
                    text: 'For example, 31 3 2016', // hardcoded hint text
                },
                id: `question-${questionNumberString}`,
                items: [
                    {
                        classes:
                            'govuk-date-input__input--day govuk-input--width-2',
                        name: 'day',
                        value: `data['question-${questionNumberString}-issueDate-day']`,
                    },
                    {
                        classes:
                            ' govuk-date-input__input--month govuk-input--width-2',
                        name: 'month',
                        value: `data['question-${questionNumberString}-issueDate-month']`,
                    },
                    {
                        classes:
                            'govuk-date-input__input--year govuk-input--width-4',
                        name: 'year',
                        value: `data['question-${questionNumberString}-issueDate-year']`,
                    },
                ],
                namePrefix: `question-${questionNumberString}-issueDate`,
            };
            if (fieldItem.required) {
                macroOptions.attributes['data-required-error-text'] =
                    'Enter issue date';
            }
            result += `{{ govukDateInput(${objectToJSFormat(macroOptions)}) }}`;

            // expiry date
            macroOptions = {
                attributes: {
                    'data-invalid-error-text': `Enter a valid date${fieldItem.required ? '' : ' or leave blank'}`,
                },
                fieldset: {
                    legend: {
                        text: 'Expiry Date',
                    },
                },
                hint: {
                    text: 'For example, 31 3 2016', // hardcoded hint text
                },
                id: `question-${questionNumberString}`,
                items: [
                    {
                        classes:
                            'govuk-date-input__input--day govuk-input--width-2',
                        name: 'day',
                        value: `data['question-${questionNumberString}-expiryDate-day']`,
                    },
                    {
                        classes:
                            ' govuk-date-input__input--month govuk-input--width-2',
                        name: 'month',
                        value: `data['question-${questionNumberString}-expiryDate-month']`,
                    },
                    {
                        classes:
                            'govuk-date-input__input--year govuk-input--width-4',
                        name: 'year',
                        value: `data['question-${questionNumberString}-expiryDate-year']`,
                    },
                ],
                namePrefix: `question-${questionNumberString}-expiryDate`,
            };
            if (fieldItem.required) {
                macroOptions.attributes['data-required-error-text'] =
                    'Enter expiry date';
            }
            result += `{{ govukDateInput(${objectToJSFormat(macroOptions)}) }}`;

            // nationality
            macroOptions = {
                attributes: {},
                items: getItems(
                    countryData.nationalities,
                    'Choose nationality'
                ),
                label: {
                    text: 'Nationality',
                },
                name: `question-${questionNumberString}-nationality`,
                value: `data['question-${questionNumberString}-nationality']`,
            };

            if (fieldItem.required) {
                macroOptions.attributes['data-required-error-text'] =
                    'Select nationality';
            }
            result += `{{ govukSelect(${objectToJSFormat(macroOptions)}) }}`;
            break;
        case 'single_choice':
            items = fieldItem.options?.map((option: string) => {
                return {
                    checked: `data['question-${questionNumberString}'] == '${option.replace(/'/g, "\\'")}'`,
                    text: option,
                    value: option,
                };
            });
            macroOptions = {
                attributes: {},
                fieldset: {
                    legend: {
                        classes: `govuk-fieldset__legend--${questionTextSize}`,
                        isPageHeading: questionsAsHeadings,
                        text: fieldItem.question_text,
                    },
                },
                hint: {
                    text: fieldItem.hint_text,
                },
                items: items,
                name: `question-${questionNumberString}`,
            };
            if (fieldItem.required) {
                macroOptions.attributes['data-required-error-text'] =
                    fieldItem.required_error_text ??
                    `Answer this question to continue`;
            }
            result = `{{ govukRadios(${objectToJSFormat(macroOptions)}) }}`;
            break;
        case 'text_area':
            macroOptions = {
                attributes: {},
                hint: {
                    text: fieldItem.hint_text,
                },
                label: {
                    classes: `govuk-label--${questionTextSize}`,
                    isPageHeading: questionsAsHeadings,
                    text: fieldItem.question_text,
                },
                name: `question-${questionNumberString}`,
                value: `data['question-${questionNumberString}']`,
            };
            if (fieldItem.required) {
                macroOptions.attributes['data-required-error-text'] =
                    fieldItem.required_error_text ??
                    `Answer this question to continue`;
            }
            result = `{{ govukTextarea(${objectToJSFormat(macroOptions)}) }}`;
            break;
        default:
            return ``;
    }

    return totalQuestions
        ? `<span class="govuk-caption-l">Question ${questionNumberString} of ${String(totalQuestions)}</span>\n${result}`
        : result;
}

/**
 * Get the list of items for a select input.
 * @param {string[]} data The list of items to include in the select input
 * @param {string} chooseText The text to display as the first option
 * @returns {Array} The list of items
 */
function getItems(
    data: string[],
    chooseText: string
): {
    selected?: boolean;
    text: string;
    value: string;
}[] {
    const result = [];
    result.push({ selected: true, text: chooseText, value: 'choose' });
    if (data.length === 0) {
        throw new Error('Data is not available or malformed');
    }
    for (const item of data) {
        result.push({
            text: item,
            value: item,
        });
    }
    return result;
}

function objectToJSFormat(obj: object): string {
    const entries = Object.entries(obj).map(([key, value]) => {
        if (value === undefined) {
            return undefined; // Skip undefined values
        }
        const formattedKey = key.includes('-') ? `'${key}'` : key;
        return `${formattedKey}: ${formatValue(value)}`;
    });
    return `{\n${entries.filter((item) => item !== undefined).join(',\n')}\n}`;
}

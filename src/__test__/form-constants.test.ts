import {
    getCheckAnswersFooter,
    getCheckAnswersHeader,
    getConfirmationPage,
    getMultiPageBase,
    getQuestionFooter,
    getQuestionHeader,
    getStartPage,
} from '../form-constants';
import {
    PrototypeDesignSystemsType,
    QuestionHeaderOptions,
    TemplateData,
} from '../types';

describe('getCheckAnswersFooter', () => {
    it('returns the correct HTML with the given urlPrefix', () => {
        const urlPrefix = 'my-prototype';
        const result = getCheckAnswersFooter(urlPrefix);

        expect(result).toContain(
            `<form action="/${urlPrefix}/confirmation" method="post" novalidate>`
        );
        expect(result).toContain('Now send your answers');
        expect(result).toContain('Accept and send');
        expect(result).toContain('By submitting this form you are confirming');
    });
});

describe('getCheckAnswersHeader', () => {
    const title = 'Test Form';

    it('returns correct header', () => {
        const result = getCheckAnswersHeader(title);
        expect(result).toContain(`Check your answers – ${title}`);
        expect(result).toContain(`serviceTitle = "${title}"`);
    });
});

describe('getConfirmationPage', () => {
    const data = {
        before_you_start: 'before',
        description: 'desc',
        duration: 1,
        form_type: 'application',
        title: 'Test Form',
        what_happens_next: 'You will be contacted soon.',
    } as TemplateData;

    it('returns correct confirmation page', () => {
        const result = getConfirmationPage(data);
        expect(result).toContain(`Application complete – ${data.title}`);
        expect(result).toContain(`serviceTitle = "${data.title}"`);
        expect(result).toContain('What happens next');
        expect(result).toContain('You will be contacted soon.');
    });
});

describe('getMultiPageBase', () => {
    const assetPath = '/assets';
    it.each([
        [true, 'GOV.UK'],
        [false, 'GOV.UK'],
        [true, 'HMRC'],
        [false, 'HMRC'],
    ] as [boolean, PrototypeDesignSystemsType][])(
        'returns correct base template for showDemoWarning=%s and designSystem=%s',
        (showDemoWarning, designSystem) => {
            const result = getMultiPageBase(
                assetPath,
                designSystem,
                showDemoWarning
            );

            expect(result).toContain(`{% extends "govuk/template.njk" %}`);
            expect(result).toContain(`{% set assetPath = '${assetPath}' %}`);
            expect(result).toContain(
                '<link href="{{ assetPath }}/govuk-frontend.min.css" rel="stylesheet">'
            );
            expect(result).toContain('govukHeader');
            if (showDemoWarning) {
                expect(result).toContain('Demo warning');
            } else {
                expect(result).not.toContain('Demo warning');
            }
            if (designSystem === 'HMRC') {
                expect(result).toMatch(/hmrc-frontend-\d+\.\d+\.\d+\.min\.css/);
                expect(result).toContain('hmrcBanner()');
            } else {
                expect(result).not.toMatch(
                    /hmrc-frontend-\d+\.\d+\.\d+\.min\.css/
                );
                expect(result).not.toContain('hmrcBanner()');
            }
        }
    );
});

describe('getQuestionFooter', () => {
    it('returns the correct HTML for the question footer', () => {
        const result = getQuestionFooter();
        expect(result).toContain('govukButton');
        expect(result).toContain('Continue');
        expect(result).toContain('</form>');
        expect(result).toContain('{% endblock %}');
    });
});

describe('getQuestionHeader', () => {
    const baseOptions: QuestionHeaderOptions = {
        detailedExplanation: undefined,
        formAction: '/submit',
        questionNumber: 1,
        questionTitle: 'What is your name?',
        showProgressIndicators: false,
        title: 'Test Form',
        totalQuestions: 5,
    };

    it.each([true, false])(
        'returns correct header for showProgressIndicators=%s',
        (showProgressIndicators) => {
            const result = getQuestionHeader({
                ...baseOptions,
                showProgressIndicators,
            });
            expect(
                result.includes('<span class="govuk-caption-l">Question')
            ).toBe(showProgressIndicators);
        }
    );

    it('returns correct header when detailedExplanation is provided', () => {
        const detailedExplanation = {
            explanation_text: 'This is a detailed explanation.',
            question_title: 'Your name',
        };
        const result = getQuestionHeader({
            ...baseOptions,
            detailedExplanation,
        });
        expect(result).toContain(detailedExplanation.question_title);
        expect(result).toContain(detailedExplanation.explanation_text);
    });
});

describe('getStartPage', () => {
    const data = {
        before_you_start: 'Read this before you start.',
        description: 'This is a test form.',
        duration: 2,
        form_type: 'application',
        title: 'Test Form',
        what_happens_next: 'You will be contacted soon.',
    } as TemplateData;
    const urlPrefix = 'my-prototype';
    it('returns correct start page', () => {
        const result = getStartPage(data, urlPrefix);
        expect(result).toContain(`pageTitle = "${data.title}"`);
        expect(result).toContain(data.description);
        expect(result).toContain(
            'Completing this form takes around 2 minutes.'
        );
        expect(result).toContain(`href: "/${urlPrefix}/question-1"`);
        expect(result).toContain('Before you start');
        expect(result).toContain(data.before_you_start);
    });

    it.each([
        [1, 'around 1 minute'],
        [5, 'around 5 minutes'],
        [15, 'around 15 minutes'],
    ] as [number, string][])(
        'returns start page with correct minutes',
        (duration, instruction) => {
            const result = getStartPage({ ...data, duration }, urlPrefix);
            expect(result).toContain(`pageTitle = "${data.title}"`);
            expect(result).toContain(data.description);
            expect(result).toContain(
                `Completing this form takes ${instruction}.`
            );
            expect(result).toContain(`href: "/${urlPrefix}/question-1"`);
            expect(result).toContain('Before you start');
            expect(result).toContain(data.before_you_start);
        }
    );
});

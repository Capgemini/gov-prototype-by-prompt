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
    const backLinkHref = '/back';

    it.each([
        [true, 'GOV.UK'],
        [false, 'GOV.UK'],
        [true, 'HMRC'],
        [false, 'HMRC'],
    ] as [boolean, PrototypeDesignSystemsType][])(
        'returns correct header for showDemoWarning=%s and designSystem=%s',
        (showDemoWarning, designSystem) => {
            const result = getCheckAnswersHeader(
                title,
                backLinkHref,
                designSystem,
                showDemoWarning
            );
            expect(result).toContain(`Check your answers – ${title}`);
            expect(result).toContain(`serviceTitle = "${title}"`);
            expect(result).toContain(`href: "${backLinkHref}"`);
            if (showDemoWarning) {
                expect(result).toContain('Demo warning');
            } else {
                expect(result).not.toContain('Demo warning');
            }
            if (designSystem === 'HMRC') {
                expect(result).toContain('hmrcBanner');
            } else {
                expect(result).not.toContain('hmrcBanner');
            }
        }
    );
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

    it.each([
        [true, 'GOV.UK'],
        [false, 'GOV.UK'],
        [true, 'HMRC'],
        [false, 'HMRC'],
    ] as [boolean, PrototypeDesignSystemsType][])(
        'returns correct confirmation page for showDemoWarning=%s and designSystem=%s',
        (showDemoWarning, designSystem) => {
            const result = getConfirmationPage(
                data,
                designSystem,
                showDemoWarning
            );
            expect(result).toContain(`Application complete – ${data.title}`);
            expect(result).toContain(`serviceTitle = "${data.title}"`);
            expect(result).toContain('What happens next');
            expect(result).toContain('You will be contacted soon.');
            if (showDemoWarning) {
                expect(result).toContain('Demo warning');
            } else {
                expect(result).not.toContain('Demo warning');
            }
            if (designSystem === 'HMRC') {
                expect(result).toContain('hmrcBanner');
            } else {
                expect(result).not.toContain('hmrcBanner');
            }
        }
    );
});

describe('getMultiPageBase', () => {
    const assetPath = '/assets';
    it.each([['GOV.UK'], ['HMRC']] as [PrototypeDesignSystemsType][])(
        'returns correct base template for designSystem=%s',
        (designSystem) => {
            const result = getMultiPageBase(assetPath, designSystem);

            expect(result).toContain(`{% extends "govuk/template.njk" %}`);
            expect(result).toContain(`{% set assetPath = '${assetPath}' %}`);
            expect(result).toContain(
                '<link href="{{ assetPath }}/govuk-frontend.min.css" rel="stylesheet">'
            );
            expect(result).toContain('govukHeader');
            if (designSystem === 'HMRC') {
                expect(result).toMatch(/hmrc-frontend-\d+\.\d+\.\d+\.min\.css/);
                expect(result).toContain('hmrcBanner');
            } else {
                expect(result).not.toMatch(
                    /hmrc-frontend-\d+\.\d+\.\d+\.min\.css/
                );
                expect(result).not.toContain('hmrcBanner');
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
    const baseOptions = {
        backLinkHref: '/back',
        formAction: '/submit',
        questionTitle: 'What is your name?',
        title: 'Test Form',
    };
    it.each([
        [true, 'GOV.UK'],
        [false, 'GOV.UK'],
        [true, 'HMRC'],
        [false, 'HMRC'],
    ] as [boolean, PrototypeDesignSystemsType][])(
        'returns correct header for showDemoWarning=%s and designSystem=%s',
        (showDemoWarning, designSystem) => {
            const result = getQuestionHeader({
                ...baseOptions,
                designSystem,
                showDemoWarning,
            } as QuestionHeaderOptions);
            expect(result).toContain(
                `pageTitle = "${baseOptions.questionTitle} – ${baseOptions.title}"`
            );
            expect(result).toContain(`serviceTitle = "${baseOptions.title}"`);
            expect(result).toContain(`href: "${baseOptions.backLinkHref}"`);
            expect(result).toContain(`form action="${baseOptions.formAction}"`);
            if (showDemoWarning) {
                expect(result).toContain('Demo warning');
            } else {
                expect(result).not.toContain('Demo warning');
            }
            if (designSystem === 'HMRC') {
                expect(result).toContain('hmrcBanner');
            } else {
                expect(result).not.toContain('hmrcBanner');
            }
        }
    );
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
    it.each([
        [true, 'GOV.UK'],
        [false, 'GOV.UK'],
        [true, 'HMRC'],
        [false, 'HMRC'],
    ] as [boolean, PrototypeDesignSystemsType][])(
        'returns correct start page for showDemoWarning=%s and designSystem=%s',
        (showDemoWarning, designSystem) => {
            const result = getStartPage(
                data,
                urlPrefix,
                designSystem,
                showDemoWarning
            );
            expect(result).toContain(`pageTitle = "${data.title}"`);
            expect(result).toContain(data.description);
            expect(result).toContain(
                'Completing this form takes around 2 minutes.'
            );
            expect(result).toContain(`href: "/${urlPrefix}/question-1"`);
            expect(result).toContain('Before you start');
            expect(result).toContain(data.before_you_start);
            if (showDemoWarning) {
                expect(result).toContain('Demo warning');
            } else {
                expect(result).not.toContain('Demo warning');
            }
            if (designSystem === 'HMRC') {
                expect(result).toContain('hmrcBanner');
            } else {
                expect(result).not.toContain('hmrcBanner');
            }
        }
    );
});

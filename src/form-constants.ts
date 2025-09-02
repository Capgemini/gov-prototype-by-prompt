// Fixed text at the top of the template before the form fields

import {
    PrototypeDesignSystemsType,
    QuestionHeaderOptions,
    TemplateData,
} from './types';
import { getHmrcAssetsVersion } from './utils';

/**
 * Generate the footer text for the check answers page.
 * @param {string} urlPrefix The URL prefix for the prototype, typically the prototype ID
 * @returns {string} The footer HTML text for the check answers page
 */
export function getCheckAnswersFooter(urlPrefix: string): string {
    return [
        `<h2 class="govuk-heading-m">`,
        `  Now send your answers`,
        `</h2>`,
        ``,
        `<p class="govuk-body">`,
        `  By submitting this form you are confirming that, to the best of your knowledge, the details you are providing are correct.`,
        `</p>`,
        ``,
        `<form action="/${urlPrefix}/confirmation" method="post" novalidate>`,
        ``,
        `  {{ govukButton({`,
        `    text: "Accept and send"`,
        `  }) }}`,
        ``,
        `</form>`,
        ``,
        `</div>`,
        `</div>`,
        `{% endblock %}`,
    ].join('\n');
}

/**
 * Generate the header text for the check answers page.
 * @param {string} title The title of the form
 * @param {string} backLinkHref The URL for the back link
 * @param {PrototypeDesignSystemsType} designSystem The design system to use for the prototype
 * @param {boolean} showDemoWarning Whether to warn the user that this is a demo of a service
 * @returns {string} The header HTML text for the check answers page
 */
export function getCheckAnswersHeader(
    title: string,
    backLinkHref: string,
    designSystem: PrototypeDesignSystemsType,
    showDemoWarning: boolean
): string {
    return [
        `{% extends "form-base.njk" %}`,
        `{% set pageTitle = "Check your answers – ${title}" %}`,
        `{% set serviceTitle = "${title}" %}`,
        ``,
        `{% block beforeContent %}`,
        ...(showDemoWarning ? getDemoWarning() : []),
        ...(designSystem === 'HMRC'
            ? [`{{ hmrcBanner({`, `  useTudorCrown: true`, `}) }}`]
            : []),
        `  {{ govukBackLink({`,
        `    text: "Back",`,
        `    href: "${backLinkHref}"`,
        `  }) }}`,
        `{% endblock %}`,
        ``,
        `{% block content %}`,
        `  <div class="govuk-grid-row">`,
        `    <div class="govuk-grid-column-two-thirds-from-desktop">`,
        ``,
        `      <h1 class="govuk-heading-xl">`,
        `        Check your answers`,
        `      </h1>`,
    ].join('\n');
}

/**
 * Generate the confirmation page text after form submission.
 * @param {TemplateData} data The template data containing the form details
 * @param {PrototypeDesignSystemsType} designSystem The design system to use for the prototype
 * @param {boolean} showDemoWarning Whether to warn the user that this is a demo of a service
 * @returns {string} The confirmation page HTML text
 */
export function getConfirmationPage(
    data: TemplateData,
    designSystem: PrototypeDesignSystemsType,
    showDemoWarning: boolean
): string {
    const formType =
        data.form_type.charAt(0).toUpperCase() +
        data.form_type.slice(1).toLowerCase();
    return [
        `{% extends "form-base.njk" %}`,
        `{% set pageTitle = "${formType} complete – ${data.title}" %}`,
        `{% set serviceTitle = "${data.title}" %}`,

        `{% block beforeContent %}`,
        ...(showDemoWarning ? getDemoWarning() : []),
        ...(designSystem === 'HMRC'
            ? [`{{ hmrcBanner({`, `  useTudorCrown: true`, `}) }}`]
            : []),
        `{% endblock %}`,
        ``,
        `{% block content %}`,
        `  <div class="govuk-grid-row">`,
        `    <div class="govuk-grid-column-two-thirds">`,
        ``,
        `      {{ govukPanel({`,
        `        titleText: "${formType} complete"`,
        `      }) }}`,
        ``,
        `      <h2 class="govuk-heading-m">`,
        `        What happens next`,
        `      </h2>`,
        ``,
        `      {{ "${data.what_happens_next.replace(/\n/g, '\\n').replace(/"/g, '\\"')}" | govukMarkdown | safe }}`,
        ``,
        `      <p class="govuk-body">`,
        `        <a href="#">`,
        `          What did you think of this service?`,
        `        </a> (takes 30 seconds)`,
        `      </p>`,
        ``,
        ``,
        `    </div>`,
        `  </div>`,
        `{% endblock %}`,
    ].join('\n');
}

/**
 * Generate the base template for a multi-page form.
 * @param {string} assetPath The path to the assets
 * @param {PrototypeDesignSystemsType} designSystem The design system to use for the prototype
 * @returns {string} The base template HTML text for a multi-page form
 */
export function getMultiPageBase(
    assetPath: string,
    designSystem: PrototypeDesignSystemsType
): string {
    // Get the version of the HMRC frontend assets
    const hmrcVersion = getHmrcAssetsVersion();
    return [
        `{% extends "govuk/template.njk" %}`,
        `{% set govukRebrand = true %}`,
        `{% set assetPath = '${assetPath}' %}`,
        ``,
        `{% from "govuk/components/button/macro.njk" import govukButton %}`,
        `{% from "govuk/components/back-link/macro.njk" import govukBackLink %}`,
        `{% from "govuk/components/header/macro.njk" import govukHeader %}`,
        `{% from "govuk/components/breadcrumbs/macro.njk" import govukBreadcrumbs %}`,
        `{% from "govuk/components/panel/macro.njk" import govukPanel %}`,
        `{% from "govuk/components/date-input/macro.njk" import govukDateInput %}`,
        `{% from "govuk/components/input/macro.njk" import govukInput %}`,
        `{% from "govuk/components/textarea/macro.njk" import govukTextarea %}`,
        `{% from "govuk/components/radios/macro.njk" import govukRadios %}`,
        `{% from "govuk/components/checkboxes/macro.njk" import govukCheckboxes %}`,
        `{% from "govuk/components/summary-list/macro.njk" import govukSummaryList %}`,
        `{% from "govuk/components/service-navigation/macro.njk" import govukServiceNavigation %}`,
        `{% from "govuk/components/file-upload/macro.njk" import govukFileUpload %}`,
        `{% from "govuk/components/phase-banner/macro.njk" import govukPhaseBanner %}`,
        `{% from "govuk/components/select/macro.njk" import govukSelect %}`,
        `{% from "govuk/components/fieldset/macro.njk" import govukFieldset %}`,
        ...(designSystem === 'HMRC'
            ? [
                  `{% from "hmrc/components/banner/macro.njk" import hmrcBanner %}`,
              ]
            : []),
        ``,
        `{% block head %}`,
        `  <link href="{{ assetPath }}/govuk-frontend.min.css" rel="stylesheet">`,
        ...(designSystem === 'HMRC'
            ? [
                  `  <link href="{{ assetPath }}/hmrc-frontend-${hmrcVersion}.min.css" rel="stylesheet">`,
              ]
            : []),
        `  <style>`,
        `    .demo-warning-tag {`,
        `      background-color: #ffdd00;`,
        `      color: #0b0c0c;`,
        `    }`,
        `    @media (min-width: 40.0625em) {`,
        `      .force-multiline-row {`,
        `        white-space: pre-line;`,
        `      }`,
        `    }`,
        `    @media (max-width: 40.0625em) {`,
        `      .force-multiline-value {`,
        `        white-space: pre-line;`,
        `      }`,
        `    }`,
        `  </style>`,
        `{% endblock %}`,
        ``,
        `{% block pageTitle %}`,
        `  {{ pageTitle }} – GOV.UK`,
        `{% endblock %}`,
        ``,
        `{% block header %}`,
        `  {{ govukHeader({`,
        `    classes: "govuk-header--full-width-border",`,
        `    homepageUrl: "https://www.gov.uk"`,
        `  }) }}`,
        `  {% if serviceTitle is defined %}{{ govukServiceNavigation({`,
        `    serviceName: serviceTitle`,
        `  }) }}{% endif %}`,
        `{% endblock %}`,
        ``,
        `{% block bodyEnd %}`,
        `  <script type="module" src="{{ assetPath }}/govuk-frontend.min.js"></script>`,
        ...(designSystem === 'HMRC'
            ? [
                  `  <script type="module" src="{{ assetPath }}/hmrc-frontend-${hmrcVersion}.min.js"></script>`,
              ]
            : []),
        `  <script type="module" src="/assets/form.js"></script>`,
        `  <script type="module">`,
        `    import { initAll } from '{{ assetPath }}/govuk-frontend.min.js'`,
        `    initAll()`,
        `  </script>`,
        `{% endblock %}`,
    ].join('\n');
}

/**
 * Generate the footer text for a template with one question.
 * @returns {string} The footer HTML text for the template
 */
export function getQuestionFooter(): string {
    return [
        `      {{ govukButton({`,
        `        text: "Continue"`,
        `      }) }}`,
        `    </form>`,
        ``,
        `  </div>`,
        `</div>`,
        ``,
        `{% endblock %}`,
    ].join('\n');
}

/**
 * Generate the header text for the template with one question per page.
 * @param {QuestionHeaderOptions} opts Options for the header
 * @param {string} opts.title The title of the form
 * @param {string} opts.questionTitle The current question title
 * @param {string} opts.backLinkHref The URL for the back link
 * @param {string} opts.formAction The form action URL for the multi-page form
 * @param {PrototypeDesignSystemsType} opts.designSystem The design system to use for the prototype
 * @param {boolean} opts.showDemoWarning Whether to warn the user that this is a demo of a service
 * @returns {string} The header HTML text for the template
 */
export function getQuestionHeader({
    backLinkHref,
    designSystem,
    formAction,
    questionTitle,
    showDemoWarning,
    title,
}: QuestionHeaderOptions): string {
    return [
        `{% extends "form-base.njk" %}`,
        `{% set pageTitle = "${questionTitle} – ${title}" %}`,
        `{% set serviceTitle = "${title}" %}`,
        ``,
        `{% block beforeContent %}`,
        ...(showDemoWarning ? getDemoWarning() : []),
        ...(designSystem === 'HMRC'
            ? [`{{ hmrcBanner({`, `  useTudorCrown: true`, `}) }}`]
            : []),
        `  <section aria-label="Back link">`,
        `    {{ govukBackLink({`,
        `      href: "${backLinkHref}",`,
        `      text: "Back"`,
        `    }) }}`,
        `  </section>`,
        `{% endblock %}`,
        ``,
        `{% block content %}`,
        `  <div class="govuk-grid-row">`,
        `    <div class="govuk-grid-column-two-thirds">`,
        `      <form action="${formAction}" method="post" novalidate>`,
        ``,
    ].join('\n');
}

/**
 * Generate the start page HTML text for a multi-page form.
 * @param {TemplateData} data The template data containing the form details
 * @param {string} urlPrefix The URL prefix for the prototype, typically the prototype ID
 * @param {PrototypeDesignSystemsType} designSystem The design system to use for the prototype
 * @param {boolean} showDemoWarning Whether to warn the user that this is a demo of a service
 * @returns {string} The start page HTML text
 */
export function getStartPage(
    data: TemplateData,
    urlPrefix: string,
    designSystem: PrototypeDesignSystemsType,
    showDemoWarning: boolean
): string {
    return [
        `{% extends "form-base.njk" %}`,
        `{% set pageTitle = "${data.title}" %}`,
        ``,
        `{% block beforeContent %}`,
        ...(showDemoWarning ? getDemoWarning() : []),
        ...(designSystem === 'HMRC'
            ? [`{{ hmrcBanner({`, `  useTudorCrown: true`, `}) }}`]
            : []),
        `  {{ govukBreadcrumbs({`,
        `    items: [`,
        `      {`,
        `        text: "Home",`,
        `        href: "#"`,
        `      },`,
        `      {`,
        `        text: "Section",`,
        `        href: "#"`,
        `      },`,
        `      {`,
        `        text: "${data.title}"`,
        `      }`,
        `    ]`,
        `  }) }}`,
        ``,
        `{% endblock %}`,
        ``,
        `{% block content %}`,
        ``,
        `  <div class="govuk-grid-row">`,
        `    <div class="govuk-grid-column-two-thirds">`,
        ``,
        `      <h1 class="govuk-heading-xl">`,
        `        ${data.title}`,
        `      </h1>`,
        ``,
        `      {{ "${data.description.replace(/\n/g, '\\n').replace(/"/g, '\\"')}" | govukMarkdown | safe }}`,
        ``,
        `       <p class="govuk-body">Completing this form takes around ${String(data.duration)} minute${data.duration === 1 ? '' : 's'}.</p>`,
        ``,
        `      <h2 class="govuk-heading-m">`,
        `        Before you start`,
        `      </h2>`,
        ``,
        `      {{ "${data.before_you_start.replace(/\n/g, '\\n').replace(/"/g, '\\"')}" | govukMarkdown | safe }}`,
        ``,
        `      {{ govukButton({`,
        `        text: "Start now",`,
        `        href: "/${urlPrefix}/question-1",`,
        `        isStartButton: true`,
        `      }) }}`,
        ``,
        `    </div>`,
        ``,
        `    <div class="govuk-grid-column-one-third">`,
        ``,
        `      <aside class="govuk-prototype-kit-common-templates-related-items" role="complementary">`,
        `        <h2 class="govuk-heading-m" id="subsection-title">`,
        `          Subsection`,
        `        </h2>`,
        `        <nav role="navigation" aria-labelledby="subsection-title">`,
        `          <ul class="govuk-list govuk-!-font-size-16">`,
        `            <li>`,
        `              <a href="#">`,
        `                Related link`,
        `              </a>`,
        `            </li>`,
        `            <li>`,
        `              <a href="#">`,
        `                Related link`,
        `              </a>`,
        `            </li>`,
        `            <li>`,
        `              <a href="#" class="govuk-!-font-weight-bold">`,
        `                More <span class="govuk-visually-hidden">in Subsection</span>`,
        `              </a>`,
        `            </li>`,
        `          </ul>`,
        `        </nav>`,
        `      </aside>`,
        ``,
        `    </div>`,
        `  </div>`,
        ``,
        `{% endblock %}`,
    ].join('\n');
}

/**
 * Generate the warning text for a demo service.
 * @returns {string[]} The warning text as an array of strings
 */
function getDemoWarning(): string[] {
    return [
        `  <section aria-label="Demo warning">`,
        `    {{ govukPhaseBanner({`,
        `      tag: {`,
        `        text: "Demo",`,
        `        classes: "demo-warning-tag"`,
        `      },`,
        `      text: 'This is a non-functioning prototype of a government service for demonstration purposes only.'`,
        `    }) }}`,
        `  </section>`,
    ];
}

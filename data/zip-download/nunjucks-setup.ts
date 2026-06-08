import path from 'node:path';
import * as nunjucks from 'nunjucks';
import { Express } from 'express';

import {
    arrayOrStringIncludes,
    convertToGovukMarkdown,
    formatList,
    govukDate,
    isArray,
    isoDateFromDateInput,
} from '../../src/filters';

export function setupNunjucksEnvZipDownload(
    app: Express,
    dirname: string
): nunjucks.Environment {
    const nunjucksEnv = nunjucks.configure(
        [
            path.join(dirname, 'views'),
            path.join(dirname, 'node_modules/hmrc-frontend/'),
            path.join(dirname, 'node_modules/govuk-frontend/dist/'),
        ],
        {
            autoescape: true,
            express: app,
            noCache: true,
        }
    );

    nunjucksEnv.addFilter('govukDate', govukDate);
    nunjucksEnv.addFilter('isoDateFromDateInput', isoDateFromDateInput);
    nunjucksEnv.addFilter('govukMarkdown', convertToGovukMarkdown);
    nunjucksEnv.addFilter('formatList', formatList);
    nunjucksEnv.addFilter('includes', arrayOrStringIncludes);
    nunjucksEnv.addFilter('isArray', isArray);

    app.set('view engine', 'njk');

    return nunjucksEnv;
}

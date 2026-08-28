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
} from '../filters';

function setupNunjucksFilters(env: nunjucks.Environment): void {
    env.addFilter('govukDate', govukDate);
    env.addFilter('isoDateFromDateInput', isoDateFromDateInput);
    env.addFilter('govukMarkdown', convertToGovukMarkdown);
    env.addFilter('formatList', formatList);
    env.addFilter('includes', arrayOrStringIncludes);
    env.addFilter('isArray', isArray);
}

export function setupNunjucksEnv(
    app: Express,
    noCache: boolean,
    dirname: string
): nunjucks.Environment {
    const nunjucksEnv = nunjucks.configure(
        [
            path.join(dirname, 'data/prompts/'),
            path.join(dirname, 'node_modules/hmrc-frontend/'),
            path.join(dirname, 'node_modules/govuk-frontend/dist/'),
            path.join(dirname, 'views/'),
        ],
        {
            autoescape: true,
            express: app,
            noCache,
        }
    );

    setupNunjucksFilters(nunjucksEnv);
    app.set('view engine', 'njk');

    return nunjucksEnv;
}

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

    setupNunjucksFilters(nunjucksEnv);
    app.set('view engine', 'njk');

    return nunjucksEnv;
}

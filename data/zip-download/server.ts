import express, { Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import session from 'express-session';
import * as nunjucks from 'nunjucks';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
    arrayOrStringIncludes,
    convertToGovukMarkdown,
    formatList,
    govukDate,
    isArray,
    isoDateFromDateInput,
} from './filters';

// Create the Express application
const app = express();
const PORT = 3000;

app.disable('x-powered-by');

// Parse JSON and URL-encoded bodies
app.use(express.urlencoded());

// Configure Nunjucks with the correct paths
export const nunjucksEnv = nunjucks.configure(
    [
        path.join(__dirname, 'views'),
        path.join(__dirname, 'node_modules/hmrc-frontend/'),
        path.join(__dirname, 'node_modules/govuk-frontend/dist/'),
        path.join(__dirname, 'node_modules/govuk-prototype-kit/lib/nunjucks/'),
    ],
    {
        autoescape: true,
        express: app,
        noCache: true,
    }
);

// Use the GOV.UK rebrand
nunjucksEnv.addGlobal('govukRebrand', true);

// Use the GOV.UK prototype kit filters
nunjucksEnv.addFilter('govukDate', govukDate);
nunjucksEnv.addFilter('isoDateFromDateInput', isoDateFromDateInput);
nunjucksEnv.addFilter('govukMarkdown', convertToGovukMarkdown);
nunjucksEnv.addFilter('formatList', formatList);
nunjucksEnv.addFilter('includes', arrayOrStringIncludes);
nunjucksEnv.addFilter('isArray', isArray);

// Set the view engine to Nunjucks
app.set('view engine', 'njk');

// Serve static files
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Serve HMRC GOV.UK assets where the HMRC CSS expects them
app.use('/assets/govuk', (req: Request, res: Response) => {
    res.redirect(301, `/assets${req.path}`);
});

const limiter = rateLimit({
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
    limit: 100, // Limit each IP to 100 requests per `window` (here, per 5 minutes).
    standardHeaders: true, // add the `RateLimit-*` headers to the response
    windowMs: 5 * 60 * 1000, // 5 minutes
});

// Apply the rate limiting middleware to all requests.
app.use(limiter);

// Extend express-session to include data property
declare module 'express-session' {
    interface SessionData {
        data: { [key: string]: string };
    }
}

// Attach session middleware
// Use a random UUID as the session secret
// This should be replaced with a more secure secret in production
app.use(
    session({
        secret: uuidv4(),
        resave: false,
        saveUninitialized: true,
    })
);

/**
 * Render the prototype page for a specific prototype and page.
 */
app.all(
    '/:form/:page',
    (
        req: Request<
            { form: string; page: string },
            {},
            { [key: string]: any }
        >,
        res: Response
    ) => {
        // Handle data updates with POST requests
        if (req.method === 'POST' && req.body) {
            req.session.data = {
                ...(req.session.data ?? {}),
                ...req.body,
            };
        }

        // Clear the session data if at the completion page
        if (req.params.page === 'confirmation') {
            req.session.data = {};
        }

        // Render the requested page
        const form = req.params.form;
        const page = req.params.page;
        res.render(`${form}/${page}`, {
            data: req.session.data,
        });
    }
);

// Start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(
        `Visit http://localhost:${PORT}/your-prototype/start to test the prototype.`
    );
});

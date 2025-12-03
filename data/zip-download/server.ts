import express, { Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import session from 'express-session';
import path from 'node:path';
import * as nunjucks from 'nunjucks';
import { v4 as uuidv4 } from 'uuid';

import {
    arrayOrStringIncludes,
    convertToGovukMarkdown,
    formatList,
    govukDate,
    isArray,
    isoDateFromDateInput,
} from './filters';
import prototypeJson from './your-prototype.json';

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
    ],
    {
        autoescape: true,
        express: app,
        noCache: true,
    }
);

// Use the GOV.UK rebrand
nunjucksEnv.addGlobal('govukRebrand', true);

// Add the filters
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
        data: Record<string, string> | undefined;
        history: string[] | undefined;
    }
}

// Attach session middleware
// Use a random UUID as the session secret
// This should be replaced with a more secure secret in production
// Also note that in production, secure cookies should be used
app.use(
    session({
        cookie: {
            secure: false,
        },
        resave: false,
        saveUninitialized: true,
        secret: uuidv4(),
    })
);

/**
 * Handle the user submitting an answer to a prototype question.
 */
app.post(
    '/your-prototype/:page/submit',
    (
        req: Request<{ page: string }, {}, Record<string, string>>,
        res: Response
    ) => {
        // Update the data for the form with the request body
        req.session.data = {
            ...req.session.data,
            ...req.body,
        };

        // Validate the question page number
        const page = req.params.page;
        const questions = prototypeJson.questions;
        const questionNumber = Number.parseInt(page.split('-')[1], 10);
        if (
            Number.isNaN(questionNumber) ||
            questionNumber < 1 ||
            questionNumber > questions.length
        ) {
            res.status(404).send('Question not found');
            return;
        }

        // Check if they came from the check answers page
        const sendToCheckAnswers = (req.get('referrer') ?? '').includes(
            'referrer=check-answers'
        );

        // Redirect to the next page
        const question = questions[questionNumber - 1];
        if (question.answer_type === 'branching_choice') {
            // Get the user answer and the matching option, return to the current question if not found
            const userAnswer =
                req.session.data[`question-${String(questionNumber)}`];
            const userAnswerOption = question.options_branching?.find(
                (option: any) => option.text_value === userAnswer
            );
            if (userAnswer === undefined || userAnswerOption === undefined) {
                res.redirect(
                    `/your-prototype/question-${String(questionNumber)}`
                );
                return;
            }

            // Redirect based on the next_question_value of the selected option
            if (userAnswerOption.next_question_value === -1) {
                res.redirect(`/your-prototype/check-answers`);
            } else {
                res.redirect(
                    `/your-prototype/question-${String(
                        userAnswerOption.next_question_value
                    )}`
                );
            }
        } else if (
            sendToCheckAnswers ||
            question.next_question_value === -1 ||
            (question.next_question_value === undefined &&
                questionNumber === questions.length)
        ) {
            // Send to check answers if they came from there, or if this is the last question
            res.redirect(`/your-prototype/check-answers`);
        } else {
            // Send to the next question in sequence
            res.redirect(
                `/your-prototype/question-${String(question.next_question_value ?? questionNumber + 1)}`
            );
        }
    }
);

/**
 * Render the prototype page for a specific prototype and page.
 */
app.all(
    '/your-prototype/:page',
    (req: Request<{ page: string }>, res: Response) => {
        const page = req.params.page;

        // Clear the session data if at the completion page
        if (page === 'confirmation') {
            req.session.history = [];
            req.session.data = {};
        }

        // Validate the page
        const validPages = ['start', 'check-answers', 'confirmation'];
        for (let i = 0; i < prototypeJson.questions.length; i++) {
            validPages.push(`question-${String(i + 1)}`);
        }
        if (!validPages.includes(page)) {
            res.status(404).send('Page not found');
            return;
        }

        // Create the history if it doesn't exist
        req.session.history ??= [];

        // If the user clicked back then remove the last URL, otherwise add the current URL
        // Don't add the confirmation page; we clear it here earlier
        if (req.query.back && req.path === req.session.history.at(-2)) {
            req.session.history.pop();
        } else if (
            page !== 'confirmation' &&
            req.session.history.at(-1) !== req.path
        ) {
            req.session.history.push(req.path);
        }

        // Get the back link
        let backLinkHref: string | undefined;
        if (req.session.history.length >= 2) {
            // Add a get param to the back link URL to indicate navigation source
            const prevUrl = req.session.history.at(-2);
            if (prevUrl) {
                const url = new URL(prevUrl, `${req.protocol}://${req.host}`); // base needed for parsing
                url.searchParams.set('back', 'true');
                backLinkHref = url.pathname + url.search;
            }
        }

        // Render the requested page
        res.render(`your-prototype/${page}`, {
            backLinkHref: backLinkHref,
            data: req.session.data,
        });
    }
);

// Redirect base URLs to the start page
app.all('/', (req: Request, res: Response) => {
    res.redirect('/your-prototype/start');
});
app.all('/your-prototype', (req: Request, res: Response) => {
    res.redirect('/your-prototype/start');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${String(PORT)}`);
    console.log(
        `Visit http://localhost:${String(PORT)}/your-prototype/start to test the prototype.`
    );
});

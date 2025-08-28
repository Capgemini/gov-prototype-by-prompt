import bodyParser from 'body-parser';
import 'dotenv/config';
import express, { Request, Response } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import session from 'express-session';
import helmet from 'helmet';
import moment from 'moment';
import * as nunjucks from 'nunjucks';
import path from 'path';

import { connectToDatabase, disconnectFromDatabase } from './src/database';
import {
    arrayOrStringIncludes,
    convertToGovukMarkdown,
    formatList,
    govukDate,
    isArray,
    isoDateFromDateInput,
} from './src/filters';
import { helpRouter } from './src/routes/help-routes';
import {
    attachRequestData,
    errorHandler,
    verifyUser,
} from './src/routes/middleware';
import { prototypeRouter } from './src/routes/prototype-routes';
import { setupStaticAssets } from './src/routes/static-assets';
import { userRouter } from './src/routes/user-routes';
import { getEnvironmentVariables } from './src/utils';

// Load environment variables once
const envVars = getEnvironmentVariables();

// Connect to MongoDB
async function initializeDatabase() {
    try {
        await connectToDatabase();
        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Failed to initialize database:', error);
        process.exit(1);
    }
}

// Initialize database before starting server
void initializeDatabase();

// Set the moment locale to UK English
moment.locale('en-gb');

// Create the Express application
const app = express();
const PORT = 3001;

// Set security headers using Helmet
const nodeEnv = envVars.NODE_ENV;
app.use(
    helmet({
        contentSecurityPolicy: false,
        referrerPolicy: {
            policy: 'same-origin',
        },
        strictTransportSecurity:
            nodeEnv === 'production'
                ? { includeSubDomains: true, maxAge: 31536000 }
                : false,
    })
);

// Parse JSON and URL-encoded bodies
app.use(express.urlencoded());
app.use(bodyParser.json());

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
setupStaticAssets(app, __dirname);

// Extend express-session to include session properties
declare module 'express-session' {
    interface SessionData {
        currentUserId?: string;
        liveData?: Record<string, Record<string, string>>;
        livePrototypePasswords?: Record<string, string>;
    }
}

// Attach session
app.use(
    session({
        resave: false,
        saveUninitialized: true,
        secret: envVars.SESSION_SECRET,
    })
);

// Attach middleware to add request data to Nunjucks
app.use(attachRequestData);

// Apply rate limiting
if (envVars.RATE_LIMITER_ENABLED) {
    const limiter = rateLimit({
        keyGenerator: (req: Request) => {
            // If the user is logged in, use their ID; otherwise, use the IP address
            const userId = req.session.currentUserId; // Can't get req.user
            if (userId) {
                return userId;
            }
            return ipKeyGenerator(
                req.ip ?? req.socket.remoteAddress ?? 'unknown'
            );
        },
        legacyHeaders: false, // Disable the `X-RateLimit-*` headers
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        limit: envVars.RATE_LIMITER_MAX_REQUESTS!,
        message: {
            message:
                'You have made too many requests in a short period of time. Please wait before trying again.',
        },
        skip: (req: Request) =>
            req.path.startsWith('/assets') ||
            req.path.startsWith('/api/health'), // Skip rate limiting for static assets and health check
        standardHeaders: nodeEnv !== 'production', // Return rate limit info in the `RateLimit-*` headers
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        windowMs: envVars.RATE_LIMITER_WINDOW_MINUTES! * 60 * 1000,
    });
    app.use(limiter);
}

// Tell all bots that they are not allowed to crawl the site
app.get('/robots.txt', (req: Request, res: Response) => {
    res.type('text/plain');
    res.send('User-agent: *\nDisallow: /');
});

// Add the health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
});

// Add the routes
app.use('/', prototypeRouter);
app.use('/user', userRouter);
app.use('/help', helpRouter);

// Handle 404 errors
app.use(verifyUser, (req, res) => {
    const secFetchDest = req.header('sec-fetch-dest');
    if (secFetchDest === 'empty') {
        res.status(404).json({ message: 'Page not found' });
        return;
    }
    res.status(404).render('page-not-found.njk', {
        insideIframe: secFetchDest === 'iframe',
    });
});

// Attach middleware to handle errors
app.use(errorHandler);

// Start the server
const server = app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${String(PORT)}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        disconnectFromDatabase()
            .then(() => {
                console.log('Server closed');
                process.exit(0);
            })
            .catch((err: unknown) => {
                console.error('Error disconnecting from database:', err);
                process.exit(1);
            });
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
        disconnectFromDatabase()
            .then(() => {
                console.log('Server closed');
                process.exit(0);
            })
            .catch((err: unknown) => {
                console.error('Error disconnecting from database:', err);
                process.exit(1);
            });
    });
});

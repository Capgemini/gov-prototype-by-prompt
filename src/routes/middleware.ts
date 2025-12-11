import opentelemetry from '@opentelemetry/api';
import { NextFunction, Request, Response } from 'express';
import { ValidatorResultError } from 'jsonschema';
import { v4 as uuidv4 } from 'uuid';

import {
    canUserAccessPrototype,
    getPrototypeById,
    getUserById,
} from '../database/mongoose-store';
import { IPrototypeData } from '../types/schemas/prototype-schema';
import { IUser } from '../types/schemas/user-schema';
import {
    getEnvironmentVariables,
    prepareJsonValidationErrorMessage,
} from '../utils';

const logUserIdInAzureAppInsights =
    getEnvironmentVariables().LOG_USER_ID_IN_AZURE_APP_INSIGHTS;

/**
 * Middleware to attach request data to the Nunjucks environment.
 * Also sets anonymous user and body attributes on the active OpenTelemetry span.
 */
export const attachRequestData = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    res.locals.req = req;

    // Set anonymous user attributes on the active OpenTelemetry span
    const activeSpan = opentelemetry.trace.getActiveSpan();
    if (activeSpan) {
        if (logUserIdInAzureAppInsights) {
            // Log an anonymous user, will be replaced in verifyUser
            activeSpan.setAttribute('user.id', 'anonymous');
        }

        // Log the body if it exists
        if (req.body) {
            // Remove sensitive information from the body
            const body = structuredClone(req.body) as Record<string, unknown>;
            for (const key of Object.keys(body)) {
                if (
                    key.toLowerCase().includes('password') ||
                    key.toLowerCase().includes('secret')
                ) {
                    body[key] = '***';
                }
            }
            activeSpan.setAttribute('request.body', JSON.stringify(body));
        }

        // Log the response JSON and content type if they exist
        const oldJson = res.json;
        res.json = function (data) {
            activeSpan.setAttribute('response.json', JSON.stringify(data));
            res.json = oldJson; // restore original
            return res.json(data);
        };
        const oldSetHeader = res.setHeader.bind(res);
        res.setHeader = function (name: string, value: string) {
            if (name.toLowerCase() === 'content-type') {
                activeSpan.setAttribute('response.content_type', value);
            }
            return oldSetHeader(name, value);
        };
    }
    next();
};

/**
 * Middleware to check prototype exists and the current user can access it,
 * or that the user has entered the correct password for a live prototype.
 */
export const verifyLivePrototype = async (
    req: Request<{ id: string }> & {
        prototypeData?: IPrototypeData;
        user?: IUser;
    },
    res: Response,
    next: NextFunction
) => {
    // Try to get the user from the session
    let user: IUser | undefined;
    if (req.session.currentUserId) {
        user = (await getUserById(req.session.currentUserId)) ?? undefined;
    }

    // Attach the user to the tracing span if they exist
    if (user) {
        const activeSpan = opentelemetry.trace.getActiveSpan();
        if (activeSpan && logUserIdInAzureAppInsights)
            activeSpan.setAttribute('user.id', user.id);
        if (user.isActive !== false) {
            req.user = user;
            res.locals.user = user;
        }
    }

    // Get prototype data
    const userId = user?.id;
    const prototypeId = req.params.id;
    const prototypeData = await getPrototypeById(prototypeId);
    const secFetchDest = req.header('sec-fetch-dest');

    // If it doesn't exist
    if (!prototypeData) {
        // Prepare the response
        let status: number;
        let message: string;
        let render: string;
        if (!user) {
            status = 401;
            message = 'You are not signed in';
            render = 'not-signed-in.njk';
        } else if (user.isActive === false) {
            status = 403;
            message = 'Your account has been deactivated';
            render = 'account-deactivated.njk';
        } else {
            status = 404;
            message = 'Prototype not found';
            render = 'prototype-not-found.njk';
        }

        // Send the response
        if (secFetchDest === 'empty') {
            res.status(status).json({ message });
        } else {
            res.status(status).render(render, {
                insideIframe: secFetchDest === 'iframe',
            });
        }
        return;
    }

    // Get prototype access data
    const sessionPassword = req.session.livePrototypePasswords?.[prototypeId];
    const userCanAccessPrototype =
        userId && (await canUserAccessPrototype(userId, prototypeData.id));

    // If the prototype is public
    if (prototypeData.livePrototypePublic) {
        if (
            !prototypeData.livePrototypePublicPassword ||
            prototypeData.livePrototypePublicPassword === '' ||
            prototypeData.livePrototypePublicPassword === sessionPassword ||
            (userCanAccessPrototype && user?.isActive !== false)
        ) {
            req.prototypeData = prototypeData;
            next();
            return;
        } else {
            res.render('password-protected.njk', {
                insideIframe: req.header('sec-fetch-dest') === 'iframe',
                prototypeId: prototypeData.id,
            });
            return;
        }
    }

    // Otherwise it is not public, prepare the response
    let status: number;
    let message: string;
    let render: string;
    if (!user) {
        status = 401;
        message = 'You are not signed in';
        render = 'not-signed-in.njk';
    } else if (user.isActive === false) {
        status = 403;
        message = 'Your account has been deactivated';
        render = 'account-deactivated.njk';
    } else if (userCanAccessPrototype) {
        req.prototypeData = prototypeData;
        next();
        return;
    } else {
        status = 404;
        message = 'Prototype not found';
        render = 'prototype-not-found.njk';
    }

    // Send the response
    if (secFetchDest === 'empty') {
        res.status(status).json({ message });
    } else {
        res.status(status).render(render, {
            insideIframe: secFetchDest === 'iframe',
        });
    }
};

/**
 * Middleware to check prototype exists and the current user can access it.
 */
export const verifyPrototype = async (
    req: Request<{ id: string }> & { prototypeData?: IPrototypeData },
    res: Response,
    next: NextFunction
) => {
    const prototypeId = req.params.id;
    const prototypeData = await getPrototypeById(prototypeId);
    const user = (req as unknown as Request & { user: IUser }).user;
    if (
        !prototypeData ||
        !(await canUserAccessPrototype(user.id, prototypeData.id))
    ) {
        const secFetchDest = req.header('sec-fetch-dest');
        if (secFetchDest === 'empty') {
            res.status(404).json({ message: 'Prototype not found' });
            return;
        }
        res.status(404).render('prototype-not-found.njk', {
            insideIframe: secFetchDest === 'iframe',
        });
    } else {
        req.prototypeData = prototypeData;
        next();
    }
};

/**
 * Middleware to verify the user and attach them to the request and tracing span.
 */
export const verifyUser = async (
    req: Request & { user?: IUser },
    res: Response,
    next: NextFunction
) => {
    // Try to get the user from the session
    let user: IUser | undefined;
    if (req.session.currentUserId) {
        user = (await getUserById(req.session.currentUserId)) ?? undefined;
    }

    const secFetchDest = req.header('sec-fetch-dest');

    if (user) {
        // If the user is found
        const activeSpan = opentelemetry.trace.getActiveSpan();
        if (activeSpan && logUserIdInAzureAppInsights)
            activeSpan.setAttribute('user.id', user.id);

        // Stop if the user is deactivated
        if (user.isActive === false) {
            const secFetchDest = req.header('sec-fetch-dest');
            if (secFetchDest === 'empty') {
                res.status(403).json({
                    message: 'Your account has been deactivated',
                });
                return;
            }
            res.status(403).render('account-deactivated.njk', {
                insideIframe: secFetchDest === 'iframe',
            });
            return;
        } else {
            req.user = user;
            res.locals.user = user;
            next();
            return;
        }
    } else {
        // If they are not logged in or the user does not exist
        req.session.currentUserId = undefined;
        if (req.originalUrl === '/') {
            res.redirect('/user/sign-in'); // Redirect to sign in if on homepage
            return;
        }
        if (secFetchDest === 'empty') {
            res.status(401).json({ message: 'You are not signed in' });
            return;
        }
        res.status(401).render('not-signed-in.njk', {
            insideIframe: secFetchDest === 'iframe',
        });
    }
};

/**
 * Middleware to verify that a user is not already signed in.
 */
export const verifyNotUser = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // Try to get the user from the session
    let user: IUser | undefined;
    if (req.session.currentUserId) {
        user = (await getUserById(req.session.currentUserId)) ?? undefined;
    }

    // If the user is found, redirect to home
    if (user) {
        res.redirect('/'); // Redirect to home if user is already logged in
    } else {
        next();
    }
};

/**
 * Middleware to log and handle errors globally.
 */
export const errorHandler = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const errorMessage =
        typeof err === 'object' &&
        err !== null &&
        'message' in err &&
        typeof (err as { message?: unknown }).message === 'string'
            ? (err as { message: string }).message
            : 'An unknown error occurred';
    const errorName =
        typeof err === 'object' &&
        err !== null &&
        'name' in err &&
        typeof (err as { name?: unknown }).name === 'string'
            ? (err as { name: string }).name
            : 'Unknown Error';
    const errorStack =
        typeof err === 'object' &&
        err !== null &&
        'stack' in err &&
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        err.stack !== undefined
            ? (err as { stack?: unknown }).stack
            : 'No stack trace available';
    console.error('Error occurred:', errorMessage, errorName);
    let errorValidation: string | undefined;
    if (err instanceof ValidatorResultError) {
        errorValidation = prepareJsonValidationErrorMessage(err);
    }
    console.error(errorStack);
    if (errorValidation) console.error(errorValidation);
    const activeSpan = opentelemetry.trace.getActiveSpan();
    let errorId: string | undefined;
    if (activeSpan) {
        errorId = uuidv4();
        activeSpan.setAttribute('error.name', errorName);
        activeSpan.setAttribute('error.message', errorMessage);
        activeSpan.setAttribute('error.stack', String(errorStack));
        activeSpan.setAttribute('error.id', errorId);
        if (errorValidation)
            activeSpan.setAttribute('error.validation', errorValidation);
    }

    // Wrap the error message in JSON if the request is an API call
    if (!res.headersSent) {
        if (req.header('sec-fetch-dest') === 'empty') {
            res.status(500).json({
                message:
                    'Sorry, there is a problem with the service. If this persists, please contact support' +
                    (errorId
                        ? ` and provide the following error ID: ${errorId}.`
                        : '.'),
            });
        } else {
            // Otherwise, render the error page
            res.status(500).render('error.njk', {
                errorId: errorId,
            });
        }
        return;
    }
    next(err);
};

/**
 * Controller to handle when no other route is matched.
 */
export const notFoundHandler = (req: Request, res: Response) => {
    const secFetchDest = req.header('sec-fetch-dest');
    if (secFetchDest === 'empty') {
        res.status(404).json({ message: 'Page not found' });
        return;
    }
    res.status(404).render('page-not-found.njk', {
        insideIframe: secFetchDest === 'iframe',
    });
};

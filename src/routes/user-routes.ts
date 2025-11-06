import bcrypt from 'bcryptjs';
import express, { Request, Response } from 'express';
import { body, param, query, ValidationError } from 'express-validator';
import moment from 'moment';

import commonPasswords from '../../data/valid-common-passwords.json';
import { DEFAULT_PER_PAGE, PER_PAGE_OPTIONS } from '../constants';
import {
    canUserAccessWorkspace,
    countPrototypesByUserIdAndWorkspaceId,
    countWorkspacesByUserId,
    getAllUsers,
    getUserByEmail,
    getUserById,
    getWorkspaceById,
    getWorkspacesByUserId,
    storeUser,
    storeWorkspace,
    updateUser,
    updateWorkspace,
} from '../database/mongoose-store';
import { APIResponse } from '../types';
import { IUser } from '../types/schemas/user-schema';
import {
    generatePagination,
    getEnvironmentVariables,
    handleValidationErrors,
} from '../utils';
import { verifyNotUser, verifyUser } from './middleware';

// file deepcode ignore NoRateLimitingForExpensiveWebOperation: Main server.ts file contains Rate Limiting configuration for application.
// Create an Express router
const userRouter = express.Router();

// Redirect from old login/logout URLs
export function redirectLogin(req: Request, res: Response) {
    res.redirect(301, '/user/sign-in');
}
userRouter.get('/login', redirectLogin);

export function redirectLogout(req: Request, res: Response) {
    res.redirect(301, '/user/log-out');
}
userRouter.get('/logout', redirectLogout);

// Render the registration page
export function renderRegisterPage(req: Request, res: Response) {
    res.render('register.njk', {});
}
userRouter.get('/register', verifyNotUser, renderRegisterPage);

// Route to register a user
export async function registerUser(
    req: Request<
        {},
        {},
        {
            email: string;
            name: string;
            password1: string;
            password2: string;
        }
    >,
    res: Response<APIResponse>
) {
    if (handleValidationErrors(req, res)) return;

    const allowedDomain =
        getEnvironmentVariables().EMAIL_ADDRESS_ALLOWED_DOMAIN;
    const allowedDomainReveal =
        getEnvironmentVariables().EMAIL_ADDRESS_ALLOWED_DOMAIN_REVEAL;
    const errors: Partial<ValidationError>[] = [];
    // Validate input
    if (!/\S+@\S+\.\S+/.test(req.body.email)) {
        errors.push({
            msg: 'Enter an email address in the correct format, like name@example.com',
            path: 'email',
        });
    } else if (allowedDomain && !req.body.email.endsWith(`@${allowedDomain}`)) {
        if (allowedDomainReveal) {
            errors.push({
                msg: `Enter an email address with the domain ${allowedDomain}`,
                path: 'email',
            });
        } else {
            errors.push({
                msg: 'Enter a valid email address',
                path: 'email',
            });
        }
    }
    if (req.body.password1 !== req.body.password2) {
        errors.push(
            { msg: 'The passwords must match', path: 'password1' },
            { msg: 'The passwords must match', path: 'password2' }
        );
    } else if (req.body.password1.length < 12) {
        errors.push(
            {
                msg: 'The password must be at least 12 characters long',
                path: 'password1',
            },
            {
                msg: 'The password must be at least 12 characters long',
                path: 'password2',
            }
        );
    } else if (
        !/(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d])/.test(req.body.password1)
    ) {
        errors.push(
            {
                msg: 'The password must contain at least one letter, one number, and one symbol',
                path: 'password1',
            },
            {
                msg: 'The password must contain at least one letter, one number, and one symbol',
                path: 'password2',
            }
        );
    } else if (commonPasswords.passwords.includes(req.body.password1)) {
        errors.push({
            msg: 'This password is too common',
            path: 'password1',
        });
        errors.push({
            msg: 'This password is too common',
            path: 'password2',
        });
    }

    if (errors.length > 0) {
        res.status(400).json({
            errors: errors,
            message: 'Resolve the errors below and try again.',
        });
        return;
    }

    // Check if the email already exists
    const existingUser = await getUserByEmail(req.body.email);
    if (existingUser) {
        res.status(400).json({
            errors: [
                {
                    msg: 'An account with that email address already exists.',
                    path: 'email',
                },
            ],
            message: 'An account with that email address already exists.',
        });
        return;
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(req.body.password1, 10);

    // Create a new user first (without personalWorkspaceId)
    const timestamp = new Date().toISOString();
    const newUser = {
        createdAt: timestamp,
        email: req.body.email,
        name: req.body.name,
        passwordHash: hashedPassword,
        updatedAt: timestamp,
    };

    const user = await storeUser(newUser);

    // Create workspace with the user's ID
    const newWorkspace = {
        isPersonalWorkspace: true,
        name: `${req.body.name}'s workspace`,
        userIds: [user.id],
    };

    const workspace = await storeWorkspace(newWorkspace);

    // Update user with the workspace ID
    await updateUser(user.id, {
        personalWorkspaceId: workspace.id,
    });

    res.status(201).json({
        message: 'User registered successfully',
    });
}

userRouter.post(
    '/register',
    [
        body('*').trim(),
        body('email').notEmpty().withMessage('Enter your email address'),
        body('name').notEmpty().withMessage('Enter your name'),
        body('password1').notEmpty().withMessage('Create a password'),
        body('password2').notEmpty().withMessage('Confirm your password'),
    ],
    registerUser
);

export async function renderManageAccountPage(req: Request, res: Response) {
    const userId = req.session.currentUserId;

    if (!userId) {
        res.redirect('/user/sign-in');
        return;
    }

    const user = await getUserById(userId);

    if (!user) {
        res.status(404).render('error.njk', {
            message: 'User not found',
        });
        return;
    }

    res.render('manage-account.njk', {
        user: user,
    });
}
userRouter.get('/manage-account', verifyUser, renderManageAccountPage);



//Updates current user
export async function handleUpdateUser(
    req: Request<
        {},
        {},
        {
            name?: string;
            password1?: string;
            password2?: string;
        }
    >,
    res: Response<APIResponse>
) {
    if (handleValidationErrors(req, res)) return;
    const errors: Partial<ValidationError>[] = [];
    const userId = req.session.currentUserId;
    if (!userId) {
        res.redirect('/user/sign-in');
        return;
    }
    const { name, password1, password2 } = req.body

    if(!name && !password1){
        errors.push(
            { msg: 'Name field required', path: 'name' },
            { msg: 'Password field required', path: 'password1' },
            { msg: 'Password field required', path: 'password2' },
        );
    } 

    if (name){
        if (name.trim().length < 2) {
            errors.push({ msg: 'Name must be at least 2 characters', path: 'name' });
        }
    }

    if (password1){
        if (password1 !== password2) {
        errors.push(
            { msg: 'The passwords must match', path: 'password1' },
            { msg: 'The passwords must match', path: 'password2' }
        );
        } else if (password1.length < 12) {
            errors.push(
                {
                    msg: 'The password must be at least 12 characters long',
                    path: 'password1',
                },
                {
                    msg: 'The password must be at least 12 characters long',
                    path: 'password2',
                }
            );
        } else if (
            !/(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d])/.test(password1)
        ) {
            errors.push(
                {
                    msg: 'The password must contain at least one letter, one number, and one symbol',
                    path: 'password1',
                },
                {
                    msg: 'The password must contain at least one letter, one number, and one symbol',
                    path: 'password2',
                }
            );
        } else if (commonPasswords.passwords.includes(password1)) {
            errors.push({
                msg: 'This password is too common',
                path: 'password1',
            });
            errors.push({
                msg: 'This password is too common',
                path: 'password2',
            });
        }
    }

    if (errors.length > 0) {
        res.status(400).json({
            errors: errors,
            message: 'Resolve the errors and try again.',
        });
        return;
    }

    const updates: Record<string, string> = {};
    if (name) {
        updates.name = name.trim();
    }
    if (password1) {
        const hashedPassword = await bcrypt.hash(password1, 10);
        updates.passwordHash = hashedPassword;
    }
    const timestamp = new Date().toISOString();
    updates.updatedAt = timestamp

    await updateUser(userId, updates);

    res.status(200).json({
        message: 'User updated successfully',
    });

}

userRouter.post(
    '/updateUser',
    [
        body('*').trim(),
        body('name').optional(),
        body('password1').optional(),
        body('password2').optional(),
    ],
    handleUpdateUser
);

// Render the sign in page
export function renderSignInPage(req: Request, res: Response) {
    let referrer = '';
    const referrerHeader = req.get('referer') ?? '';
    const hostHeader = req.host;
    if (
        referrerHeader &&
        (referrerHeader.startsWith(`http://${hostHeader}`) ||
            referrerHeader.startsWith(`https://${hostHeader}`)) &&
        !referrerHeader.includes('/user/register')
    ) {
        referrer = referrerHeader;
    }
    res.render('sign-in.njk', {
        referrer: referrer,
    });
}
userRouter.get('/sign-in', verifyNotUser, renderSignInPage);

// Route to authenticate and sign in a user
export async function signInUser(
    req: Request<
        {},
        {},
        {
            email: string;
            password: string;
        }
    >,
    res: Response<APIResponse>
) {
    if (handleValidationErrors(req, res)) return;

    // Check if the email exists
    const user = await getUserByEmail(req.body.email);
    if (!user) {
        const message =
            'This account does not exist. You must create an account first.';
        res.status(401).json({
            errors: [{ msg: message, path: 'email' }],
            message,
        });
        return;
    }

    // Compare passwords
    const passwordMatch = await bcrypt.compare(
        req.body.password,
        user.passwordHash
    );
    if (!passwordMatch) {
        const message = 'Your email address and password do not match.';
        res.status(401).json({
            errors: [
                { msg: message, path: 'email' },
                { msg: message, path: 'password' },
            ],
            message,
        });
        return;
    }

    // Regenerate session to prevent session fixation attacks
    req.session.regenerate((err) => {
        if (err) {
            throw new Error('Session regeneration failed');
        }

        // Store user ID in session
        req.session.currentUserId = user.id;

        // Set token in response header
        res.status(204).json({ message: 'Sign in success' });
    });
}

userRouter.post(
    '/sign-in',
    [
        body('*').trim(),
        body('email').notEmpty().withMessage('Enter your email address'),
        body('password').notEmpty().withMessage('Enter your password'),
    ],
    signInUser
);

export function logOutUser(req: Request, res: Response) {
    req.session.currentUserId = undefined;
    res.locals.user = undefined;
    req.session.liveData = {};
    req.session.livePrototypePasswords = {};
    res.redirect('/user/sign-in');
}
userRouter.get('/log-out', logOutUser);

/**
 * Render the workspaces page.
 */
export async function renderWorkspacesPage(
    req: Request<
        {},
        {},
        {},
        {
            page?: string;
            perPage?: string;
        }
    >,
    res: Response
) {
    if (handleValidationErrors(req, res)) return;
    const user = (req as unknown as Request & { user: IUser }).user;

    // Get and validate the pagination query parameters
    let invalidPagination = false;
    let perPage = parseInt(req.query.perPage ?? '10', 10);
    if (
        req.query.perPage === undefined ||
        isNaN(perPage) ||
        perPage < 1 ||
        perPage > 100
    ) {
        perPage = DEFAULT_PER_PAGE;
        invalidPagination = true;
    }
    const totalWorkspaces = await countWorkspacesByUserId(user.id);
    let totalPages = Math.ceil(totalWorkspaces / perPage);
    if (totalPages < 1) totalPages = 1;
    let page = parseInt(req.query.page ?? '1', 10);
    if (
        req.query.page === undefined ||
        isNaN(page) ||
        page < 1 ||
        page > totalPages
    ) {
        page = 1;
        invalidPagination = true;
    }

    // Redirect if the query parameters were invalid
    if (invalidPagination) {
        res.redirect(
            `/user/workspace?page=${String(page)}&perPage=${String(perPage)}`
        );
        return;
    }

    // Get the pagination links
    const showPagination = totalWorkspaces > perPage;
    let paginationPreviousHref = '';
    let paginationNextHref = '';
    let paginationItems: object[] = [];
    if (showPagination) {
        const baseUrl = `/user/workspace?`;
        ({ paginationItems, paginationNextHref, paginationPreviousHref } =
            generatePagination(page, perPage, totalPages, baseUrl));
    }

    // Get the workspaces for the user
    const allWorkspaces = await getWorkspacesByUserId(user.id);
    const startIndex = (page - 1) * perPage;
    const workspaces = allWorkspaces.slice(startIndex, startIndex + perPage);

    // Prepare the workspace rows for rendering
    const workspaceRows: object[] = await Promise.all(
        workspaces.map(async (ws) => {
            let totalUsers = `${String(ws.userIds.length)} users`;
            if (ws.isPersonalWorkspace) {
                totalUsers = 'Private workspace';
            } else if (ws.userIds.length === 1) {
                totalUsers = 'Just you';
            }
            const totalPrototypes = await countPrototypesByUserIdAndWorkspaceId(
                user.id,
                ws.id
            );
            const totalPrototypesText = `${String(totalPrototypes)} prototype${totalPrototypes === 1 ? '' : 's'}`;
            return [
                {
                    html: `<a href="/user/workspace/${ws.id}">${ws.name}</a>`,
                },
                {
                    html:
                        totalPrototypes > 0
                            ? `<a href="/history?workspaceId=${ws.id}">${totalPrototypesText}</a>`
                            : totalPrototypesText,
                },
                {
                    html: totalUsers,
                },
                {
                    html: moment(ws.createdAt).format(
                        'ddd D MMM YYYY [at&nbsp;]HH:mm:ss'
                    ),
                },
                {
                    html: moment(ws.updatedAt).format(
                        'ddd D MMM YYYY [at&nbsp;]HH:mm:ss'
                    ),
                },
            ];
        })
    );

    // Prepare the table header
    const header = [
        {
            classes: 'govuk-!-width-one-quarter',
            text: 'Name',
        },
        {
            text: 'Total prototypes',
        },
        {
            text: 'Total users',
        },
        {
            text: 'Created',
        },
        {
            text: 'Last updated',
        },
    ];

    // Prepare the options to select how many items to show per page
    const perPageItems = PER_PAGE_OPTIONS.map((option) => ({
        checked: option === perPage,
        text: option.toString(),
        value: option.toString(),
    }));

    res.render('workspaces.njk', {
        header: header,
        itemsPerPage: perPage.toString(),
        paginationItems: paginationItems,
        paginationNextHref: paginationNextHref,
        paginationPreviousHref: paginationPreviousHref,
        perPageItems: perPageItems,
        showPagination: showPagination,
        totalWorkspaces: totalWorkspaces,
        workspaceRows: workspaceRows,
    });
}

userRouter.get(
    '/workspace',
    [verifyUser, query('*').trim()],
    renderWorkspacesPage
);

export async function renderCreateWorkspacePage(req: Request, res: Response) {
    const user = (req as unknown as Request & { user: IUser }).user;
    res.render('workspace.njk', {
        allUsers: await getAllUsers(),
        lastUpdated: undefined,
        sharedWithUsers: [user],
        userId: user.id,
        workspaceId: 'create',
        ws: undefined,
    });
}
userRouter.get('/workspace/create', verifyUser, renderCreateWorkspacePage);

// Create a new workspace
export async function createWorkspace(
    req: Request<{}, {}, { name: string }>,
    res: Response<APIResponse & { url?: string }>
) {
    if (handleValidationErrors(req, res)) return;
    const user = (req as unknown as Request & { user: IUser }).user;

    // Save the updated prototype data
    const workspace = await storeWorkspace({
        isPersonalWorkspace: false,
        name: req.body.name,
        userIds: [user.id],
    });

    res.status(200).json({
        message: 'Workspace created successfully.',
        url: `/user/workspace/${workspace.id}`,
    });
}
userRouter.post(
    '/workspace/create',
    [
        verifyUser,
        body('name').trim().notEmpty().withMessage('Enter a workspace name'),
    ],
    createWorkspace
);

// Render the workspace details page
export async function renderWorkspacePage(
    req: Request<{ id: string }>,
    res: Response
) {
    if (handleValidationErrors(req, res)) return;
    const user = (req as unknown as Request & { user: IUser }).user;
    const workspaceId = req.params.id;
    const workspace = await getWorkspaceById(workspaceId);

    // Check the workspace exists and if the user can access it
    if (!workspace || !(await canUserAccessWorkspace(user.id, workspaceId))) {
        res.status(404).render('workspace-not-found.njk', {});
        return;
    }

    // Get sharing data
    const sharedWithUsers: IUser[] = [];
    for (const userId of workspace.userIds) {
        const userData = await getUserById(userId);
        if (userData) {
            sharedWithUsers.push(userData);
        }
    }

    res.render('workspace.njk', {
        allUsers: await getAllUsers(),
        lastUpdated: moment(workspace.updatedAt).format(
            'ddd D MMM YYYY [at&nbsp;]HH:mm:ss'
        ),
        sharedWithUsers: sharedWithUsers,
        userId: user.id,
        workspaceId: workspaceId,
        ws: workspace,
    });
}
userRouter.get(
    '/workspace/:id',
    [verifyUser, param('id').trim().notEmpty()],
    renderWorkspacePage
);

// Update an existing workspace
export async function updateWorkspaceController(
    req: Request<
        { id: string },
        {},
        { name: string; sharedWithUserIds: string[] }
    >,
    res: Response<APIResponse & { url?: string }>
) {
    if (handleValidationErrors(req, res)) return;
    const user = (req as unknown as Request & { user: IUser }).user;
    const workspaceId = req.params.id;
    const workspace = await getWorkspaceById(workspaceId);

    // Check the workspace exists and if the user can access it
    if (!workspace || !(await canUserAccessWorkspace(user.id, workspaceId))) {
        res.status(404).json({ message: 'Workspace not found' });
        return;
    }

    // Validate the shared users
    const sharedWithUserIds = req.body.sharedWithUserIds;
    if (!workspace.isPersonalWorkspace) {
        if (sharedWithUserIds.length === 0) {
            res.status(400).json({
                message: 'At least one user must have access to the workspace.',
            });
            return;
        }
        const allUsers = await getAllUsers();
        const allUserIds = allUsers.map((user) => user.id);
        for (const userId of req.body.sharedWithUserIds) {
            if (!allUserIds.includes(userId)) {
                res.status(400).json({
                    message: `User with ID ${userId} does not exist.`,
                });
                return;
            }
        }
    }

    // Save the updated prototype data
    await updateWorkspace(workspaceId, {
        isPersonalWorkspace: workspace.isPersonalWorkspace,
        name: req.body.name,
        userIds: workspace.isPersonalWorkspace
            ? [user.id]
            : Array.from(new Set(req.body.sharedWithUserIds)),
    });

    const canAccess = await canUserAccessWorkspace(user.id, workspaceId);
    if (canAccess) {
        res.status(200).json({
            message: 'Workspace updated successfully.',
        });
    } else {
        res.status(200).json({
            message: 'You have been removed from the workspace.',
            url: `/user/workspace`,
        });
    }
}
userRouter.post(
    '/workspace/:id',
    [
        verifyUser,
        param('id').trim().notEmpty(),
        body('name').trim().notEmpty().withMessage('Enter a workspace name'),
        body('sharedWithUserIds').isArray(),
    ],
    updateWorkspaceController
);

export { userRouter };

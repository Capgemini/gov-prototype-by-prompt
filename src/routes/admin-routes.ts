import bcrypt from 'bcryptjs';
import express, { Request, Response } from 'express';
import { body, param, query, ValidationError } from 'express-validator';
import moment from 'moment';

import { DEFAULT_PER_PAGE, PER_PAGE_OPTIONS } from '../constants';
import {
    countActiveAdminUsers,
    countAllUsers,
    countPrototypesByUserId,
    getAllUsers,
    getUserById,
    updateUser,
} from '../database/mongoose-store';
import { APIResponse } from '../types';
import { IUser } from '../types/schemas/user-schema';
import {
    generatePagination,
    handleValidationErrors,
    validatePasswords,
} from '../utils';
import { verifyAdminUser, verifyUser } from './middleware';

// file deepcode ignore NoRateLimitingForExpensiveWebOperation: Main server.ts file contains Rate Limiting configuration for application.
// Create an Express router
const adminRouter = express.Router();

// Render the users page
export async function renderUsersPage(
    req: Request<
        {},
        {},
        {},
        {
            isActive?: string;
            isAdmin?: string;
            page?: string;
            perPage?: string;
        }
    >,
    res: Response
) {
    if (handleValidationErrors(req, res)) return;
    const user = (req as unknown as Request & { user: IUser }).user;

    // Get and validate the filter query parameters
    let isAdmin = req.query.isAdmin ?? 'all';
    if (!['all', 'false', 'true'].includes(isAdmin)) {
        isAdmin = 'all';
    }
    let isActive = req.query.isActive ?? 'all';
    if (!['all', 'false', 'true'].includes(isActive)) {
        isActive = 'all';
    }

    // Get and validate the pagination query parameters
    let invalidPagination = false;
    let perPage = Number.parseInt(req.query.perPage ?? '10', 10);
    if (
        req.query.perPage === undefined ||
        Number.isNaN(perPage) ||
        perPage < 1 ||
        perPage > 100
    ) {
        perPage = DEFAULT_PER_PAGE;
        invalidPagination = true;
    }

    // Get and filter the users
    let users = await getAllUsers();
    if (isAdmin === 'true') {
        users = users.filter((u) => u.isAdmin === true);
    } else if (isAdmin === 'false') {
        users = users.filter((u) => u.isAdmin !== true);
    }
    if (isActive === 'true') {
        users = users.filter((u) => u.isActive !== false);
    } else if (isActive === 'false') {
        users = users.filter((u) => u.isActive === false);
    }

    // Validate the pagination parameters against the total
    const countUsers = users.length;
    let totalPages = Math.ceil(countUsers / perPage);
    if (totalPages < 1) totalPages = 1;
    let page = Number.parseInt(req.query.page ?? '1', 10);
    if (
        req.query.page === undefined ||
        Number.isNaN(page) ||
        page < 1 ||
        page > totalPages
    ) {
        page = 1;
        invalidPagination = true;
    }

    // Redirect if the query parameters were invalid
    if (
        req.query.isActive === undefined ||
        !['all', 'false', 'true'].includes(req.query.isActive) ||
        req.query.isAdmin === undefined ||
        !['all', 'false', 'true'].includes(req.query.isAdmin) ||
        invalidPagination
    ) {
        res.redirect(
            `/admin/user?page=${String(page)}&perPage=${String(perPage)}&isActive=${isActive}&isAdmin=${isAdmin}`
        );
        return;
    }

    // Get the pagination links
    const showPagination = countUsers > perPage;
    let paginationPreviousHref = '';
    let paginationNextHref = '';
    let paginationItems: object[] = [];
    if (showPagination) {
        const baseUrl = `/admin/user?isActive=${isActive}&isAdmin=${isAdmin}`;
        ({ paginationItems, paginationNextHref, paginationPreviousHref } =
            generatePagination(page, perPage, totalPages, baseUrl));
    }

    // Apply pagination to the users
    const startIndex = (page - 1) * perPage;
    users = users.slice(startIndex, startIndex + perPage);

    // Prepare the user rows for rendering
    const userRows: object[] = await Promise.all(
        users.map(async (u) => {
            return [
                {
                    html: `<b><a href="/admin/user/${u.id}">${u.name}</a>${user.id === u.id ? ' (you)' : ''}</b><br><span class="govuk-body govuk-!-font-size-16">${u.email}</span>`,
                },
                {
                    html: String(await countPrototypesByUserId(u.id, false)),
                },
                { html: u.isActive ? 'Yes' : 'No' },
                {
                    html: u.isAdmin ? 'Yes' : 'No',
                },
                {
                    html: moment(u.createdAt).format(
                        'ddd D MMM YYYY [at&nbsp;]HH:mm:ss'
                    ),
                },
                {
                    html: moment(u.updatedAt).format(
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
            text: 'Is active?',
        },
        {
            text: 'Is admin?',
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

    res.render('users.njk', {
        countUsers: countUsers,
        header: header,
        isActive: isActive,
        isAdmin: isAdmin,
        itemsPerPage: perPage.toString(),
        paginationItems: paginationItems,
        paginationNextHref: paginationNextHref,
        paginationPreviousHref: paginationPreviousHref,
        perPageItems: perPageItems,
        showPagination: showPagination,
        totalUsers: await countAllUsers(),
        userRows: userRows,
    });
}
adminRouter.get(
    '/user',
    [verifyAdminUser, query('*').trim().toLowerCase()],
    renderUsersPage
);

export async function renderManageUserPage(
    req: Request<{ id: string }>,
    res: Response
) {
    if (handleValidationErrors(req, res)) return;
    const selfUser = (req as unknown as Request & { user: IUser }).user;

    const userId = req.params.id;
    const user = await getUserById(userId);

    // Check the user exists
    if (!user) {
        res.status(404).render('user-not-found.njk', {});
        return;
    }

    res.render('manage-user.njk', {
        isSelf: selfUser.id === user.id,
        user: user,
    });
}
adminRouter.get(
    '/user/:id',
    [verifyAdminUser, param('id').trim().notEmpty()],
    renderManageUserPage
);

//Updates current user
export async function handleUpdateUser(
    req: Request<
        { id: string },
        {},
        {
            isActive?: boolean | string;
            isAdmin?: boolean | string;
            name?: string;
            password1?: string;
            password2?: string;
        }
    >,
    res: Response<
        APIResponse & { name?: string; pageTitle?: string; redirect?: string }
    >
) {
    if (handleValidationErrors(req, res)) return;
    const selfUser = (req as unknown as Request & { user: IUser }).user;

    // Get the user to update and check permissions
    const user = await getUserById(req.params.id);
    if (!user || (selfUser.id !== user.id && selfUser.isAdmin !== true)) {
        res.status(404).json({
            message: 'User not found',
        });
        return;
    }

    // Parse the input fields
    let { isActive, isAdmin } = req.body;
    const { name, password1, password2 } = req.body;

    // Convert isActive and isAdmin to boolean values
    if (typeof isActive === 'string') {
        isActive = isActive !== 'false';
    }
    if (typeof isAdmin === 'string') {
        isAdmin = isAdmin === 'true';
    }
    if (selfUser.isAdmin !== true) {
        isActive = undefined;
        isAdmin = undefined;
    }

    // Validate the input fields
    const errors: Partial<ValidationError>[] = [];
    if (
        !name &&
        !password1 &&
        isAdmin === undefined &&
        isActive === undefined
    ) {
        errors.push(
            { msg: 'Enter a name', path: 'name' },
            { msg: 'Create a password', path: 'password1' },
            { msg: 'Confirm new password', path: 'password2' }
        );
    }
    if (name) {
        if (name.trim().length < 2) {
            errors.push({
                msg: 'Name must be at least 2 characters',
                path: 'name',
            });
        }
    }
    if (password1) {
        errors.push(...validatePasswords(password1, password2));
    }

    // Don't allow disabling or demoting the last active admin user
    // WARNING: possible race condition if the last users are updated simultaneously
    if (
        (isActive === false || isAdmin === false) &&
        user.isActive !== false &&
        user.isAdmin === true &&
        (await countActiveAdminUsers()) <= 1
    ) {
        errors.push(
            {
                msg: 'There must be at least one active admin user.',
                path: 'isActive',
            },
            {
                msg: 'There must be at least one active admin user.',
                path: 'isAdmin',
            }
        );
    }

    // Return any validation errors
    if (errors.length > 0) {
        res.status(400).json({
            errors: errors,
            message: 'Resolve the errors and try again.',
        });
        return;
    }

    // Apply the updates
    const updates: Partial<IUser> = {};
    if (name) {
        updates.name = name;
    }
    if (password1) {
        const hashedPassword = await bcrypt.hash(password1, 10);
        updates.passwordHash = hashedPassword;
    }
    if (isActive !== undefined && selfUser.isAdmin === true) {
        updates.isActive = isActive;
    }
    if (isAdmin !== undefined && selfUser.isAdmin === true) {
        updates.isAdmin = isAdmin;
    }
    const timestamp = new Date().toISOString();
    updates.updatedAt = timestamp;
    const newUser = await updateUser(user.id, updates);

    // Calculate if a redirect is needed
    let redirect: string | undefined;
    if (selfUser.id === user.id) {
        if (isActive === false) redirect = '/';
        else if (isAdmin === false) redirect = '/user/manage-account';
    }

    // Return success
    res.status(200).json({
        message: 'User updated successfully',
        name: newUser?.name ?? user.name,
        pageTitle: `Manage ${selfUser.id === user.id ? 'your' : (newUser?.name ?? user.name) + "'s"} account`,
        redirect: redirect,
    });
}
adminRouter.post(
    '/user/:id',
    [
        body('isActive')
            .optional()
            .isBoolean({ strict: false })
            .withMessage('User active status must be a boolean value.'),
        body('isAdmin')
            .optional()
            .isBoolean({ strict: false })
            .withMessage('User admin status must be a boolean value.'),
        body('name').optional().trim(),
        body('password1').optional().trim(),
        body('password2').optional().trim(),
    ],
    [verifyUser, query('*').trim()],
    handleUpdateUser
);

export { adminRouter };

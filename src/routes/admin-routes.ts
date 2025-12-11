import express, { Request, Response } from 'express';
import { query } from 'express-validator';
import moment from 'moment';

import { DEFAULT_PER_PAGE, PER_PAGE_OPTIONS } from '../constants';
import {
    countAllUsers,
    countPrototypesByUserId,
    getAllUsers,
} from '../database/mongoose-store';
import { IUser } from '../types/schemas/user-schema';
import { generatePagination, handleValidationErrors } from '../utils';
import { verifyAdminUser } from './middleware';

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
        users = users.filter((u) => u.isAdmin);
    } else if (isAdmin === 'false') {
        users = users.filter((u) => !u.isAdmin);
    }
    if (isActive === 'true') {
        users = users.filter((u) => u.isActive);
    } else if (isActive === 'false') {
        users = users.filter((u) => !u.isActive);
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
            `/admin/users?page=${String(page)}&perPage=${String(perPage)}&isActive=${isActive}&isAdmin=${isAdmin}`
        );
        return;
    }

    // Get the pagination links
    const showPagination = countUsers > perPage;
    let paginationPreviousHref = '';
    let paginationNextHref = '';
    let paginationItems: object[] = [];
    if (showPagination) {
        const baseUrl = `/admin/users?isActive=${isActive}&isAdmin=${isAdmin}`;
        ({ paginationItems, paginationNextHref, paginationPreviousHref } =
            generatePagination(page, perPage, totalPages, baseUrl));
    }

    // Apply pagination to the users
    const startIndex = (page - 1) * perPage;
    users = users.slice(startIndex, startIndex + perPage);

    // Prepare the user rows for rendering
    const userRows: object[] = await Promise.all(
        users.map(async (u) => {
            const totalPrototypes = await countPrototypesByUserId(u.id, false);
            const totalPrototypesText = `${String(totalPrototypes)} prototype${totalPrototypes === 1 ? '' : 's'}`;
            return [
                {
                    html: `<b><a href="/admin/users/${u.id}">${u.name}</a>${user.id === u.id ? ' (you)' : ''}</b><br><span class="govuk-body govuk-!-font-size-16">${u.email}</span>`,
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
    '/users',
    [verifyAdminUser, query('*').trim().toLowerCase()],
    renderUsersPage
);

export { adminRouter };

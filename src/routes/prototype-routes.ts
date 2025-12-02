import opentelemetry from '@opentelemetry/api';
import express, { Request, Response } from 'express';
import { body, param, query } from 'express-validator';
import moment from 'moment';
import { Document } from 'mongoose';
import * as nunjucks from 'nunjucks';

import formSchema from '../../data/extract-form-questions-schema.json';
import {
    DEFAULT_PER_PAGE,
    NUMBER_OF_PREVIOUS_PROTOTYPES_TO_SHOW,
    PER_PAGE_OPTIONS,
} from '../constants';
import {
    canUserAccessPrototype,
    canUserAccessWorkspace,
    countPrototypesByUserId,
    getAllUsers,
    getPreviousPrototypes,
    getPrototypeById,
    getPrototypesByUserId,
    getUserById,
    getWorkspaceById,
    getWorkspacesByUserId,
    storePrototype,
    updatePrototype,
} from '../database/mongoose-store';
import {
    generateBasePage,
    generateCheckAnswersPage,
    generateConfirmationPage,
    generateQuestionPage,
    generateStartPage,
} from '../form-generator';
import {
    createFormWithOpenAI,
    generateSuggestionsWithOpenAI,
    updateFormWithOpenAI,
} from '../openai';
import {
    APIResponse,
    CreateFormRequestBody,
    DefaultPrototypeDesignSystem,
    IPrototypeData,
    PrototypeDesignSystems,
    PrototypeDesignSystemsType,
    ResultsTemplatePayload,
    UpdateFormRequestBody,
} from '../types';
import { IUser } from '../types/schemas/user-schema';
import { IWorkspace } from '../types/schemas/workspace-schema';
import {
    generatePagination,
    generateSlug,
    getEnvironmentVariables,
    getFormSchemaForJsonInputValidation,
    handleValidationErrors,
    prepareJsonValidationErrorMessage,
    validateTemplateDataText,
} from '../utils';
import { buildZipOfForm } from '../zip-generator';
import { verifyLivePrototype, verifyPrototype, verifyUser } from './middleware';

// Create an Express router
const prototypeRouter = express.Router();

// Expose the schema
export function renderSchema(req: Request, res: Response) {
    res.json(getFormSchemaForJsonInputValidation(formSchema));
}
prototypeRouter.get('/schema', verifyUser, renderSchema);

/**
 * Render the homepage.
 */
export function renderHomePage(req: Request, res: Response) {
    res.render('home.njk', {});
}
prototypeRouter.get('/', verifyUser, renderHomePage);

/**
 * Render the create page to create a prototype.
 */
export async function renderCreatePage(req: Request, res: Response) {
    const user = (req as unknown as Request & { user: IUser }).user;
    const workspaces = await getWorkspacesByUserId(user.id);
    res.render('new.njk', {
        workspaces: workspaces.map((ws) => ({
            text: ws.name,
            value: ws.id,
        })),
    });
}
prototypeRouter.get('/create', verifyUser, renderCreatePage);

/**
 * Render the history page to view previous prototypes.
 */
export async function renderHistoryPage(
    req: Request<
        {},
        {},
        {},
        {
            createdBy?: string;
            onlyCreated?: string;
            page?: string;
            perPage?: string;
            sharing?: string;
            workspaceId?: string;
        }
    >,
    res: Response
) {
    if (handleValidationErrors(req, res)) return;
    const user = (req as unknown as Request & { user: IUser }).user;

    // Get and validate the filter query parameters
    const onlyCreated = req.query.onlyCreated === 'true';
    let createdBy = req.query.createdBy ?? 'anyone';
    if (!['anyone', 'others', 'self'].includes(createdBy)) {
        createdBy = 'anyone';
    }
    const workspaces = await getWorkspacesByUserId(user.id);
    const acceptedWorkspaceIds = new Set([
        'all',
        ...workspaces.map((ws) => ws.id),
    ]);
    let workspaceId = req.query.workspaceId;
    if (!workspaceId || !acceptedWorkspaceIds.has(workspaceId)) {
        workspaceId = 'all';
    }
    const sharingOptions = new Set([
        'all',
        'private',
        'public',
        'users',
        'workspace',
    ]);
    let sharing = req.query.sharing ?? 'all';
    if (!sharingOptions.has(sharing)) {
        sharing = 'all';
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

    // Get the prototypes for the user
    // Filter by creator and workspace
    let prototypes = await getPrototypesByUserId(user.id, onlyCreated);
    if (createdBy === 'self') {
        prototypes = prototypes.filter(
            (prototype) => prototype.creatorUserId === user.id
        );
    } else if (createdBy === 'others') {
        prototypes = prototypes.filter(
            (prototype) => prototype.creatorUserId !== user.id
        );
    }
    if (workspaceId !== 'all') {
        prototypes = prototypes.filter(
            (prototype) => prototype.workspaceId === workspaceId
        );
    }

    // Get all workspaces for prototypes before filtering by sharing
    // Only build workspaceMap if sharing is 'private' or 'workspace'
    const workspaceMap: Record<string, IWorkspace | undefined> = {};
    if (sharing === 'private' || sharing === 'workspace') {
        await Promise.all(
            prototypes.map(async (prototype) => {
                workspaceMap[prototype.workspaceId] ??=
                    (await getWorkspaceById(prototype.workspaceId)) ??
                    undefined;
            })
        );
    }

    // Filter prototypes by sharing type
    switch (sharing) {
        case 'private':
            prototypes = prototypes.filter((prototype) => {
                const workspace = workspaceMap[prototype.workspaceId];
                return (
                    !prototype.livePrototypePublic &&
                    prototype.sharedWithUserIds.length === 0 &&
                    workspace?.userIds.length === 1
                );
            });
            break;
        case 'public':
            prototypes = prototypes.filter(
                (prototype) => prototype.livePrototypePublic
            );
            break;
        case 'users':
            prototypes = prototypes.filter(
                (prototype) => prototype.sharedWithUserIds.length > 0
            );
            break;
        case 'workspace':
            prototypes = prototypes.filter((prototype) => {
                const workspace = workspaceMap[prototype.workspaceId];
                return workspace && workspace.userIds.length > 1;
            });
            break;
    }
    const countPrototypes = prototypes.length;

    // Validate the pagination parameters against the total prototypes
    let totalPages = Math.ceil(countPrototypes / perPage);
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
        req.query.onlyCreated === undefined ||
        !['false', 'true'].includes(req.query.onlyCreated) ||
        req.query.createdBy === undefined ||
        !['anyone', 'others', 'self'].includes(req.query.createdBy) ||
        req.query.workspaceId === undefined ||
        !acceptedWorkspaceIds.has(req.query.workspaceId) ||
        req.query.sharing === undefined ||
        !sharingOptions.has(req.query.sharing) ||
        invalidPagination
    ) {
        res.redirect(
            `/history?onlyCreated=${String(onlyCreated)}&createdBy=${createdBy}&workspaceId=${workspaceId}&sharing=${sharing}&page=${String(page)}&perPage=${String(perPage)}`
        );
        return;
    }

    // Get the pagination links
    const showPagination = countPrototypes > perPage;
    let paginationPreviousHref = '';
    let paginationNextHref = '';
    let paginationItems: object[] = [];
    if (showPagination) {
        const baseUrl = `/history?onlyCreated=${String(onlyCreated)}&createdBy=${createdBy}&workspaceId=${workspaceId}&sharing=${sharing}`;
        ({ paginationItems, paginationNextHref, paginationPreviousHref } =
            generatePagination(page, perPage, totalPages, baseUrl));
    }

    // Apply pagination to the prototypes
    const startIndex = (page - 1) * perPage;
    prototypes = prototypes.slice(startIndex, startIndex + perPage);

    // Prepare the workspace items for filtering
    const workspaceItems = [
        {
            selected: workspaceId === 'all',
            text: 'All workspaces',
            value: 'all',
        },
        ...workspaces.map((ws) => ({
            selected: workspaceId === ws.id,
            text: ws.name,
            value: ws.id,
        })),
    ];

    // Prepare the prototype rows for rendering
    const prototypeRows: object[] = await Promise.all(
        prototypes.map(async (prototype) => {
            let creator;
            if (createdBy !== 'self') {
                creator =
                    prototype.creatorUserId === user.id
                        ? 'You'
                        : (await getUserById(prototype.creatorUserId))?.name;
            }
            let workspace;
            if (workspaceId === 'all') {
                workspace =
                    prototype.workspaceId === user.personalWorkspaceId
                        ? 'Your private workspace'
                        : (await getWorkspaceById(prototype.workspaceId))?.name;
            }
            return [
                {
                    html: `<a href="/prototype/${prototype.id}">${prototype.json.title}</a>`,
                },
                {
                    html: moment(prototype.timestamp).format(
                        'ddd D MMM YYYY [at&nbsp;]HH:mm:ss'
                    ),
                },
                ...(createdBy === 'self'
                    ? []
                    : [
                          {
                              text: creator ?? 'Unknown',
                          },
                      ]),
                ...(workspaceId === 'all'
                    ? [
                          {
                              text: workspace ?? 'Unknown',
                          },
                      ]
                    : []),
                ...(onlyCreated
                    ? []
                    : [
                          {
                              text: prototype.changesMade,
                          },
                      ]),
            ];
        })
    );

    // Prepare the table header
    const header = [
        {
            classes: onlyCreated ? '' : 'govuk-!-width-one-quarter',
            text: 'Name',
        },
        {
            text: 'Created',
        },
        ...(createdBy === 'self'
            ? []
            : [
                  {
                      text: 'Created by',
                  },
              ]),
        ...(workspaceId === 'all'
            ? [
                  {
                      text: 'Workspace',
                  },
              ]
            : []),
        ...(onlyCreated ? [] : [{ text: 'Changes made' }]),
    ];

    // Prepare the options to select how many items to show per page
    const perPageItems = PER_PAGE_OPTIONS.map((option) => ({
        checked: option === perPage,
        text: option.toString(),
        value: option.toString(),
    }));

    res.render('history.njk', {
        countPrototypes: countPrototypes,
        createdBy: createdBy,
        header: header,
        itemsPerPage: perPage.toString(),
        onlyCreated: onlyCreated,
        paginationItems: paginationItems,
        paginationNextHref: paginationNextHref,
        paginationPreviousHref: paginationPreviousHref,
        perPageItems: perPageItems,
        prototypeRows: prototypeRows,
        sharing: sharing,
        showPagination: showPagination,
        totalPrototypes: await countPrototypesByUserId(user.id, false),
        workspaceItems: workspaceItems,
    });
}
prototypeRouter.get(
    '/history',
    [verifyUser, query('*').trim().toLowerCase()],
    renderHistoryPage
);

/**
 * Download the multi-page form prototype as a ZIP file.
 */
export async function handleDownloadPrototype(
    req: Request<{ id: string }>,
    res: Response<Buffer<ArrayBuffer> | string>
) {
    if (handleValidationErrors(req, res)) return;
    // Get the prototype and author
    const prototypeData = (
        req as unknown as Request & { prototypeData: IPrototypeData }
    ).prototypeData;
    const author =
        (await getUserById(prototypeData.creatorUserId))?.name ?? 'Unknown';

    // Multi-page form, recreate the form with a better prototype ID
    const newId = generateSlug(prototypeData.json.title);
    const blob = await buildZipOfForm(
        prototypeData.json,
        newId,
        prototypeData.designSystem,
        author
    );
    res.type(blob.type);
    res.set({
        'Content-Disposition': `attachment; filename="${generateSlug(prototypeData.json.title)}.zip"`,
    });
    await blob.arrayBuffer().then((buf: ArrayBuffer) => {
        res.send(Buffer.from(buf));
    });
}
prototypeRouter.get(
    '/prototype/:id/download',
    [verifyUser, param('id').trim().notEmpty(), verifyPrototype],
    handleDownloadPrototype
);

/**
 * Reset the live data for a specific prototype.
 */
export function handleResetLivePrototype(
    req: Request<{ id: string }>,
    res: Response<APIResponse>
) {
    if (handleValidationErrors(req, res)) return;
    const prototypeId = req.params.id;
    if (req.session.liveData?.[prototypeId]) {
        req.session.liveData[prototypeId] = {};
    }
    if (req.session.livePrototypeHistory?.[prototypeId]) {
        req.session.livePrototypeHistory[prototypeId] = [];
    }
    res.status(204).json({ message: 'Prototype data reset successfully' });
}
prototypeRouter.get(
    '/prototype/:id/reset',
    [verifyUser, param('id').trim().notEmpty(), verifyPrototype],
    handleResetLivePrototype
);

/**
 * Generate suggestions for a prototype using OpenAI.
 */
export async function handleSuggestions(
    req: Request<{ id: string }>,
    res: Response<APIResponse & { suggestions: string[] }>
) {
    if (handleValidationErrors(req, res)) return;
    // Check if suggestions are enabled
    if (!getEnvironmentVariables().SUGGESTIONS_ENABLED) {
        res.status(503).json({
            message: 'Suggestions are not enabled on this server.',
            suggestions: [],
        });
        return;
    }

    // Get the prototype
    const prototypeData = (
        req as unknown as Request & { prototypeData: IPrototypeData }
    ).prototypeData;

    // Generate suggestions using OpenAI
    await generateSuggestionsWithOpenAI(
        getEnvironmentVariables(),
        prototypeData.json,
        prototypeData.designSystem
    ).then((suggestions: string) => {
        res.status(200).json({
            message: 'Suggestions generated successfully',
            suggestions: (
                JSON.parse(suggestions, (key: string, value: null | string) => {
                    if (value !== null) return value;
                }) as { suggestions: string[] }
            ).suggestions,
        });
    });
}
prototypeRouter.get(
    '/prototype/:id/suggestions',
    [verifyUser, param('id').trim().notEmpty(), verifyPrototype],
    handleSuggestions
);

/**
 * Update the sharing settings for a prototype.
 */
export async function handleUpdateSharing(
    req: Request<
        { id: string },
        {},
        {
            livePrototypePublic: boolean;
            livePrototypePublicPassword?: string;
            sharedWithUserIds: string[];
            workspaceId: string;
        }
    >,
    res: Response<APIResponse>
) {
    if (handleValidationErrors(req, res)) return;
    // Verify that the user is a member of the workspace
    const prototypeData = (
        req as unknown as Request & { prototypeData: IPrototypeData }
    ).prototypeData;
    const user = (req as unknown as Request & { user: IUser }).user;

    if (prototypeData.id !== req.params.id) {
        res.status(400).json({
            message: 'Prototype ID mismatch.',
        });
        return;
    }

    if (!(await canUserAccessWorkspace(user.id, prototypeData.workspaceId))) {
        res.status(403).json({
            message: 'Only members of the workspace can manage sharing.',
        });
        return;
    }

    // Validate the sharedWithUserIds array
    const allUsers = await getAllUsers();
    const allUserIds = new Set(allUsers.map((user) => user.id));
    for (const userId of req.body.sharedWithUserIds) {
        if (!allUserIds.has(userId)) {
            res.status(400).json({
                message: `User with ID ${userId} does not exist.`,
            });
            return;
        }
    }

    // Validate the workspace ID
    const workspaceId = req.body.workspaceId;
    if (!workspaceId || !(await getWorkspaceById(workspaceId))) {
        res.status(400).json({
            message: 'A valid workspace ID is required.',
        });
        return;
    }

    const updates = {
        livePrototypePublic: req.body.livePrototypePublic,
        livePrototypePublicPassword: req.body.livePrototypePublicPassword ?? '',
        sharedWithUserIds: Array.from(new Set(req.body.sharedWithUserIds)),
        workspaceId: workspaceId,
    };

    // Update the prototype data
    await updatePrototype(prototypeData.id, updates);
    res.status(200).json({
        message: 'Prototype sharing settings updated successfully.',
    });
}
prototypeRouter.post(
    '/prototype/:id/sharing',
    [
        verifyUser,
        param('id').trim().notEmpty(),
        verifyPrototype,
        body('workspaceId')
            .trim()
            .notEmpty()
            .withMessage('Workspace ID is required.'),
        body('livePrototypePublicPassword').trim(),
        body('livePrototypePublic')
            .isBoolean({ strict: true })
            .withMessage(
                'Live prototype public status must be a boolean value.'
            ),
        body('sharedWithUserIds').isArray(),
    ],
    handleUpdateSharing
);

/**
 * Handle password submission for a public live prototype.
 */
export async function handleLivePrototypePasswordSubmission(
    req: Request<{ id: string }, {}, { password: string }>,
    res: Response<APIResponse & { url?: string }>
) {
    if (handleValidationErrors(req, res)) return;
    // Get the prototype
    const prototypeId = req.params.id;
    const prototypeData = await getPrototypeById(prototypeId);
    if (!prototypeData) {
        res.status(404).render('prototype-not-found.njk', {
            insideIframe: false,
        });
        return;
    }

    // Check if the prototype is public
    if (!prototypeData.livePrototypePublic) {
        res.status(403).json({
            message: 'This prototype is not public.',
        });
        return;
    }

    // Check if the password matches
    if (req.body.password !== prototypeData.livePrototypePublicPassword) {
        res.status(403).json({
            message: 'Incorrect password for this prototype.',
        });
        return;
    }

    // Store the password in the session
    req.session.livePrototypePasswords ??= {};
    req.session.livePrototypePasswords[prototypeId] = req.body.password;
    res.status(200).json({
        message: 'Password accepted.',
        url: `/prototype/${prototypeId}/start`,
    });
}
prototypeRouter.post(
    '/prototype/:id/password',
    [
        param('id').trim().notEmpty(),
        body('password').trim().notEmpty().withMessage('Enter a password.'),
    ],
    handleLivePrototypePasswordSubmission
);

/**
 * Handle the user submitting an answer to a prototype question.
 */
export function handlePrototypeSubmitQuestion(
    req: Request<{ id: string; page: string }, {}, Record<string, string>>,
    res: Response
) {
    if (handleValidationErrors(req, res)) return;
    // Get the prototype
    const prototypeData = (
        req as unknown as Request & { prototypeData: IPrototypeData }
    ).prototypeData;
    const prototypeId = prototypeData.id;

    // Check if liveData is present in the session
    req.session.liveData ??= {};

    // Update the liveData for the prototypeId with the request body
    req.session.liveData[prototypeId] = {
        ...req.session.liveData[prototypeId],
        ...req.body,
    };

    // Validate the question page number
    const questions = prototypeData.json.questions;
    const pageNumber = req.params.page;
    const questionNumber = Number.parseInt(pageNumber.split('-')[1], 10);
    if (
        Number.isNaN(questionNumber) ||
        questionNumber < 1 ||
        questionNumber > questions.length
    ) {
        res.status(404).render('page-not-found.njk', {
            insideIframe: req.header('sec-fetch-dest') === 'iframe',
        });
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
            req.session.liveData[prototypeId][
                `question-${String(questionNumber)}`
            ];
        const userAnswerOption = question.options_branching?.find(
            (option) => option.text_value === userAnswer
        );
        if (userAnswer === undefined || userAnswerOption === undefined) {
            res.redirect(
                `/prototype/${prototypeId}/question-${String(questionNumber)}`
            );
            return;
        }

        // Redirect based on the next_question_value of the selected option
        if (userAnswerOption.next_question_value === -1) {
            res.redirect(`/prototype/${prototypeId}/check-answers`);
        } else {
            res.redirect(
                `/prototype/${prototypeId}/question-${String(
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
        res.redirect(`/prototype/${prototypeId}/check-answers`);
    } else {
        // Send to the next question in sequence
        res.redirect(
            `/prototype/${prototypeId}/question-${String(question.next_question_value ?? questionNumber + 1)}`
        );
    }
}
prototypeRouter.post(
    '/prototype/:id/:page/submit',
    [param('*').trim().notEmpty(), verifyLivePrototype],
    handlePrototypeSubmitQuestion
);

/**
 * Render the prototype page for a specific prototype and page.
 */
export function renderPrototypePage(
    req: Request<{ id: string; page: string }, {}, Record<string, string>>,
    res: Response
) {
    if (handleValidationErrors(req, res)) return;
    // Get the prototype
    const prototypeData = (
        req as unknown as Request & { prototypeData: IPrototypeData }
    ).prototypeData;
    const prototypeId = prototypeData.id;

    // Validate the page
    const validPages = ['start', 'check-answers', 'confirmation'];
    for (let i = 0; i < prototypeData.json.questions.length; i++) {
        validPages.push(`question-${String(i + 1)}`);
    }
    const page = req.params.page;
    if (!validPages.includes(page)) {
        res.status(404).render('page-not-found.njk', {
            insideIframe: req.header('sec-fetch-dest') === 'iframe',
        });
        return;
    }

    // Create the live data and history if it doesn't exist
    req.session.liveData ??= {};
    req.session.liveData[prototypeId] ??= {};
    req.session.livePrototypeHistory ??= {};
    req.session.livePrototypeHistory[prototypeId] ??= [];

    // Generate the page content based on the page number
    const urlPrefix = `prototype/${prototypeId}`;
    const designSystem = prototypeData.designSystem;
    const showDemoWarning = true;
    let pageContent;
    if (page === 'start') {
        pageContent = generateStartPage(
            prototypeData.json,
            urlPrefix,
            designSystem,
            showDemoWarning
        );
    } else if (page === 'check-answers') {
        pageContent = generateCheckAnswersPage(
            prototypeData.json,
            urlPrefix,
            designSystem,
            showDemoWarning
        );
    } else if (page === 'confirmation') {
        // Reset live data and history on confirmation
        req.session.liveData[prototypeId] = {};
        req.session.livePrototypeHistory[prototypeId] = [];
        pageContent = generateConfirmationPage(
            prototypeData.json,
            designSystem,
            showDemoWarning
        );
    } else {
        const questionIndex = Number.parseInt(page.split('-')[1], 10) - 1;
        pageContent = generateQuestionPage(
            prototypeData.json,
            urlPrefix,
            questionIndex,
            designSystem,
            showDemoWarning
        );
    }

    // If the user clicked back then remove the last URL, otherwise add the current URL
    // Don't add the confirmation page; we clear it here earlier
    if (req.query.back) {
        req.session.livePrototypeHistory[prototypeId].pop();
    } else if (
        page !== 'confirmation' &&
        req.session.livePrototypeHistory[prototypeId].at(-1) !== req.url
    ) {
        req.session.livePrototypeHistory[prototypeId].push(req.url);
    }

    // Get the back link
    let backLinkHref: string | undefined;
    if (req.session.livePrototypeHistory[prototypeId].length >= 2) {
        // Add a get param to the back link URL to indicate navigation source
        const prevUrl = req.session.livePrototypeHistory[prototypeId].at(-2);
        if (prevUrl) {
            const url = new URL(prevUrl, `${req.protocol}://${req.host}`); // base needed for parsing
            url.searchParams.set('back', 'true');
            backLinkHref = url.pathname + url.search;
        }
    }

    // Incorporate the base template into the page content and render it
    const assetPath = '/assets';
    const baseTemplate = generateBasePage(assetPath, designSystem);
    res.send(
        nunjucks.renderString(
            pageContent.replace('{% extends "form-base.njk" %}', baseTemplate),
            {
                backLinkHref: backLinkHref,
                data: req.session.liveData[prototypeId] ?? {},
            }
        )
    );
}
prototypeRouter.all(
    '/prototype/:id/:page',
    [param('*').trim().notEmpty(), verifyLivePrototype],
    renderPrototypePage
);

/**
 * Render the results page for a prototype.
 */
export async function renderResultsPage(
    req: Request<{ id: string }>,
    res: Response
) {
    if (handleValidationErrors(req, res)) return;
    // Get the prototype
    const prototypeData = (
        req as unknown as Request & { prototypeData: IPrototypeData }
    ).prototypeData;
    const user = (req as unknown as Request & { user: IUser }).user;

    // Get the previous prototypes
    const allPreviousPrototypes = await getPreviousPrototypes(
        prototypeData.id,
        user.id
    );
    const previousPrototypes = allPreviousPrototypes.slice(
        0,
        NUMBER_OF_PREVIOUS_PROTOTYPES_TO_SHOW
    );
    const totalCountPreviousPrototypes = allPreviousPrototypes.length;
    const additionalCountPreviousPrototypes =
        totalCountPreviousPrototypes - previousPrototypes.length;
    const parseByAndWhen = async (userId: string, timestamp: string) => {
        const creator =
            userId === user.id
                ? 'you'
                : ((await getUserById(userId))?.name ?? 'an unknown user');
        return `${creator.replace(/\s/g, '&nbsp;')} ${moment(timestamp).fromNow().replace(/\s/g, '&nbsp;')}`;
    };
    const previousPrototypesRows = await Promise.all(
        previousPrototypes.map(async (prototype) => {
            return [
                {
                    html: `<a href="/prototype/${prototype.id}">${prototype.changesMade}</a> by&nbsp;${await parseByAndWhen(prototype.creatorUserId, prototype.timestamp)}.`,
                },
            ];
        })
    );
    previousPrototypesRows.unshift([
        {
            html: `${prototypeData.changesMade} by&nbsp;${await parseByAndWhen(prototypeData.creatorUserId, prototypeData.timestamp)} (this&nbsp;version).`,
        },
    ]);

    // Get sharing data
    const isOwner = await canUserAccessWorkspace(
        user.id,
        prototypeData.workspaceId
    );
    const sharedWithUsers: IUser[] = [];
    for (const userId of prototypeData.sharedWithUserIds) {
        const user = await getUserById(userId);
        if (user) {
            sharedWithUsers.push(user);
        }
    }
    const generateWorkspaceName = (ws: IWorkspace) => {
        if (ws.isPersonalWorkspace) {
            return `${ws.name} (private)`;
        } else {
            return `${ws.name} (${ws.userIds.length === 1 ? 'just you' : String(ws.userIds.length) + ' users'})`;
        }
    };
    const allWorkspaces = isOwner
        ? (await getWorkspacesByUserId(user.id)).map((ws) => ({
              selected: ws.id === prototypeData.workspaceId,
              text: generateWorkspaceName(ws),
              value: ws.id,
          }))
        : [
              {
                  selected: true,
                  text:
                      (await getWorkspaceById(prototypeData.workspaceId))
                          ?.name ?? 'Unknown',
                  value: prototypeData.workspaceId,
              },
          ];

    //Remove explanation and suggestions from json editor
    let rawData: IPrototypeData;
    try {
        rawData = (
            prototypeData as unknown as Document
        ).toObject() as IPrototypeData;
    } catch {
        rawData = prototypeData; // fallback if toObject() is missing
    }
    const maskedJson = { ...rawData.json };
    delete maskedJson.changes_made;
    delete maskedJson.explanation;
    delete maskedJson.suggestions;

    const data: ResultsTemplatePayload = {
        additionalCountPreviousPrototypes: additionalCountPreviousPrototypes,
        allUsers: isOwner
            ? (await getAllUsers()).filter((u) => u._id !== user._id)
            : [],
        allWorkspaces: allWorkspaces,
        designSystem: prototypeData.designSystem,
        enableSuggestions: getEnvironmentVariables().SUGGESTIONS_ENABLED,
        explanation: prototypeData.json.explanation,
        firstPrompt: prototypeData.firstPrompt,
        isLivePrototypePublic: prototypeData.livePrototypePublic,
        isOwner: isOwner,
        json: prototypeData.json,
        jsonSchema: JSON.stringify(
            getFormSchemaForJsonInputValidation(formSchema)
        ).replace(/\\"/g, '\\\\"'),
        jsonText: JSON.stringify(maskedJson, null, 2)
            .replace(/\\"/g, '\\\\"')
            .replace(/`/g, `\\\``),
        livePrototypePublicPassword: prototypeData.livePrototypePublicPassword,
        livePrototypeUrl: `/prototype/${prototypeData.id}/start`,
        previousPrototypesRows: previousPrototypesRows,
        prototypeId: prototypeData.id,
        prototypeTitle: prototypeData.json.title,
        sharedWithUsers: sharedWithUsers,
        showJsonPrompt: prototypeData.generatedFrom === 'json',
        timestamp: prototypeData.timestamp,
        totalCountPreviousPrototypes: totalCountPreviousPrototypes,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        workspace: (await getWorkspaceById(prototypeData.workspaceId))!,
    };

    res.render('results.njk', data);
}
prototypeRouter.get(
    '/prototype/:id',
    [verifyUser, param('id').trim().notEmpty(), verifyPrototype],
    renderResultsPage
);

/**
 * Update an existing prototype from the provided form data.
 */
export async function handleUpdatePrototype(
    req: Request<{}, {}, UpdateFormRequestBody>,
    res: Response<APIResponse & { url?: string }>
) {
    if (handleValidationErrors(req, res)) return;
    let responseText: string;
    let prompt = req.body.prompt;
    const user = (req as unknown as Request & { user: IUser }).user;

    // Get the old prototype data
    const oldPrototypeId = req.body.prototypeId;
    const oldPrototypeData = await getPrototypeById(oldPrototypeId);
    if (
        !oldPrototypeData ||
        !(await canUserAccessPrototype(user.id, oldPrototypeData.id))
    ) {
        const secFetchDest = req.header('sec-fetch-dest');
        if (secFetchDest === 'empty') {
            res.status(404).json({ message: 'Prototype not found' });
            return;
        }
        res.status(404).render('prototype-not-found.njk', {
            insideIframe: secFetchDest === 'iframe',
        });
        return;
    }

    // Set the design system
    let designSystem = req.body.designSystem as PrototypeDesignSystemsType;
    if (!PrototypeDesignSystems.includes(designSystem)) {
        designSystem = DefaultPrototypeDesignSystem;
    }

    // Update the form if a prompt is provided, otherwise just update the design system
    if (prompt) {
        responseText = await updateFormWithOpenAI(
            getEnvironmentVariables(),
            prompt,
            oldPrototypeData.json,
            designSystem,
            getEnvironmentVariables().SUGGESTIONS_ENABLED
        );
        // Replace escaped quotes with smart quotes and ensure backslashes are escaped
        responseText = responseText
            .replace(/\\"/g, '“')
            .replace(/(?<!\\)\\(?!\\)/g, '\\\\');
    } else {
        const newJson = structuredClone(oldPrototypeData.json);
        newJson.changes_made = `Updated design system to ${designSystem}`;
        newJson.explanation = `The design system has been updated to ${designSystem}.`;
        responseText = JSON.stringify(newJson);
        prompt = `Update the design system to ${designSystem}.`;
    }

    // Parse and validate the JSON response
    const templateData = validateTemplateDataText(
        responseText,
        prompt.startsWith('Update the design system to ')
            ? getFormSchemaForJsonInputValidation(formSchema)
            : formSchema
    );

    // Use the provided workspace ID or default to the user's private workspace
    let workspaceId = req.body.workspaceId;
    if (!(await canUserAccessWorkspace(user.id, workspaceId))) {
        workspaceId = user.personalWorkspaceId;
    }

    // Store both the JSON and template code
    const timestamp = new Date().toISOString();

    // Create new prototype
    const prototype = await storePrototype({
        changesMade: templateData.changes_made ?? 'Updated prototype',
        creatorUserId: user.id,
        designSystem: designSystem,
        firstPrompt: oldPrototypeData.firstPrompt,
        generatedFrom: 'text',
        json: templateData,
        livePrototypePublic: false,
        livePrototypePublicPassword: '',
        previousId: oldPrototypeId,
        prompt: prompt,
        sharedWithUserIds: [...new Set(oldPrototypeData.sharedWithUserIds)],
        timestamp: timestamp,
        workspaceId: workspaceId,
    });
    res.status(201).json({
        message: 'Prototype updated successfully',
        url: `/prototype/${prototype.id}`,
    });
}
prototypeRouter.post(
    '/update',
    [
        verifyUser,
        body('designSystem')
            .trim()
            .notEmpty()
            .withMessage('Select a design system.'),
        body('prompt').trim(),
        body('prototypeId')
            .trim()
            .notEmpty()
            .withMessage('Prototype ID is required.'),
        body('workspaceId')
            .trim()
            .notEmpty()
            .withMessage('Workspace ID is required.'),
    ],
    handleUpdatePrototype
);

/**
 * Create a prototype from the provided form data.
 */
export async function handleCreatePrototype(
    req: Request<{}, {}, CreateFormRequestBody>,
    res: Response<APIResponse & { url?: string }>
) {
    if (handleValidationErrors(req, res)) return;
    let responseText: string;
    const prompt = req.body.prompt;
    const promptType = req.body.promptType === 'json' ? 'json' : 'text';
    const user = (req as unknown as Request & { user: IUser }).user;

    // Set the design system
    let designSystem = req.body.designSystem as PrototypeDesignSystemsType;
    if (!PrototypeDesignSystems.includes(designSystem)) {
        designSystem = DefaultPrototypeDesignSystem;
    }

    // If a JSON prompt is provided, use that
    let oldPrototypeData: IPrototypeData | undefined;
    if (promptType === 'json') {
        responseText = prompt;

        // Get the old prototype using the prototypeId if provided, to copy the shared users
        oldPrototypeData =
            (await getPrototypeById(req.body.prototypeId ?? '')) ?? undefined;

        // Otherwise, prompt the OpenAI API
    } else {
        responseText = await createFormWithOpenAI(
            getEnvironmentVariables(),
            prompt,
            designSystem,
            getEnvironmentVariables().SUGGESTIONS_ENABLED
        );
        // Replace escaped quotes with smart quotes and ensure backslashes are escaped
        responseText = responseText
            .replace(/\\"/g, '“')
            .replace(/(?<!\\)\\(?!\\)/g, '\\\\');
    }

    try {
        // Parse and validate the JSON response
        const templateData = validateTemplateDataText(
            responseText,
            promptType === 'json'
                ? getFormSchemaForJsonInputValidation(formSchema)
                : formSchema
        );

        // Use the provided workspace ID or default to the user's private workspace
        let workspaceId = req.body.workspaceId;
        if (!(await canUserAccessWorkspace(user.id, workspaceId))) {
            workspaceId = user.personalWorkspaceId;
        }

        // Store both the JSON and template code
        const timestamp = new Date().toISOString();
        const prototype = await storePrototype({
            changesMade:
                promptType === 'text'
                    ? 'Created prototype'
                    : 'Updated prototype JSON',
            creatorUserId: user.id,
            designSystem: designSystem,
            firstPrompt: prompt,
            generatedFrom: promptType,
            json: templateData,
            livePrototypePublic: false,
            livePrototypePublicPassword: '',
            previousId: req.body.prototypeId,
            prompt: promptType === 'text' ? prompt : undefined,
            sharedWithUserIds: oldPrototypeData
                ? [...new Set(oldPrototypeData.sharedWithUserIds)]
                : [],
            timestamp: timestamp,
            workspaceId: workspaceId,
        });
        res.status(201).json({
            message: 'Prototype created successfully',
            url: `/prototype/${prototype.id}`,
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (jsonError: any) {
        const activeSpan = opentelemetry.trace.getActiveSpan();
        if (activeSpan) {
            const error = jsonError as {
                message?: string;
                name?: string;
                stack?: string;
            };
            activeSpan.setAttribute('error.name', error.name ?? '');
            activeSpan.setAttribute('error.message', error.message ?? '');
            activeSpan.setAttribute('error.stack', error.stack ?? '');
        }
        // If the JSON did not parse correctly, show the error
        if (promptType === 'json') {
            res.status(400).json({
                message: prepareJsonValidationErrorMessage(jsonError as Error),
            });
        } else {
            throw jsonError;
        }
        return;
    }
}
prototypeRouter.post(
    '/create',
    [
        verifyUser,
        body('designSystem')
            .trim()
            .notEmpty()
            .withMessage('Select a design system.'),
        body('prompt').trim().notEmpty().withMessage('Enter a prompt.'),
        body('promptType').trim(),
        body('prototypeId').trim(),
        body('workspaceId')
            .trim()
            .notEmpty()
            .withMessage('Workspace ID is required.'),
    ],
    handleCreatePrototype
);

export { prototypeRouter };

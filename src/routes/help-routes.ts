import express, { Request, Response } from 'express';
import { param } from 'express-validator';
import fs from 'fs';
import path from 'path';

import helpFiles from '../../docs/help/help-files.json';
import { handleValidationErrors } from '../utils';
import { verifyUser } from './middleware';

// file deepcode ignore NoRateLimitingForExpensiveWebOperation: Main server.ts file contains Rate Limiting configuration for application.
// Create an Express router
const helpRouter = express.Router();

// Redirect the root of the help route to the first help file
export function redirectToFirstHelpFile(req: Request, res: Response) {
    res.redirect(`/help/${helpFiles.help_files[0].filename}`);
}
helpRouter.get('/', verifyUser, redirectToFirstHelpFile);

/**
 * Render individual help files.
 */
export function renderHelpFile(
    req: Request<{ filename: string }>,
    res: Response
) {
    if (handleValidationErrors(req, res)) return;
    // Check if the filename exists in the help files
    const filename = req.params.filename;
    const helpFile = helpFiles.help_files.find(
        (file) => file.filename === filename
    );

    // If the file does not exist, return a 404 error
    if (!helpFile) {
        res.status(404).render('page-not-found.njk', {
            insideIframe: req.header('sec-fetch-dest') === 'iframe',
        });
        return;
    }

    // Get the navigation for the help files
    const tableOfContents = helpFiles.help_files.map((file) => ({
        current: file.filename === filename,
        title: file.title,
        url: `/help/${file.filename}`,
    }));
    const nextFileIndex =
        helpFiles.help_files.findIndex((file) => file.filename === filename) +
        1;
    const nextFile =
        nextFileIndex < helpFiles.help_files.length
            ? helpFiles.help_files[nextFileIndex]
            : undefined;
    const previousFileIndex =
        helpFiles.help_files.findIndex((file) => file.filename === filename) -
        1;
    const previousFile =
        previousFileIndex >= 0
            ? helpFiles.help_files[previousFileIndex]
            : undefined;
    const pagination = {
        next: nextFile
            ? {
                  href: `/help/${nextFile.filename}`,
                  labelText: nextFile.title,
              }
            : undefined,
        previous: previousFile
            ? {
                  href: `/help/${previousFile.filename}`,
                  labelText: previousFile.title,
              }
            : undefined,
    };

    // Read the content of the help file
    const helpFilePath = path.resolve(
        __dirname,
        '../../docs/help',
        `${helpFile.filename}.md`
    );
    const helpFileMarkdown = fs.readFileSync(helpFilePath, 'utf-8');

    // Render the help file using Nunjucks
    res.render('help.njk', {
        helpFileMarkdown: helpFileMarkdown,
        pagination: pagination,
        tableOfContents: tableOfContents,
        title: helpFile.title,
    });
}
helpRouter.get(
    '/:filename',
    verifyUser,
    param('filename')
        .isString()
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage('Invalid filename format'),
    renderHelpFile
);

export { helpRouter };

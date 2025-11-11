import express, { NextFunction, Request, Response } from 'express';
import path from 'node:path';

import { getContentType, getHmrcAssetsVersion } from '../utils';

export function setupStaticAssets(app: express.Express, dirname: string) {
    // Serve the Ace code editor
    app.use(
        '/assets/ace-editor-src-min',
        express.static(path.join(dirname, 'node_modules/ace-builds/src-min'))
    );

    // Serve GOV.UK CSS and JS assets
    const govukAssets = [
        'govuk-frontend.min.css',
        'govuk-frontend.min.css.map',
        'govuk-frontend.min.js',
        'govuk-frontend.min.js.map',
    ];

    for (const file of govukAssets) {
        app.use(
            `/assets/${file}`,
            (req: Request, res: Response, next: NextFunction) => {
                res.type(getContentType(file));
                next();
            },
            express.static(
                path.join(
                    dirname,
                    'node_modules/govuk-frontend/dist/govuk',
                    file
                )
            )
        );
    }

    // Serve GOV.UK fonts and images
    app.use(
        '/assets',
        express.static(
            path.join(dirname, 'node_modules/govuk-frontend/dist/govuk/assets')
        )
    );

    // Serve HMRC CSS and JS assets
    const hmrcVersion = getHmrcAssetsVersion();
    const hmrcAssets = [
        `hmrc-frontend-${hmrcVersion}.min.css`,
        `hmrc-frontend-${hmrcVersion}.min.js`,
    ];
    for (const file of hmrcAssets) {
        app.use(
            `/assets/${file}`,
            (req: Request, res: Response, next: NextFunction) => {
                res.type(getContentType(file));
                next();
            },
            express.static(
                path.join(dirname, 'node_modules/hmrc-frontend/hmrc', file)
            )
        );
    }

    // Serve HMRC GOV.UK assets where the HMRC CSS expects them
    app.use('/assets/govuk', (req: Request, res: Response) => {
        res.redirect(301, `/assets${req.path}`);
    });

    // Serve local assets
    app.use('/assets', express.static(path.join(dirname, 'public')));
}

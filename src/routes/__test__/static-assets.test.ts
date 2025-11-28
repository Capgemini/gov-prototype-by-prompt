import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';

import { setupStaticAssets } from '../static-assets';

describe('setupStaticAssets', () => {
    const dirname = path.resolve(__dirname, '../../../');

    const aceEditorPath = path.join(dirname, 'node_modules/ace-builds/src-min');
    const aceLintersPath = path.join(dirname, 'node_modules/ace-linters/build');
    const govukDir = path.join(
        dirname,
        'node_modules/govuk-frontend/dist/govuk'
    );
    const hmrcDir = path.join(dirname, 'node_modules/hmrc-frontend/hmrc');

    it('Ace Editor directory exists', () => {
        expect(fs.existsSync(aceEditorPath)).toBe(true);
    });

    it('Ace Linters directory exists', () => {
        expect(fs.existsSync(aceLintersPath)).toBe(true);
    });

    it('GOV.UK CSS and JS assets exist', () => {
        const files = [
            'govuk-frontend.min.css',
            'govuk-frontend.min.css.map',
            'govuk-frontend.min.js',
            'govuk-frontend.min.js.map',
        ];
        for (const file of files) {
            expect(fs.existsSync(path.join(govukDir, file))).toBe(true);
        }
    });

    it('GOV.UK assets directory exists', () => {
        expect(fs.existsSync(path.join(govukDir, 'assets'))).toBe(true);
    });

    it('HMRC CSS and JS assets exist', () => {
        const hmrcAssets = fs
            .readdirSync(hmrcDir)
            .filter((file) =>
                /^hmrc-frontend-\d+\.\d+\.\d+\.min\.(css|js)$/.test(file)
            );
        for (const file of hmrcAssets) {
            expect(fs.existsSync(path.join(hmrcDir, file))).toBe(true);
        }
    });

    it('HMRC govuk assets directory exists', () => {
        expect(fs.existsSync(path.join(hmrcDir, 'govuk'))).toBe(true);
    });

    it.each([
        'ace-editor-src-min/ace.js',
        'ace-editor-src-min/ext-language_tools.js',
        'ace-linters/ace-linters.js',
        'govuk-frontend.min.css',
        'govuk-frontend.min.js',
        'manifest.json',
        'images/favicon.ico',
    ])('serves static asset named: %s', async (file) => {
        const app = express();
        setupStaticAssets(app, dirname);

        const res = await request(app).get(`/assets/${file}`);
        expect(res.statusCode).toBe(200);
        expect(Number(res.header['content-length'])).toBeGreaterThan(0);
    });

    it.each([
        /^hmrc-frontend-\d+\.\d+\.\d+\.min\.css$/,
        /^hmrc-frontend-\d+\.\d+\.\d+\.min\.js$/,
    ])('serves static asset matching regex: %s', async (regex) => {
        // Find the first file that matches the regex
        const file = fs.readdirSync(hmrcDir).find((file) => regex.test(file));
        expect(file).toBeDefined();

        // Create a new Express app and setup static assets
        const app = express();
        setupStaticAssets(app, dirname);

        // Assert that the file can be served
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const res = await request(app).get(`/assets/${file!}`);
        expect(res.statusCode).toBe(200);
        expect(Number(res.header['content-length'])).toBeGreaterThan(0);
    });

    it.each(['govuk/manifest.json', 'govuk/images/favicon.ico'])(
        'redirects to static asset: %s',
        async (file) => {
            const app = express();
            setupStaticAssets(app, dirname);

            const res = await request(app).get(`/assets/${file}`);
            expect(res.statusCode).toBe(301);
            expect(Number(res.header['content-length'])).toBeGreaterThan(0);
        }
    );
});

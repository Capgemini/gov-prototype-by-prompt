import { downloadZip, InputWithSizeMeta } from 'client-zip';
import * as fs from 'node:fs';

import zipDownloadPackageLockJson from '../data/zip-download/package-lock.json';
import zipDownloadPackageJson from '../data/zip-download/package.json';
import {
    generateBasePage,
    generateCheckAnswersPage,
    generateConfirmationPage,
    generateQuestionPage,
    generateStartPage,
} from './form-generator';
import { PrototypeDesignSystemsType, TemplateData } from './types';
import { getHmrcAssetsVersion } from './utils';

/**
 * Builds a zip file of a multi-page form from the prototype data.
 * @param {TemplateData} templateData The template data containing the form details.
 * @param {string} urlPrefix The URL prefix for the prototype, typically the prototype ID.
 * @param {PrototypeDesignSystemsType} designSystem The design system to use for the prototype.
 * @param {string} author The author of the prototype.
 * @returns {Promise<Blob>} A promise that resolves to a Blob containing the zip file.
 */
export async function buildZipOfForm(
    templateData: TemplateData,
    urlPrefix: string,
    designSystem: PrototypeDesignSystemsType,
    author: string
): Promise<Blob> {
    // Get all the files
    const files: InputWithSizeMeta[] = [
        ...generateZipOfApp(urlPrefix, author, templateData.title),
        ...generateZipOfAssets(designSystem),
        ...generateZipOfForm(templateData, urlPrefix, designSystem),
        {
            input: JSON.stringify(templateData, null, 2),
            name: `${urlPrefix}.json`,
        },
    ];

    // Set last modified time to now for all files
    const now = Date.now();
    for (const file of files) {
        file.lastModified = now;
    }

    return downloadZip(files).blob();
}

/**
 * Generates a zip file of the app's source code and configuration files to run the prototype.
 * @param {string} urlPrefix The URL prefix for the prototype, typically the prototype ID.
 * @param {string} author The author of the prototype.
 * @param {string} title The title of the prototype.
 * @returns {InputWithSizeMeta[]} An array of files ready to be zipped.
 */
function generateZipOfApp(
    urlPrefix: string,
    author: string,
    title: string
): InputWithSizeMeta[] {
    const files: InputWithSizeMeta[] = [
        {
            input: fs.readFileSync('./data/zip-download/.gitignore'),
            name: '.gitignore',
        },
        {
            input: fs.readFileSync('./data/zip-download/.nvmrc'),
            name: '.nvmrc',
        },
        {
            input: fs.readFileSync('./src/filters.ts'),
            name: 'filters.ts',
        },
        {
            input: fs.readFileSync('./data/zip-download/d.ts'),
            name: 'd.ts',
        },
        {
            input: fs.readFileSync('./data/zip-download/tsconfig.json'),
            name: 'tsconfig.json',
        },
    ];

    // Read README.md, replace 'your-prototype' with urlPrefix, and add to files
    let readmeContent = fs.readFileSync(
        './data/zip-download/README.md',
        'utf8'
    );
    readmeContent = readmeContent.replace(/your-prototype/g, urlPrefix);
    files.push({
        input: readmeContent,
        name: 'README.md',
    });

    // Read server.ts, replace 'your-prototype' with urlPrefix, and add to files
    let serverContent = fs.readFileSync(
        './data/zip-download/server.ts',
        'utf8'
    );
    serverContent = serverContent.replace(/your-prototype/g, urlPrefix);
    files.push({
        input: serverContent,
        name: 'server.ts',
    });

    // Add the package.json with the correct name, author, and description
    const packageJson = structuredClone(zipDownloadPackageJson);
    packageJson.name = urlPrefix;
    packageJson.author = author;
    packageJson.description = `Prototype of a UK Government form "${title}", created using Gov Prototype by Prompt.`;
    files.push({
        input: JSON.stringify(packageJson, null, 2),
        name: 'package.json',
    });

    // Add the package-lock.json with the correct name
    const packageLockJson = structuredClone(zipDownloadPackageLockJson);
    packageLockJson.name = urlPrefix;
    packageLockJson.packages[''].name = urlPrefix;
    files.push({
        input: JSON.stringify(packageLockJson, null, 2),
        name: 'package-lock.json',
    });

    return files;
}

/**
 * Generates a zip file containing the assets needed for the GOV.UK frontend.
 * @param {PrototypeDesignSystemsType} designSystem The design system to use for the prototype
 * @returns {InputWithSizeMeta[]} An array of files representing the assets needed for the GOV.UK frontend.
 */
function generateZipOfAssets(
    designSystem: PrototypeDesignSystemsType
): InputWithSizeMeta[] {
    const files: InputWithSizeMeta[] = [];

    // Recursively add all files in dir to the files array at base
    function addFilesRecursively(dir: string, base: string) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = `${dir}${entry.name}`;
            const relativePath = `${base}${entry.name}`;
            if (entry.isFile()) {
                const fileContent = fs.readFileSync(fullPath);
                files.push({
                    input: fileContent,
                    name: relativePath,
                });
            } else if (entry.isDirectory()) {
                addFilesRecursively(`${fullPath}/`, `${relativePath}/`);
            }
        }
    }

    // Add form.js
    files.push({
        input: fs.readFileSync('./public/js/form.js'),
        name: 'assets/js/form.js',
    });

    // Add the GOV.UK CSS and JS assets
    const govukAssets = [
        'govuk-frontend.min.css',
        'govuk-frontend.min.css.map',
        'govuk-frontend.min.js',
        'govuk-frontend.min.js.map',
    ];
    for (const file of govukAssets) {
        files.push({
            input: fs.readFileSync(
                `./node_modules/govuk-frontend/dist/govuk/${file}`
            ),
            name: `assets/${file}`,
        });
    }

    // Add the GOV.UK fonts and images
    addFilesRecursively(
        './node_modules/govuk-frontend/dist/govuk/assets/',
        'assets/'
    );

    // Add HMRC CSS and JS assets
    if (designSystem === 'HMRC') {
        const hmrcVersion = getHmrcAssetsVersion();
        const hmrcAssets = [
            `hmrc-frontend-${hmrcVersion}.min.css`,
            `hmrc-frontend-${hmrcVersion}.min.js`,
        ];
        for (const file of hmrcAssets) {
            files.push({
                input: fs.readFileSync(
                    `./node_modules/hmrc-frontend/hmrc/${file}`
                ),
                name: `assets/${file}`,
            });
        }
    }

    return files;
}

/**
 * Converts a multi-page form template into a zip file.
 * @param {TemplateData} templateData The template data containing the form details.
 * @param {string} urlPrefix The URL prefix for the prototype, typically the prototype ID.
 * @param {PrototypeDesignSystemsType} designSystem The design system to use for the prototype
 * @returns {InputWithSizeMeta[]} An array of files ready to be zipped.
 */
function generateZipOfForm(
    templateData: TemplateData,
    urlPrefix: string,
    designSystem: PrototypeDesignSystemsType
): InputWithSizeMeta[] {
    const showDemoWarning = false;
    const assetPath = '/assets';
    const files: InputWithSizeMeta[] = [
        {
            input: generateBasePage(assetPath, designSystem),
            name: `views/form-base.njk`,
        },
        {
            input: generateStartPage(
                templateData,
                urlPrefix,
                designSystem,
                showDemoWarning
            ),
            name: `views/${urlPrefix}/start.njk`,
        },
    ];
    for (let i = 0; i < templateData.questions.length; i++) {
        files.push({
            input: generateQuestionPage(
                templateData,
                urlPrefix,
                i,
                designSystem,
                showDemoWarning
            ),
            name: `views/${urlPrefix}/question-${String(i + 1)}.njk`,
        });
    }
    files.push(
        {
            input: generateCheckAnswersPage(
                templateData,
                urlPrefix,
                designSystem,
                showDemoWarning
            ),
            name: `views/${urlPrefix}/check-answers.njk`,
        },
        {
            input: generateConfirmationPage(
                templateData,
                designSystem,
                showDemoWarning
            ),
            name: `views/${urlPrefix}/confirmation.njk`,
        }
    );

    return files;
}

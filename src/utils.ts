import { Request, Response } from 'express';
import {
    ValidationError as ExpressValidationError,
    validationResult,
} from 'express-validator';
import format from 'html-format';
import { ValidationError, Validator, ValidatorResultError } from 'jsonschema';
import fs from 'node:fs';

import commonPasswords from '../data/valid-common-passwords.json';
import { EnvironmentVariables, JsonSchema, TemplateData } from './types';
import { envVarSchema } from './validationSchemas/env';

/**
 * Formats an HTML string to be more readable.
 * @param {string} html The HTML string to be formatted.
 * @returns {string} The formatted HTML string.
 */
export function formatHtml(html: string): string {
    return format(html, '  ', 999999);
}

/**
 * Generate pagination objects for the GOV.UK pagination component.
 * See https://design-system.service.gov.uk/components/pagination/.
 * @param {number} page The current page, starting from 1.
 * @param {number} perPage The number of items per page.
 * @param {number} totalPages The total number of pages available.
 * @param {string} baseUrl The base URL to use for pagination links.
 * @returns {object} An object containing previous and next pagination links and items.
 */
export function generatePagination(
    page: number,
    perPage: number,
    totalPages: number,
    baseUrl: string
): {
    paginationItems: object[];
    paginationNextHref: string;
    paginationPreviousHref: string;
} {
    const paginationPreviousHref =
        page > 1
            ? `${baseUrl}&page=${String(page - 1)}&perPage=${String(perPage)}`
            : '';
    const paginationNextHref =
        page < totalPages
            ? `${baseUrl}&page=${String(page + 1)}&perPage=${String(perPage)}`
            : '';
    let paginationItems: object[] = [];
    if (totalPages <= 5) {
        // Show all pages if total pages are 5 or less
        paginationItems = Array.from({ length: totalPages }, (_, i) => ({
            current: i + 1 === page,
            href: `${baseUrl}&page=${String(i + 1)}&perPage=${String(perPage)}`,
            number: i + 1,
        }));
    } else {
        // Otherwise show first, last, and current page with ellipsis
        paginationItems = [
            {
                current: page === 1,
                href: `${baseUrl}&page=1&perPage=${String(perPage)}`,
                number: 1,
            },
            ...(page > 3 ? [{ ellipsis: true }] : []),
            ...(page > 2
                ? [
                      {
                          current: false,
                          href: `${baseUrl}&page=${String(
                              page - 1
                          )}&perPage=${String(perPage)}`,
                          number: page - 1,
                      },
                  ]
                : []),
            ...(page > 1 && page < totalPages
                ? [
                      {
                          current: true,
                          href: `${baseUrl}&page=${String(page)}&perPage=${String(perPage)}`,
                          number: page,
                      },
                  ]
                : []),
            ...(page < totalPages - 1
                ? [
                      {
                          current: false,
                          href: `${baseUrl}&page=${String(
                              page + 1
                          )}&perPage=${String(perPage)}`,
                          number: page + 1,
                      },
                  ]
                : []),
            ...(totalPages - page > 2 ? [{ ellipsis: true }] : []),
            {
                current: page === totalPages,
                href: `${baseUrl}&page=${String(totalPages)}&perPage=${String(perPage)}`,
                number: totalPages,
            },
        ];
    }
    return {
        paginationItems,
        paginationNextHref,
        paginationPreviousHref,
    };
}

/**
 * Converts a given string into a slug format with letters, numbers, and dashes only.
 * @param {string} input The input string to be converted into a slug.
 * @returns {string} A slugified version of the input string.
 */
export function generateSlug(input: string): string {
    return input
        .toLowerCase() // Convert to lowercase
        .replace(/[^a-zA-Z0-9]+/g, '-') // Replace non-letters with dashes
        .replace(/-+/g, '-') // Collapse multiple dashes into one
        .replace(/(^-)|(-$)/g, ''); // Remove leading/trailing dashes
}

/**
 * Returns the content type for a given file based on its extension.
 * @param {string} file The filename to determine the content type for.
 * @returns {string} The content type for the file.
 */
export function getContentType(file: string): string {
    if (file.endsWith('.css')) {
        return 'text/css';
    } else if (file.endsWith('.js')) {
        return 'application/javascript';
    } else if (file.endsWith('.js.map') || file.endsWith('.css.map')) {
        return 'application/json';
    }
    return 'text/plain';
}

export function getEnvironmentVariables(): EnvironmentVariables {
    return envVarSchema.parse(process.env);
}

/**
 * Prepare the JSON schema for validation by removing 'null' types
 * and updating the required fields accordingly.
 * This is only used to validate the JSON input from the user, not from the LLM.
 * @param {JsonSchema} formSchema The JSON schema to prepare for validation.
 * @returns {JsonSchema} The modified JSON schema with 'null' types removed and required fields updated.
 */
export function getFormSchemaForJsonInputValidation(
    formSchema: JsonSchema
): JsonSchema {
    for (const key in formSchema.properties) {
        // If the property type is an array and includes 'null',
        // remove 'null' from the type array and update the required fields.
        const property = formSchema.properties[key];
        if (Array.isArray(property.type) && property.type.includes('null')) {
            property.type = property.type.filter(
                (type: string) => type !== 'null'
            );
            formSchema.required = formSchema.required.filter(
                (requiredField: string) => requiredField !== key
            );
        }

        // If the property has a type of 'object',
        // recursively call this function to prepare nested schemas.
        if (property.items?.type === 'object') {
            property.items = getFormSchemaForJsonInputValidation(
                property.items
            );
        }
    }

    return formSchema;
}

/**
 * Get the version of the HMRC frontend assets.
 * This reads the VERSION.txt file from the HMRC frontend package.
 * If the file does not exist, it throws an error.
 * @returns {string} The version of the HMRC frontend assets.
 */
let cachedHmrcAssetsVersion: null | string = null;
export function getHmrcAssetsVersion(): string {
    if (cachedHmrcAssetsVersion !== null) {
        return cachedHmrcAssetsVersion;
    }
    const versionFilePath = 'node_modules/hmrc-frontend/hmrc/VERSION.txt';
    if (fs.existsSync(versionFilePath)) {
        cachedHmrcAssetsVersion = fs
            .readFileSync(versionFilePath, 'utf8')
            .trim();
        return cachedHmrcAssetsVersion;
    }
    throw new Error('HMRC frontend assets version file not found');
}

export function handleValidationErrors(req: Request, res: Response): boolean {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorArray = errors.array();
        let errorMessage: string;

        // Use the validation error message if there's only one or they're all the same
        if (
            errorArray.length === 1 ||
            errorArray.every((err) => err.msg === errorArray[0].msg)
        ) {
            errorMessage = errorArray[0].msg as string;
        } else {
            errorMessage = 'Resolve the errors and try again.';
        }

        res.status(400).json({
            errors: errorArray,
            message: errorMessage,
        });
        return true;
    }
    return false;
}

/**
 * Prepare a user-friendly error message for JSON parsing and validation errors.
 * @param {Error} error The error object to prepare the message from.
 * @returns {string} A user-friendly error message.
 */
export function prepareJsonValidationErrorMessage(error: Error): string {
    let errorMessage = `An unexpected error occurred: ${error}`;
    if (error instanceof SyntaxError) {
        errorMessage = `The JSON did not parse correctly.<br>${error.message}`;
    } else if (error instanceof ValidatorResultError) {
        const validationErrors = error.errors as unknown as ValidationError[];
        const validationMessages = validationErrors
            .map((e) => `<strong>${e.property}</strong>: ${e.message}`)
            .join('</li><li>');
        errorMessage = `The JSON did not validate against the schema.<br><ul><li>${validationMessages}</li></ul>`;
    }
    return errorMessage;
}

/**
 * Validates password and retyped password against accepted criteria.
 * @param {string} password1 The password to be validated.
 * @param {string} password1 The password retyped for confirmation.
 * @returns {Partial<ExpressValidationError>[]} Array of errors that may be generated when validating password.
 */
export function validatePasswords(
    password1: string,
    password2?: string
): Partial<ExpressValidationError>[] {
    const errors: Partial<ExpressValidationError>[] = [];

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
    } else if (!/(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d])/.test(password1)) {
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
        errors.push(
            {
                msg: 'This password is too common',
                path: 'password1',
            },
            {
                msg: 'This password is too common',
                path: 'password2',
            }
        );
    }
    return errors;
}

/**
 * Validate the response text against the provided schema.
 * It parses the JSON, validates it, and removes any null values.
 * @param {string} responseText The JSON string to validate.
 * @param {object} schema The JSON schema to validate against.
 * @returns {TemplateData} The validated and cleaned TemplateData object.
 */
export function validateTemplateDataText(
    responseText: string,
    schema: object
): TemplateData {
    // Parse the JSON
    let templateData = JSON.parse(responseText) as TemplateData;

    // Validate the JSON against the schema
    const v = new Validator();
    v.validate(templateData, schema, {
        required: true,
        throwAll: true,
    });

    // Parse the JSON again and remove any null values
    templateData = JSON.parse(responseText, (key, value) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        if (value !== null) return value;
    }) as TemplateData;

    // Remove extra properties if not applicable
    for (const question of templateData.questions) {
        if (question.answer_type !== 'date_of_birth') {
            delete question.date_of_birth_minimum_age;
            delete question.date_of_birth_maximum_age;
        }
        if (
            question.answer_type !== 'multiple_choice' &&
            question.answer_type !== 'single_choice'
        ) {
            delete question.options;
        }
    }

    return templateData;
}

/* Based on https://github.com/x-govuk/govuk-prototype-filters */
import govukMarkdown from 'govuk-markdown';
import { marked, MarkedExtension } from 'marked';
import moment from 'moment';

/**
 * Test if an array or string includes a specific element
 * @param {string | string[]} array the array or string to search
 * @param {string} searchElement the element to search for
 * @returns {boolean} true if the element is found, false otherwise
 */
export function arrayOrStringIncludes(
    array: string | string[],
    searchElement: string
): boolean {
    if (Array.isArray(array)) {
        return array.includes(searchElement);
    }
    if (typeof array === 'string') {
        return array.includes(searchElement);
    }
    return false;
}

/**
 * Convert a Markdown string to GOV.UK HTML
 * @param {string} markdown the Markdown string to convert
 * @param {Partial<MarkedExtension>} options optional options for the conversion
 * @param {string} options.headingsStartWith optional heading level to start from, defaults to 'xl'
 * @returns {string} the converted HTML string
 */
export function convertToGovukMarkdown(
    markdown: string,
    options?: Partial<MarkedExtension>
): string {
    if (!markdown) return '';

    marked.defaults = {};
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const extension: MarkedExtension = govukMarkdown({
        headingsStartWith: 'xl',
        ...(options ?? {}),
    }) as MarkedExtension;
    marked.use(extension);

    return marked.parse(markdown, { async: false });
}

/**
 * Format a list of strings into a human-readable format
 * @param {string[]} array the array of strings to format
 * @returns {string} the formatted list
 */
export function formatList(array: string[]): string {
    if (array.length === 0) return '';
    if (array.length === 1) return array[0];
    if (array.length === 2) return `${array[0]} and ${array[1]}`;
    return `${array.slice(0, -1).join(', ')}, and ${array[array.length - 1]}`;
}

/**
 * Convert ISO 8601 date string into a human readable date
 * with the GOV.UK style
 *
 * @see {@link https://www.gov.uk/guidance/style-guide/a-to-z-of-gov-uk-style#dates}
 * @example <caption>Full date</caption>
 * govukDate('2021-08-17') // 17 August 2021
 * @example <caption>Month and year only</caption>
 * govukDate('2021-08') // August 2021
 * @param {string} dateString the ISO 8601 date to convert
 * @returns {string} the human readable date
 */
export function govukDate(dateString: string): string {
    if (!dateString) return '';

    const dateParts = dateString
        .split('-')
        .map((part) => Number.parseInt(part, 10));
    if (dateParts.length === 2) return moment(dateString).format('MMMM YYYY');
    if (dateParts.length === 3) return moment(dateString).format('D MMMM YYYY');
    return dateString;
}

/**
 * Check if the input is an array
 * @param {unknown} input the input to check
 * @returns {boolean} true if the input is an array, false otherwise
 */
export function isArray(input: unknown): boolean {
    return Array.isArray(input);
}

/**
 * Convert `govukDateInput` values into an ISO 8601 date.
 *
 * The `govukDateInput` creates separate values for its component for `day`,
 * `month` and `year` values, optionally prefixed with a `namePrefix`.
 *
 * `namePrefix` is optional, and intended for the simplistic use case where
 * date values are saved at the top level of prototype session data.
 *
 * If no `namePrefix` is provided, assumes author is setting custom names for
 * each component value and storing session data in a nested object.
 *
 * @example <caption>With namePrefix</caption>
 * data = {
 *   'dob-day': '01',
 *   'dob-month': '02',
 *   'dob-year: '2012'
 * }
 * isoDateFromDateInput(data, 'dob') // 2012-02-01
 * @example <caption>Without namePrefix, month and year only</caption>
 * data = {
 *   issued: {
 *     month: '02',
 *     year: '2012'
 *   }
 * }
 * isoDateFromDateInput(data.issued) // 2012-02
 * @param {object} object - Object containing date values
 * @param {string} [namePrefix] - `namePrefix` used for date values
 * @returns {string} ISO 8601 date string
 */
export function isoDateFromDateInput(
    object: Record<string, string>,
    namePrefix?: string
): string {
    let day: number | undefined,
        month: number | undefined,
        year: number | undefined;
    if (namePrefix) {
        day = object[`${namePrefix}-day`]
            ? Number(object[`${namePrefix}-day`])
            : undefined;
        month = parseMonth(object[`${namePrefix}-month`]);
        year = object[`${namePrefix}-year`]
            ? Number(object[`${namePrefix}-year`])
            : undefined;
    } else {
        day = object.day ? Number(object.day) : undefined;
        month = parseMonth(object.month);
        year = object.year ? Number(object.year) : undefined;
    }

    // If no year or month, cannot construct a date
    if (!year || !month) return '';

    // If no day, return YYYY-MM
    if (!day) {
        // Pad month to two digits
        const mm = month.toString().padStart(2, '0');
        return `${String(year)}-${mm}`;
    }

    // Full date: YYYY-MM-DD
    const dd = day.toString().padStart(2, '0');
    const mm = month.toString().padStart(2, '0');
    return `${String(year)}-${mm}-${dd}`;
}

/**
 * Helper function to normalise month input
 * @param {string} input - The month input to normalise
 * @returns {number | undefined} - The normalised month as a 1-indexed number, or undefined if invalid
 */
function parseMonth(input?: string): number | undefined {
    if (!input) return undefined;
    const val = input.trim().toLowerCase();
    const months = [
        ['1', '01', 'jan', 'january'],
        ['2', '02', 'feb', 'february'],
        ['3', '03', 'mar', 'march'],
        ['4', '04', 'apr', 'april'],
        ['5', '05', 'may'],
        ['6', '06', 'jun', 'june'],
        ['7', '07', 'jul', 'july'],
        ['8', '08', 'aug', 'august'],
        ['9', '09', 'sep', 'september'],
        ['10', 'oct', 'october'],
        ['11', 'nov', 'november'],
        ['12', 'dec', 'december'],
    ];
    for (const arr of months) {
        if (arr.includes(val)) return Number(arr[0]);
    }
    return undefined;
}

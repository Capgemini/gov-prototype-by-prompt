let markedUseMock: jest.Mock;
let markedParseMock: jest.Mock;
beforeEach(() => {
    markedUseMock = jest.fn();
    markedParseMock = jest.fn().mockImplementation((input: string) => {
        return `<p>${input}</p>`;
    });
    jest.doMock('marked', () => ({
        marked: { parse: markedParseMock, use: markedUseMock },
    }));
});

afterEach(() => {
    jest.resetAllMocks();
    jest.resetModules();
});

describe('arrayOrStringIncludes', () => {
    let arrayOrStringIncludes: (
        input: string | string[],
        search: string
    ) => boolean;

    beforeEach(async () => {
        ({ arrayOrStringIncludes } = await import('../filters'));
    });

    test.each([
        [['a', 'b', 'c'], 'b', true],
        [['a', 'b', 'c'], 'z', false],
        ['hello world', 'world', true],
        ['hello world', 'nope', false],
        [[], 'x', false],
        ['', 'x', false],
    ])(
        'arrayOrStringIncludes(%p, %p) returns %p',
        (input, search, expected) => {
            expect(arrayOrStringIncludes(input, search)).toBe(expected);
        }
    );
});

describe('convertToGovukMarkdown', () => {
    let convertToGovukMarkdown: (markdown: string, options?: object) => string;
    beforeEach(async () => {
        ({ convertToGovukMarkdown } = await import('../filters'));
    });
    test.each([
        ['An example sentence.', '<p>An example sentence.</p>'],
        ['', ''],
    ])(
        'convertToGovukMarkdown(%p) returns expected HTML',
        (input, expectedStart) => {
            expect(convertToGovukMarkdown(input)).toContain(
                expectedStart.trim()
            );
        }
    );
});

describe('formatList', () => {
    let formatList: (array: string[]) => string;
    beforeEach(async () => {
        ({ formatList } = await import('../filters'));
    });
    test.each([
        [[], ''],
        [['one'], 'one'],
        [['one', 'two'], 'one and two'],
        [['one', 'two', 'three'], 'one, two, and three'],
        [['a', 'b', 'c', 'd'], 'a, b, c, and d'],
    ])('formatList(%p) returns %p', (input, expected) => {
        expect(formatList(input)).toBe(expected);
    });
});

describe('govukDate', () => {
    let govukDate: (dateString: string) => string;
    beforeEach(async () => {
        ({ govukDate } = await import('../filters'));
    });
    test.each([
        ['2021-08-17', '17 August 2021'],
        ['2021-08', 'August 2021'],
        ['2021-08-08-01', '2021-08-08-01'],
        ['', ''],
        ['invalid', 'invalid'],
    ])('govukDate(%p) returns %p', (input, expected) => {
        const result = govukDate(input);
        if (expected === 'invalid') {
            expect(result).toBe(input);
        } else if (expected === '') {
            expect(result).toBe('');
        } else if (expected === expect.any(String)) {
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        } else {
            expect(result).toBe(expected);
        }
    });
});

describe('isArray', () => {
    let isArray: (input: unknown) => boolean;
    beforeEach(async () => {
        ({ isArray } = await import('../filters'));
    });
    test.each([
        [[], true],
        [[1, 2], true],
        ['string', false],
        [123, false],
        [{}, false],
        [null, false],
        [undefined, false],
    ])('isArray(%p) returns %p', (input, expected) => {
        expect(isArray(input)).toBe(expected);
    });
});

describe('isoDateFromDateInput', () => {
    let isoDateFromDateInput: (
        object: Record<string, string>,
        namePrefix?: string
    ) => string;
    beforeEach(async () => {
        ({ isoDateFromDateInput } = await import('../filters'));
    });
    test.each([
        [
            { 'dob-day': '01', 'dob-month': '02', 'dob-year': '2012' },
            'dob',
            '2012-02-01',
        ],
        [{ day: '15', month: '03', year: '2020' }, undefined, '2020-03-15'],
        [{ month: '02', year: '2012' }, undefined, '2012-02'],
        [{}, undefined, ''],
        [{ 'dob-month': '02', 'dob-year': '2012' }, 'dob', '2012-02'],
        [
            { 'dob-day': '01', 'dob-month': 'invalid', 'dob-year': '2012' },
            'dob',
            '',
        ],
    ])('isoDateFromDateInput(%p, %p) returns %p', (obj, prefix, expected) => {
        expect(isoDateFromDateInput(obj, prefix)).toBe(expected);
    });
});

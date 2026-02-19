export interface HistoryPageVM {
    filterCreatedByItems: { selected: boolean; text: string; value: string }[];
    filterOnlyCreatedItems: {
        selected: boolean;
        text: string;
        value: string;
    }[];

    filterSharingItems: { selected: boolean; text: string; value: string }[];
    hasPrototypes: boolean;
    paginationItems?: object[];
    paginationNextHref?: string;

    paginationPreviousHref?: string;

    perPageItems: { checked: boolean; text: string; value: string }[];
    showPagination: boolean;
    summaryText: string;
    workspaceItems: { selected: boolean; text: string; value: string }[];
}

export function buildHistoryPageVM(input: {
    countPrototypes: number;
    createdBy: string;
    onlyCreated: boolean;
    paginationItems?: object[];
    paginationNextHref?: string;
    paginationPreviousHref?: string;
    perPage: number;
    sharing: string;
    totalPrototypes: number;
    workspaceItems: { selected: boolean; text: string; value: string }[];
}): HistoryPageVM {
    const {
        countPrototypes,
        createdBy,
        onlyCreated,
        paginationItems,
        paginationNextHref,
        paginationPreviousHref,
        perPage,
        sharing,
        totalPrototypes,
        workspaceItems,
    } = input;

    // Build summary text
    let summaryText = '';
    if (totalPrototypes === 0) {
        summaryText = 'There are no prototypes.';
    } else if (totalPrototypes === countPrototypes) {
        summaryText = `Showing all ${String(totalPrototypes)} prototype${totalPrototypes === 1 ? '' : 's'}.`;
    } else {
        summaryText = `Showing ${String(countPrototypes)} prototype${countPrototypes === 1 ? '' : 's'} out of ${String(totalPrototypes)}.`;
    }

    return {
        filterCreatedByItems: [
            {
                selected: createdBy === 'anyone',
                text: 'Created by anyone',
                value: 'anyone',
            },
            {
                selected: createdBy === 'self',
                text: 'Created by you',
                value: 'self',
            },
            {
                selected: createdBy === 'others',
                text: 'Created by others',
                value: 'others',
            },
        ],
        filterOnlyCreatedItems: [
            {
                selected: !onlyCreated,
                text: 'All prototypes',
                value: 'false',
            },
            {
                selected: onlyCreated,
                text: 'Exclude updates to existing prototypes',
                value: 'true',
            },
        ],

        filterSharingItems: [
            {
                selected: sharing === 'all',
                text: 'All prototypes',
                value: 'all',
            },
            {
                selected: sharing === 'public',
                text: 'Prototypes shared publicly',
                value: 'public',
            },
            {
                selected: sharing === 'users',
                text: 'Prototypes shared with specific users',
                value: 'users',
            },
            {
                selected: sharing === 'workspace',
                text: 'Prototypes within a shared workspace',
                value: 'workspace',
            },
            {
                selected: sharing === 'private',
                text: 'Prototypes that are not shared',
                value: 'private',
            },
        ],

        hasPrototypes: totalPrototypes > 0,

        paginationItems,

        paginationNextHref,

        paginationPreviousHref,

        perPageItems: [10, 25, 50].map((n) => ({
            checked: perPage === n,
            text: String(n),
            value: String(n),
        })),
        showPagination: !!paginationItems?.length,
        summaryText,
        workspaceItems,
    };
}

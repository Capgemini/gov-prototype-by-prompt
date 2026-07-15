import { DEFAULT_PER_PAGE } from '../constants';

export interface PaginationParams {
    page: number;
    perPage: number;
    invalidPagination: boolean;
}

export function validatePaginationParams(
    queryPerPage: string | undefined,
    queryPage: string | undefined,
    totalItems: number
): PaginationParams {
    let invalidPagination = false;

    let perPage = Number.parseInt(queryPerPage ?? '10', 10);
    if (
        queryPerPage === undefined ||
        Number.isNaN(perPage) ||
        perPage < 1 ||
        perPage > 100
    ) {
        perPage = DEFAULT_PER_PAGE;
        invalidPagination = true;
    }

    let totalPages = Math.ceil(totalItems / perPage);
    if (totalPages < 1) totalPages = 1;

    let page = Number.parseInt(queryPage ?? '1', 10);
    if (
        queryPage === undefined ||
        Number.isNaN(page) ||
        page < 1 ||
        page > totalPages
    ) {
        page = 1;
        invalidPagination = true;
    }

    return {
        page,
        perPage,
        invalidPagination,
    };
}

import moment from 'moment';

import type { IPrototypeData } from '../../types/schemas/prototype-schema';
import type { IUser } from '../../types/schemas/user-schema';

export interface HistoryRowVM {
    html: string;
}

export interface HistoryVM {
    additionalCount: number;
    additionalLabel: string;
    hasMultiple: boolean;
    pluralSuffix: string; // NEW
    rows: HistoryRowVM[][];
    totalCount: number;
}

export async function buildHistoryVM(
    current: IPrototypeData,
    previous: IPrototypeData[],
    totalCount: number,
    getUserById: (id: string) => Promise<IUser | null>,
    viewingUserId: string
): Promise<HistoryVM> {
    async function byAndWhen(userId: string, timestamp: Date): Promise<string> {
        const creator =
            userId === viewingUserId
                ? 'you'
                : ((await getUserById(userId))?.name ?? 'an unknown user');

        return `${creator.replace(/\s/g, '&nbsp;')} ${moment(timestamp)
            .fromNow()
            .replace(/\s/g, '&nbsp;')}`;
    }

    const rows: HistoryRowVM[][] = [
        [
            {
                html: `${current.changesMade} by&nbsp;${await byAndWhen(
                    current.creatorUserId,
                    current.createdAt
                )} (this&nbsp;version).`,
            },
        ],
    ];

    for (const pv of previous) {
        rows.push([
            {
                html: `<a href="/prototype/${pv.id}">${pv.changesMade}</a> by&nbsp;${await byAndWhen(
                    pv.creatorUserId,
                    pv.createdAt
                )}.`,
            },
        ]);
    }

    const additionalCount = totalCount - previous.length;

    const pluralSuffix = additionalCount === 1 ? '' : 's';

    const additionalLabel =
        additionalCount > 0
            ? `Plus ${additionalCount} more previous version${pluralSuffix} (total ${totalCount}).`
            : '';

    return {
        additionalCount,
        additionalLabel,
        hasMultiple: rows.length > 1,
        pluralSuffix,
        rows,
        totalCount,
    };
}

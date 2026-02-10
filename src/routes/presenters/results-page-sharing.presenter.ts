import type { IPrototypeData } from '../../types/schemas/prototype-schema';
import type { IUser } from '../../types/schemas/user-schema';

export interface SharedUserRowVM {
    nameAndEmail: string;
    userId: string;
}

export interface SharingVM {
    hasSharedUsers: boolean;
    isOwner: boolean;
    ownerRows: { colspan?: number; html?: string; text?: string }[][];
    publicSharing: {
        mode: 'none' | 'password' | 'public';
        password: string;
    };
    sharedUsers: SharedUserRowVM[];
    showOwnerWarning: boolean;
    viewerRows: { text: string }[][];
    workspaces: WorkspaceOptionVM[];
}

export interface WorkspaceOptionVM {
    selected: boolean;
    text: string;
    value: string;
}

export function buildSharingVM(
    prototype: IPrototypeData,
    isOwner: boolean,
    workspaceOptions: WorkspaceOptionVM[],
    sharedWithUsers: IUser[]
): SharingVM {
    let mode: 'none' | 'password' | 'public' = 'none';
    if (prototype.livePrototypePublic) {
        if (prototype.livePrototypePublicPassword) mode = 'password';
        else mode = 'public';
    }
    const sharedUsers: SharedUserRowVM[] = sharedWithUsers.map((u) => ({
        nameAndEmail: `${u.name} (${u.email})`,
        userId: u.id,
    }));
    const hasSharedUsers = sharedUsers.length > 0;
    const ownerRows: { colspan?: number; html?: string; text?: string }[][] =
        [];
    if (hasSharedUsers) {
        for (const u of sharedUsers) {
            ownerRows.push([
                { text: u.nameAndEmail },
                {
                    html: `<button class="govuk-button govuk-button--warning govuk-!-margin-0 remove-shared-user-button" data-user-id="${u.userId}">Remove</button>`,
                },
            ]);
        }
    } else {
        ownerRows.push([{ colspan: 2, text: 'Not shared with any users' }]);
    }
    const viewerRows = sharedUsers.map((u) => [{ text: u.nameAndEmail }]);

    return {
        hasSharedUsers,
        isOwner,
        ownerRows,
        publicSharing: {
            mode,
            password: prototype.livePrototypePublicPassword ?? '',
        },
        sharedUsers,
        showOwnerWarning: !isOwner,
        viewerRows,
        workspaces: workspaceOptions,
    };
}

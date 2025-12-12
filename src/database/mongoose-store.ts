import { IPrototypeData, IUser, IWorkspace } from '../types/schemas';
import { PrototypeModel, UserModel, WorkspaceModel } from './models';

// PROTOTYPES

/**
 * Return true if the user can access the prototype, otherwise false.
 * A user can access a prototype if they have access to the workspace or it is shared with them.
 * @param {string} userId The ID of the user to check access for.
 * @param {string} prototypeId The ID of the prototype to check access for.
 * @returns {boolean} True if the user can access the prototype, otherwise false.
 */
export async function canUserAccessPrototype(
    userId: string,
    prototypeId: string
): Promise<boolean> {
    return await PrototypeModel.canUserAccess(userId, prototypeId);
}

/**
 * Checks if a user can access a workspace.
 * @param {string} userId The ID of the user to check access for.
 * @param {string} workspaceId The ID of the workspace to check access for.
 * @returns {boolean} True if the user can access the workspace, otherwise false.
 */
export async function canUserAccessWorkspace(
    userId: string,
    workspaceId: string
): Promise<boolean> {
    return await WorkspaceModel.canUserAccess(userId, workspaceId);
}

export async function countActiveAdminUsers(): Promise<number> {
    return await UserModel.countActiveAdminUsers();
}

export async function countAllUsers(): Promise<number> {
    return await UserModel.countAll();
}

/**
 * Counts the number of prototypes that a specific user can access.
 * @param {string} userId The ID of the user who can access the prototypes.
 * @param {boolean} onlyCreated If true, excludes prototypes that have a previous prototype ID.
 * @returns {number} The count of accessible prototypes.
 */
export async function countPrototypesByUserId(
    userId: string,
    onlyCreated: boolean
): Promise<number> {
    return await PrototypeModel.countByUserId(userId, onlyCreated);
}

export async function countPrototypesByUserIdAndWorkspaceId(
    userId: string,
    workspaceId: string
): Promise<number> {
    return await PrototypeModel.countByUserIdAndWorkspaceId(
        userId,
        workspaceId
    );
}

export async function countWorkspacesByUserId(userId: string): Promise<number> {
    return await WorkspaceModel.countByUserId(userId);
}

export async function getAllUsers(): Promise<IUser[]> {
    return await UserModel.getAll();
}

// USERS

/**
 * Get the previous prototypes for a given prototype ID and user ID.
 * This function retrieves the previous prototypes in reverse chronological order,
 * starting from the specified prototype ID and going back through the linked previous IDs.
 * It stops when there are no more new previous prototypes.
 * @param {string} prototypeId The ID of the prototype to start from.
 * @param {string} userId The ID of the user of the prototypes.
 * @returns {IPrototypeData[]} An array of previous prototypes in reverse chronological order.
 */
export async function getPreviousPrototypes(
    prototypeId: string,
    userId: string
): Promise<IPrototypeData[]> {
    return await PrototypeModel.getPreviousPrototypes(prototypeId, userId);
}

/**
 * Gets a prototype by its unique identifier from the database.
 * @param {string} id The unique identifier for the prototype
 * @returns {IPrototypeData | null} The prototype data if found, otherwise null
 */
export async function getPrototypeById(
    id: string
): Promise<IPrototypeData | null> {
    return await PrototypeModel.getById(id);
}

/**
 * Gets the most recent prototypes that a user can access
 * This function retrieves the prototypes that a user can access, sorted by their creation timestamp in descending order.
 * @param {string} userId The ID of the user who can access the prototypes.
 * @param {boolean} onlyCreated If true, excludes prototypes that have a previous prototype ID.
 * @returns {IPrototypeData[]} An array of prototypes owned by the user, sorted by timestamp in descending order.
 */
export async function getPrototypesByUserId(
    userId: string,
    onlyCreated: boolean
): Promise<IPrototypeData[]> {
    return await PrototypeModel.getByUserId(userId, onlyCreated);
}

export async function getUserByEmail(email: string): Promise<IUser | null> {
    return await UserModel.getByEmail(email);
}

export async function getUserById(id: string): Promise<IUser | null> {
    return await UserModel.getById(id);
}

export async function getWorkspaceById(id: string): Promise<IWorkspace | null> {
    return await WorkspaceModel.getById(id);
}

/**
 * Gets the most recent workspaces for a user
 * This function retrieves the workspaces for a user, with their private workspace first and
 * then sorted by their creation timestamp in descending order.
 * @param {string} userId The ID of the user who can access the workspaces.
 * @returns {IWorkspace[]} An array of workspaces owned by the user.
 */
export async function getWorkspacesByUserId(
    userId: string
): Promise<IWorkspace[]> {
    return await WorkspaceModel.getByUserId(userId);
}

/**
 * Stores a prototype in the database.
 * @param {IPrototypeData} data The prototype data to be stored
 */
export async function storePrototype(
    data: Omit<IPrototypeData, '_id' | 'createdAt' | 'id' | 'updatedAt'>
): Promise<IPrototypeData> {
    return await PrototypeModel.store(data);
}

export async function storeUser(
    user: Omit<
        IUser,
        '_id' | 'createdAt' | 'id' | 'personalWorkspaceId' | 'updatedAt'
    >
): Promise<Omit<IUser, 'personalWorkspaceId'>> {
    return await UserModel.store(user);
}

export async function storeWorkspace(
    workspace: Omit<IWorkspace, '_id' | 'createdAt' | 'id' | 'updatedAt'>
): Promise<IWorkspace> {
    return await WorkspaceModel.store(workspace);
}

/**
 * Updates a prototype in the database.
 * @param {string} id The unique identifier for the prototype
 * @param {Partial<IPrototypeData>} updates The updates to apply to the prototype
 * @returns {IPrototypeData | null} The updated prototype data if found, otherwise null
 */
export async function updatePrototype(
    id: string,
    updates: Partial<IPrototypeData>
): Promise<IPrototypeData | null> {
    return await PrototypeModel.update(id, updates);
}

export async function updateUser(
    id: string,
    updates: Partial<IUser>
): Promise<IUser | null> {
    return await UserModel.update(id, updates);
}

export async function updateWorkspace(
    id: string,
    updates: Partial<IWorkspace>
): Promise<IWorkspace | null> {
    return await WorkspaceModel.update(id, updates);
}

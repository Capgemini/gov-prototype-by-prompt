import { ObjectId, QueryFilter } from 'mongoose';

import {
    IPrototypeData,
    Prototype,
} from '../../types/schemas/prototype-schema';
import { WorkspaceModel } from './workspace-model';

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class PrototypeModel {
    /**
     * Check if a user can access a prototype
     */
    static async canUserAccess(
        userId: string,
        prototypeId: string
    ): Promise<boolean> {
        try {
            const prototype = await this.getById(prototypeId);
            if (!prototype) {
                return false;
            }

            if (prototype.sharedWithUserIds.includes(userId)) {
                return true;
            }

            return await WorkspaceModel.canUserAccess(
                userId,
                prototype.workspaceId
            );
        } catch (error) {
            console.error('Error checking prototype access:', error);
            throw error;
        }
    }

    /**
     * Count prototypes by user ID
     */
    static async countByUserId(
        userId: string,
        onlyCreated = false
    ): Promise<number> {
        try {
            const query = await this.buildUserAccessQuery(userId, onlyCreated);
            return await Prototype.countDocuments(query);
        } catch (error) {
            console.error('Error counting prototypes by user ID:', error);
            throw error;
        }
    }

    /**
     * Count prototypes by user ID and workspace ID
     */
    static async countByUserIdAndWorkspaceId(
        userId: string,
        workspaceId: string
    ): Promise<number> {
        try {
            // First check if user has access to the workspace
            const canAccessWorkspace = await WorkspaceModel.canUserAccess(
                userId,
                workspaceId
            );

            if (!canAccessWorkspace) {
                return 0;
            }

            return await Prototype.countDocuments({ workspaceId });
        } catch (error) {
            console.error(
                'Error counting prototypes by user ID and workspace ID:',
                error
            );
            throw error;
        }
    }

    /**
     * Delete a prototype by ID
     */
    static async deleteById(id: string): Promise<boolean> {
        try {
            const result = await Prototype.findByIdAndDelete(id);
            return !!result;
        } catch (error) {
            console.error('Error deleting prototype:', error);
            throw error;
        }
    }

    /**
     * Get a prototype by its ID
     */
    static async getById(id: string): Promise<IPrototypeData | null> {
        try {
            return await Prototype.findById(id);
        } catch (error) {
            console.error('Error getting prototype by ID:', error);
            throw error;
        }
    }

    /**
     * Get prototypes by user ID
     */
    static async getByUserId(
        userId: string,
        onlyCreated = false
    ): Promise<IPrototypeData[]> {
        try {
            const query = await this.buildUserAccessQuery(userId, onlyCreated);
            const prototypes = await Prototype.find(query).sort({
                createdAt: -1,
            });
            return prototypes;
        } catch (error) {
            console.error('Error getting prototypes by user ID:', error);
            throw error;
        }
    }

    /**
     * Get prototypes by workspace ID (for users with workspace access)
     */
    static async getByWorkspaceId(
        workspaceId: string,
        userId: string,
        onlyCreated = false
    ): Promise<IPrototypeData[]> {
        try {
            // First check if user has access to the workspace
            const canAccessWorkspace = await WorkspaceModel.canUserAccess(
                userId,
                workspaceId
            );

            if (!canAccessWorkspace) {
                return [];
            }

            // Build query for prototypes in the workspace that the user can access
            const query: QueryFilter<IPrototypeData> = {
                workspaceId,
            };

            if (onlyCreated) {
                query.previousId = { $exists: false };
            }

            return await Prototype.find(query).sort({ createdAt: -1 });
        } catch (error) {
            console.error('Error getting prototypes by workspace ID:', error);
            throw error;
        }
    }

    /**
     * Get previous prototypes for a given prototype ID and user ID
     */
    static async getPreviousPrototypes(
        prototypeId: string,
        userId: string
    ): Promise<IPrototypeData[]> {
        try {
            // First, get all workspaces the user has access to
            const userWorkspaces = await WorkspaceModel.getByUserId(userId);
            const userWorkspaceIds = new Set(
                userWorkspaces.map((workspace) => workspace.id)
            );

            // Build the chain of previous IDs
            const previousIds: ObjectId[] = [];
            let currentId: string | undefined = prototypeId;

            // First, get the current prototype to start the chain
            const currentPrototype = await this.getById(currentId);
            if (
                !currentPrototype ||
                !(await this.canUserAccess(userId, currentId))
            ) {
                return [];
            }

            // Build the chain of previous IDs
            while (currentId) {
                const prototype = await this.getById(currentId);
                if (!prototype) break;

                // Check if user can access this prototype
                const canAccess =
                    prototype.sharedWithUserIds.includes(userId) ||
                    userWorkspaceIds.has(prototype.workspaceId);

                if (!canAccess) break;

                previousIds.push(prototype._id);
                currentId = prototype.previousId;
            }

            // Remove the current prototype from the list
            previousIds.shift();

            // Fetch all previous prototypes in one query
            if (previousIds.length === 0) {
                return [];
            }

            const previousPrototypes = await Prototype.find({
                _id: { $in: previousIds },
            }).sort({ createdAt: -1 });

            return previousPrototypes;
        } catch (error) {
            console.error('Error getting previous prototypes:', error);
            throw error;
        }
    }

    /**
     * Store a new prototype
     */
    static async store(
        prototype: Omit<
            IPrototypeData,
            '_id' | 'createdAt' | 'id' | 'updatedAt'
        >
    ): Promise<IPrototypeData> {
        try {
            const newPrototype = new Prototype(prototype);
            return await newPrototype.save();
        } catch (error) {
            console.error('Error storing prototype:', error);
            throw error;
        }
    }

    /**
     * Update a prototype
     */
    static async update(
        id: string,
        updates: Partial<IPrototypeData>
    ): Promise<IPrototypeData | null> {
        try {
            return await Prototype.findByIdAndUpdate(id, updates, {
                new: true,
            });
        } catch (error) {
            console.error('Error updating prototype:', error);
            throw error;
        }
    }

    /**
     * Build query for user-accessible prototypes
     */
    private static async buildUserAccessQuery(
        userId: string,
        onlyCreated = false
    ): Promise<QueryFilter<IPrototypeData>> {
        const userWorkspaces = await WorkspaceModel.getByUserId(userId);
        const userWorkspaceIds = userWorkspaces.map(
            (workspace) => workspace.id
        );

        const query: QueryFilter<IPrototypeData> = {
            $or: [
                { sharedWithUserIds: { $in: [userId] } },
                { workspaceId: { $in: userWorkspaceIds } },
            ],
        };

        if (onlyCreated) {
            query.previousId = { $exists: false };
        }

        return query;
    }
}

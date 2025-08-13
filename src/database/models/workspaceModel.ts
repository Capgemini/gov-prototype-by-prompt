import { IWorkspace, Workspace } from '../../types/schemas/workspace-schema';

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class WorkspaceModel {
    /**
     * Check if a user can access a workspace
     */
    static async canUserAccess(
        userId: string,
        workspaceId: string
    ): Promise<boolean> {
        try {
            const workspace = await Workspace.findById(workspaceId);
            return workspace ? workspace.userIds.includes(userId) : false;
        } catch (error) {
            console.error('Error checking workspace access:', error);
            throw error;
        }
    }

    /**
     * Count workspaces by user ID
     */
    static async countByUserId(userId: string): Promise<number> {
        try {
            return await Workspace.countDocuments({ userIds: userId });
        } catch (error) {
            console.error('Error counting workspaces by user ID:', error);
            throw error;
        }
    }

    /**
     * Delete a workspace by ID
     */
    static async deleteById(id: string): Promise<boolean> {
        try {
            const result = await Workspace.findByIdAndDelete(id);
            return !!result;
        } catch (error) {
            console.error('Error deleting workspace:', error);
            throw error;
        }
    }

    /**
     * Get all workspaces
     */
    static async getAll(): Promise<IWorkspace[]> {
        try {
            return await Workspace.find({});
        } catch (error) {
            console.error('Error getting all workspaces:', error);
            throw error;
        }
    }

    /**
     * Get a workspace by its ID
     */
    static async getById(id: string): Promise<IWorkspace | null> {
        try {
            return await Workspace.findById(id);
        } catch (error) {
            console.error('Error getting workspace by ID:', error);
            throw error;
        }
    }

    /**
     * Get workspaces by user ID
     */
    static async getByUserId(userId: string): Promise<IWorkspace[]> {
        try {
            return await Workspace.find({ userIds: { $in: [userId] } }).sort({
                isPersonalWorkspace: -1,
                updatedAt: -1,
            });
        } catch (error) {
            console.error('Error getting workspaces by user ID:', error);
            throw error;
        }
    }

    /**
     * Store a new workspace
     */
    static async store(
        workspace: Omit<IWorkspace, '_id' | 'createdAt' | 'id' | 'updatedAt'>
    ): Promise<IWorkspace> {
        try {
            const newWorkspace = new Workspace(workspace);
            return await newWorkspace.save();
        } catch (error) {
            console.error('Error storing workspace:', error);
            throw error;
        }
    }

    /**
     * Update an existing workspace
     */
    static async update(
        id: string,
        updates: Partial<IWorkspace>
    ): Promise<IWorkspace | null> {
        try {
            return await Workspace.findByIdAndUpdate(id, updates, {
                new: true,
            });
        } catch (error) {
            console.error('Error updating workspace:', error);
            throw error;
        }
    }
}

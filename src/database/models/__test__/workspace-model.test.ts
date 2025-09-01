import {
    user1PersonalWorkspace,
    user1PersonalWorkspaceId,
} from '../../../../jest/mockTestData';
import { disconnectFromDatabase } from '../../connection/mongoose';
import { WorkspaceModel } from '../workspace-model';

const workspaceId = user1PersonalWorkspaceId.toString();
const mockWorkspace = user1PersonalWorkspace;

describe('WorkspaceModel', () => {
    it('should return false if userCanAccess workspace without user', async () => {
        expect(await WorkspaceModel.canUserAccess('user1', workspaceId)).toBe(
            false
        );
    });

    it('should return true if userCanAccess workspace with user', async () => {
        const workspace = await WorkspaceModel.store(mockWorkspace);
        expect(await WorkspaceModel.canUserAccess('user1', workspace.id)).toBe(
            true
        );
    });

    it('should throw when error occurs in userCanAccess', async () => {
        await disconnectFromDatabase();
        await expect(
            WorkspaceModel.canUserAccess('user1', workspaceId)
        ).rejects.toThrow('Client must be connected before running operations');
    });

    it('should return 1 when counting users in workspace', async () => {
        await WorkspaceModel.store(mockWorkspace);
        expect(await WorkspaceModel.countByUserId('user1')).toBe(1);
    });

    it('should throw when error occurs in countByUserId', async () => {
        await disconnectFromDatabase();
        await expect(WorkspaceModel.countByUserId('user1')).rejects.toThrow(
            'Client must be connected before running operations'
        );
    });

    it('should return false when deleting workspace that do not exist', async () => {
        expect(await WorkspaceModel.deleteById(workspaceId)).toBe(false);
    });

    it('should return true when deleting workspace that exist', async () => {
        const workspace = await WorkspaceModel.store(mockWorkspace);
        expect(await WorkspaceModel.deleteById(workspace.id)).toBe(true);
    });

    it('should throw when trying to delete workspace but error occurs', async () => {
        await disconnectFromDatabase();
        await expect(WorkspaceModel.deleteById(workspaceId)).rejects.toThrow(
            'Client must be connected before running operations'
        );
    });

    it('should return null when getAll', async () => {
        expect(await WorkspaceModel.getAll()).toEqual([]);
    });

    it('should throw get all when error occurs', async () => {
        await disconnectFromDatabase();
        await expect(WorkspaceModel.getAll()).rejects.toThrow(
            'Client must be connected before running operations'
        );
    });

    it('should return null when getById', async () => {
        expect(await WorkspaceModel.getById(workspaceId)).toEqual(null);
    });

    it('should throw when error occurs in getById', async () => {
        await disconnectFromDatabase();
        await expect(WorkspaceModel.getById(workspaceId)).rejects.toThrow(
            'Client must be connected before running operations'
        );
    });

    it('should return a workspace when getByUserId', async () => {
        await WorkspaceModel.store(mockWorkspace);
        const workspace = await WorkspaceModel.getByUserId('user1');
        expect(workspace).not.toBe({});
    });

    it('should throw when error occurs in getByUserId', async () => {
        await disconnectFromDatabase();
        await expect(WorkspaceModel.getByUserId('user1')).rejects.toThrow(
            'Client must be connected before running operations'
        );
    });

    it('should store workspace', async () => {
        await WorkspaceModel.store(mockWorkspace);
        expect(await WorkspaceModel.getAll()).not.toBe({});
    });

    it('should throw when error occurs in store', async () => {
        await disconnectFromDatabase();
        await expect(WorkspaceModel.store(mockWorkspace)).rejects.toThrow(
            'Client must be connected before running operations'
        );
    });

    it('should update workspace', async () => {
        const updatedName = 'updated-name';
        const workspace = await WorkspaceModel.store(mockWorkspace);
        const updatedWorkspace = await WorkspaceModel.update(workspace.id, {
            name: updatedName,
        });
        expect(updatedWorkspace?.name).toBe(updatedName);
    });

    it('should throw when updating workspace and error occurs', async () => {
        await disconnectFromDatabase();
        await expect(
            WorkspaceModel.update(workspaceId, {
                name: 'should-fail',
            })
        ).rejects.toThrow('Client must be connected before running operations');
    });
});

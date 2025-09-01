import {
    user1PersonalWorkspace,
    user1PersonalWorkspaceId,
    userId1,
} from '../../../../jest/mockTestData';
import { Workspace } from '../../../types';
import { disconnectFromDatabase } from '../../connection/mongoose';
import { WorkspaceModel } from '../workspace-model';

const workspaceId = user1PersonalWorkspaceId.toString();
const mockWorkspace = user1PersonalWorkspace;
const mockUserId = userId1;

describe('WorkspaceModel', () => {
    describe('canUserAccess', () => {
        it('should return false if userCanAccess workspace without user', async () => {
            expect(
                await WorkspaceModel.canUserAccess('user', workspaceId)
            ).toBe(false);
        });

        it('should return true if userCanAccess workspace with user', async () => {
            const newWorkspace = new Workspace(mockWorkspace);
            await newWorkspace.save();
            expect(
                await WorkspaceModel.canUserAccess(
                    mockUserId.toString(),
                    newWorkspace.id as string
                )
            ).toBe(true);
        });

        it('should throw when error occurs in userCanAccess', async () => {
            await disconnectFromDatabase();
            await expect(
                WorkspaceModel.canUserAccess('user1', workspaceId)
            ).rejects.toThrow(
                'Client must be connected before running operations'
            );
        });
    });

    describe('countByUserId', () => {
        it('should return 1 when counting users in workspace', async () => {
            const newWorkspace = new Workspace(mockWorkspace);
            await newWorkspace.save();
            expect(
                await WorkspaceModel.countByUserId(mockUserId.toString())
            ).toBe(1);
        });

        it('should throw when error occurs in countByUserId', async () => {
            await disconnectFromDatabase();
            await expect(
                WorkspaceModel.countByUserId(mockUserId.toString())
            ).rejects.toThrow(
                'Client must be connected before running operations'
            );
        });
    });

    describe('deleteById', () => {
        it('should return false when deleting workspace that do not exist', async () => {
            expect(await WorkspaceModel.deleteById(workspaceId)).toBe(false);
        });

        it('should return true when deleting workspace that exist', async () => {
            const newWorkspace = new Workspace(mockWorkspace);
            await newWorkspace.save();
            expect(
                await WorkspaceModel.deleteById(newWorkspace.id as string)
            ).toBe(true);
        });

        it('should throw when trying to delete workspace but error occurs', async () => {
            await disconnectFromDatabase();
            await expect(
                WorkspaceModel.deleteById(workspaceId)
            ).rejects.toThrow(
                'Client must be connected before running operations'
            );
        });
    });

    describe('getAll', () => {
        it('should return null when getAll', async () => {
            expect(await WorkspaceModel.getAll()).toEqual([]);
        });

        it('should throw get all when error occurs', async () => {
            await disconnectFromDatabase();
            await expect(WorkspaceModel.getAll()).rejects.toThrow(
                'Client must be connected before running operations'
            );
        });
    });

    describe('getById', () => {
        it('should return null when getById', async () => {
            expect(await WorkspaceModel.getById(workspaceId)).toEqual(null);
        });

        it('should throw when error occurs in getById', async () => {
            await disconnectFromDatabase();
            await expect(WorkspaceModel.getById(workspaceId)).rejects.toThrow(
                'Client must be connected before running operations'
            );
        });
    });

    describe('getByUserId', () => {
        it('should return a workspace when getByUserId', async () => {
            const newWorkspace = new Workspace(mockWorkspace);
            await newWorkspace.save();
            const workspace = await WorkspaceModel.getByUserId(
                mockUserId.toString()
            );
            expect(workspace).not.toBe({});
        });

        it('should throw when error occurs in getByUserId', async () => {
            await disconnectFromDatabase();
            await expect(
                WorkspaceModel.getByUserId(mockUserId.toString())
            ).rejects.toThrow(
                'Client must be connected before running operations'
            );
        });
    });

    describe('store', () => {
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
    });

    describe('update', () => {
        it('should update workspace', async () => {
            const updatedName = 'updated-name';
            const newWorkspace = new Workspace(mockWorkspace);
            await newWorkspace.save();
            const updatedWorkspace = await WorkspaceModel.update(
                newWorkspace.id as string,
                {
                    name: updatedName,
                }
            );
            expect(updatedWorkspace?.name).toBe(updatedName);
        });

        it('should throw when updating workspace and error occurs', async () => {
            await disconnectFromDatabase();
            await expect(
                WorkspaceModel.update(workspaceId, {
                    name: 'should-fail',
                })
            ).rejects.toThrow(
                'Client must be connected before running operations'
            );
        });
    });
});

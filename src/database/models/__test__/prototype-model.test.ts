import { disconnectFromDatabase, PrototypeModel } from '../..';
import {
    prototypeData1,
    prototypeData2,
    prototypeId1,
    prototypeId2,
    user1PersonalWorkspace,
    user1PersonalWorkspaceId,
    userId1,
    userId2,
} from '../../../../jest/mockTestData';
import { Prototype, Workspace } from '../../../types';

const mockPrototypeId1 = prototypeId1.toString();
const mockPrototype1 = prototypeData1;
const mockPrototypeId2 = prototypeId2.toString();
const mockPrototype2 = prototypeData2;
const mockUserId1 = userId1.toString();
const mockUserId2 = userId2.toString();
const mockUser1PersonalWorkspaceId = user1PersonalWorkspaceId.toString();
const mockUser1PersonalWorkspace = user1PersonalWorkspace;

beforeEach(async () => {
    const newWorkspace = new Workspace(mockUser1PersonalWorkspace);
    await newWorkspace.save();
});

describe('PrototypeModel', () => {
    describe('canUserAccess', () => {
        it('should return true if user can access prototype through the workspace', async () => {
            const newPrototype = new Prototype(mockPrototype1);
            await newPrototype.save();
            const result = await PrototypeModel.canUserAccess(
                mockUserId1,
                newPrototype.id as string
            );
            expect(result).toBe(true);
        });

        it('should return true if user can access prototype through the sharedWithUserIds', async () => {
            const newPrototype = new Prototype({
                ...mockPrototype1,
                sharedWithUserIds: [mockUserId2],
            });
            await newPrototype.save();
            const result = await PrototypeModel.canUserAccess(
                mockUserId2,
                newPrototype.id as string
            );
            expect(result).toBe(true);
        });

        it('should return false if user cannot access prototype', async () => {
            const result = await PrototypeModel.canUserAccess(
                mockUserId1,
                prototypeId2.toString()
            );
            expect(result).toBe(false);
        });

        it('should throw when error occurs in canUserAccess', async () => {
            await disconnectFromDatabase();
            await expect(
                PrototypeModel.canUserAccess(mockUserId1, mockPrototypeId1)
            ).rejects.toThrow(
                'Client must be connected before running operations'
            );
        });
    });

    describe('countByUserId', () => {
        it('should count prototypes by user ID', async () => {
            const newPrototype = new Prototype(mockPrototype1);
            await newPrototype.save();
            const result = await PrototypeModel.countByUserId(
                mockUserId1,
                false
            );
            expect(result).toBe(1);
        });

        it('should only include those with no previousId when onlyCreated is true', async () => {
            const newPrototype = new Prototype(mockPrototype1);
            await newPrototype.save();
            const newPrototype2 = new Prototype({
                ...mockPrototype2,
                workspaceId: mockUser1PersonalWorkspaceId,
            });
            await newPrototype2.save();
            const result = await PrototypeModel.countByUserId(
                mockUserId1,
                true
            );
            expect(result).toBe(1);
        });

        it('should throw when error occurs in countByUserId', async () => {
            await disconnectFromDatabase();
            await expect(
                PrototypeModel.countByUserId(mockUserId1, false)
            ).rejects.toThrow(
                'Client must be connected before running operations'
            );
        });
    });

    describe('countByUserIdAndWorkspaceId', () => {
        it('should count prototypes by user ID and workspace ID', async () => {
            const newPrototype = new Prototype(mockPrototype1);
            await newPrototype.save();
            const result = await PrototypeModel.countByUserIdAndWorkspaceId(
                mockUserId1,
                mockUser1PersonalWorkspaceId
            );
            expect(result).toBe(1);
        });

        it('should return 0 if the user cannot access the workspace', async () => {
            const newPrototype = new Prototype(mockPrototype1);
            await newPrototype.save();
            const result = await PrototypeModel.countByUserIdAndWorkspaceId(
                mockUserId2,
                mockUser1PersonalWorkspaceId
            );
            expect(result).toBe(0);
        });

        it('should throw when error occurs in countByUserIdAndWorkspaceId', async () => {
            await disconnectFromDatabase();
            await expect(
                PrototypeModel.countByUserIdAndWorkspaceId(
                    mockUserId1,
                    mockUser1PersonalWorkspaceId
                )
            ).rejects.toThrow(
                'Client must be connected before running operations'
            );
        });
    });

    describe('deleteById', () => {
        it('should delete a prototype by ID', async () => {
            const newPrototype = new Prototype(mockPrototype1);
            await newPrototype.save();
            const result = await PrototypeModel.deleteById(mockPrototypeId1);
            expect(result).toBe(true);
        });

        it('should throw when error occurs in deleteById', async () => {
            await disconnectFromDatabase();
            await expect(
                PrototypeModel.deleteById(mockPrototypeId1)
            ).rejects.toThrow(
                'Client must be connected before running operations'
            );
        });
    });

    describe('getById', () => {
        it('should get a prototype by ID', async () => {
            const newPrototype = new Prototype(mockPrototype1);
            await newPrototype.save();
            const result = await PrototypeModel.getById(mockPrototypeId1);
            expect(result?.id).toBe(mockPrototypeId1);
        });

        it('should return null if prototype not found', async () => {
            const result = await PrototypeModel.getById(
                prototypeId2.toString()
            );
            expect(result).toBeNull();
        });

        it('should throw when error occurs in getById', async () => {
            await expect(PrototypeModel.getById('invalid-id')).rejects.toThrow(
                'Cast to ObjectId failed for value "invalid-id" (type string) at path "_id" for model "Prototype"'
            );
        });
    });

    describe('getByUserId', () => {
        it('should get prototypes by user ID', async () => {
            const result = await PrototypeModel.getByUserId(mockUserId1, false);
            expect(Array.isArray(result)).toBe(true);
        });

        it('should throw when error occurs in getByUserId', async () => {
            await disconnectFromDatabase();
            await expect(
                PrototypeModel.getByUserId(mockUserId1, false)
            ).rejects.toThrow(
                'Client must be connected before running operations'
            );
        });
    });

    describe('getByWorkspaceId', () => {
        it('should get prototypes by workspace ID', async () => {
            const newPrototype = new Prototype(mockPrototype1);
            await newPrototype.save();
            const result = await PrototypeModel.getByWorkspaceId(
                mockUser1PersonalWorkspaceId,
                mockUserId1,
                false
            );
            expect(result).toContainEqual(
                expect.objectContaining({
                    workspaceId: mockUser1PersonalWorkspaceId,
                })
            );
        });

        it('should return an empty array if the user cannot access the workspace', async () => {
            const newPrototype = new Prototype(mockPrototype1);
            await newPrototype.save();
            const result = await PrototypeModel.getByWorkspaceId(
                mockUser1PersonalWorkspaceId,
                mockUserId2,
                false
            );
            expect(result).toEqual([]);
        });

        it('should return only items without a previousId if onlyCreated is true', async () => {
            const newPrototype = new Prototype(mockPrototype1);
            await newPrototype.save();
            const newPrototype2 = new Prototype({
                ...mockPrototype2,
                workspaceId: mockUser1PersonalWorkspaceId,
            });
            await newPrototype2.save();
            const result = await PrototypeModel.getByWorkspaceId(
                mockUser1PersonalWorkspaceId,
                mockUserId1,
                true
            );
            expect(result).toHaveLength(1);
        });

        it('should throw when error occurs in getByWorkspaceId', async () => {
            await disconnectFromDatabase();
            await expect(
                PrototypeModel.getByWorkspaceId(
                    mockUser1PersonalWorkspaceId,
                    mockUserId1,
                    false
                )
            ).rejects.toThrow(
                'Client must be connected before running operations'
            );
        });
    });

    describe('getPreviousPrototypes', () => {
        it('should return no previous prototypes if none exist', async () => {
            const newPrototype = new Prototype(mockPrototype1);
            await newPrototype.save();
            const result = await PrototypeModel.getPreviousPrototypes(
                mockPrototypeId1,
                mockUserId1
            );
            expect(result).toHaveLength(0);
        });

        it('should return previous prototypes if they do exist', async () => {
            const newPrototype = new Prototype(mockPrototype1);
            await newPrototype.save();
            const newPrototype2 = new Prototype({
                ...mockPrototype2,
                workspaceId: mockUser1PersonalWorkspaceId,
            });
            await newPrototype2.save();
            const result = await PrototypeModel.getPreviousPrototypes(
                mockPrototypeId2,
                mockUserId1
            );
            expect(result).toHaveLength(1);
        });

        it('should not return previous prototypes if the user cannot access them', async () => {
            const newPrototype = new Prototype(mockPrototype1);
            await newPrototype.save();
            const newPrototype2 = new Prototype({
                ...mockPrototype2,
                workspaceId: mockUser1PersonalWorkspaceId,
            });
            await newPrototype2.save();
            const result = await PrototypeModel.getPreviousPrototypes(
                mockPrototypeId2,
                mockUserId2
            );
            expect(result).toHaveLength(0);
        });

        it('should throw when error occurs in getPreviousPrototypes', async () => {
            await disconnectFromDatabase();
            await expect(
                PrototypeModel.getPreviousPrototypes(
                    mockPrototypeId1,
                    mockUserId1
                )
            ).rejects.toThrow(
                'Client must be connected before running operations'
            );
        });
    });

    describe('store', () => {
        it('should store a new prototype', async () => {
            const result = await PrototypeModel.store(mockPrototype1);
            expect(result.id).toBe(mockPrototype1.id);
        });

        it('should throw when error occurs in store', async () => {
            await disconnectFromDatabase();
            await expect(PrototypeModel.store(mockPrototype1)).rejects.toThrow(
                'Client must be connected before running operations'
            );
        });
    });

    describe('update', () => {
        it('should update a prototype', async () => {
            const newPrototype = new Prototype(mockPrototype1);
            await newPrototype.save();
            const result = await PrototypeModel.update(
                newPrototype.id as string,
                { firstPrompt: 'new-first-prompt' }
            );
            expect(result?.firstPrompt).toBe('new-first-prompt');
        });

        it('should throw when error occurs in update', async () => {
            await disconnectFromDatabase();
            await expect(
                PrototypeModel.update(mockPrototypeId1, {
                    firstPrompt: 'new-first-prompt',
                })
            ).rejects.toThrow(
                'Client must be connected before running operations'
            );
        });
    });
});

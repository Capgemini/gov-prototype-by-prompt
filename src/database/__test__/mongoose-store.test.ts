import {
    prototypeData1,
    prototypeId1,
    user1,
    user1PersonalWorkspace,
    user1PersonalWorkspaceId,
    userId1,
} from '../../../jest/mockTestData';
import { PrototypeDesignSystemsType } from '../../types';

const userId = userId1.toString();
const prototypeId = prototypeId1.toString();
const workspaceId = user1PersonalWorkspaceId.toString();
const prototypeModelCanUserAccess = jest.fn();
const workspaceModelCanUserAccess = jest.fn();
const prototypeModelCountByUserId = jest.fn();
const prototypeModelCountByUserIdAndWorkspaceId = jest.fn();
const workspaceModelCountByUserId = jest.fn();
const userModelCountAll = jest.fn();
const userModelGetAll = jest.fn();
const prototypeModelGetPreviousPrototypes = jest.fn();
const prototypeModelGetById = jest.fn();
const prototypeModelGetByUserId = jest.fn();
const userModelGetByEmail = jest.fn();
const userModelGetById = jest.fn();
const workspaceModelGetById = jest.fn();
const workspaceModelGetByUserId = jest.fn();
const prototypeModelStore = jest.fn();
const userModelStore = jest.fn();
const workspaceModelStore = jest.fn();
const prototypeModelUpdate = jest.fn();
const userModelUpdate = jest.fn();
const workspaceModelUpdate = jest.fn();

jest.mock('../models', () => ({
    PrototypeModel: {
        canUserAccess: prototypeModelCanUserAccess,
        countByUserId: prototypeModelCountByUserId,
        countByUserIdAndWorkspaceId: prototypeModelCountByUserIdAndWorkspaceId,
        getById: prototypeModelGetById,
        getByUserId: prototypeModelGetByUserId,
        getPreviousPrototypes: prototypeModelGetPreviousPrototypes,
        store: prototypeModelStore,
        update: prototypeModelUpdate,
    },
    UserModel: {
        countAll: userModelCountAll,
        getAll: userModelGetAll,
        getByEmail: userModelGetByEmail,
        getById: userModelGetById,
        store: userModelStore,
        update: userModelUpdate,
    },
    WorkspaceModel: {
        canUserAccess: workspaceModelCanUserAccess,
        countByUserId: workspaceModelCountByUserId,
        getById: workspaceModelGetById,
        getByUserId: workspaceModelGetByUserId,
        store: workspaceModelStore,
        update: workspaceModelUpdate,
    },
}));

test('canUserAccessPrototype calls PrototypeModel.canUserAccess()', async () => {
    const { canUserAccessPrototype } = await import('../mongoose-store');
    prototypeModelCanUserAccess.mockResolvedValue(true);
    const result = await canUserAccessPrototype(userId, prototypeId);
    expect(result).toBe(true);
    expect(prototypeModelCanUserAccess).toHaveBeenCalledWith(
        userId,
        prototypeId
    );
});

test('canUserAccessWorkspace calls WorkspaceModel.canUserAccess()', async () => {
    const { canUserAccessWorkspace } = await import('../mongoose-store');
    workspaceModelCanUserAccess.mockResolvedValue(true);
    const result = await canUserAccessWorkspace(userId, workspaceId);
    expect(result).toBe(true);
    expect(workspaceModelCanUserAccess).toHaveBeenCalledWith(
        userId,
        workspaceId
    );
});

test('countAllUsers calls UserModel.countAll()', async () => {
    const { countAllUsers } = await import('../mongoose-store');
    userModelCountAll.mockResolvedValue(5);
    const result = await countAllUsers();
    expect(result).toBe(5);
    expect(userModelCountAll).toHaveBeenCalled();
});

test('countPrototypesByUserId calls PrototypeModel.countByUserId()', async () => {
    const { countPrototypesByUserId } = await import('../mongoose-store');
    prototypeModelCountByUserId.mockResolvedValue(5);
    const onlyCreated = true;
    const result = await countPrototypesByUserId(userId, onlyCreated);
    expect(result).toBe(5);
    expect(prototypeModelCountByUserId).toHaveBeenCalledWith(
        userId,
        onlyCreated
    );
});

test('countPrototypesByUserIdAndWorkspaceId calls PrototypeModel.countByUserIdAndWorkspaceId()', async () => {
    const { countPrototypesByUserIdAndWorkspaceId } =
        await import('../mongoose-store');
    prototypeModelCountByUserIdAndWorkspaceId.mockResolvedValue(3);
    const result = await countPrototypesByUserIdAndWorkspaceId(
        userId,
        workspaceId
    );
    expect(result).toBe(3);
    expect(prototypeModelCountByUserIdAndWorkspaceId).toHaveBeenCalledWith(
        userId,
        workspaceId
    );
});

test('countWorkspacesByUserId calls WorkspaceModel.countByUserId()', async () => {
    const { countWorkspacesByUserId } = await import('../mongoose-store');
    workspaceModelCountByUserId.mockResolvedValue(2);
    const result = await countWorkspacesByUserId(userId);
    expect(result).toBe(2);
    expect(workspaceModelCountByUserId).toHaveBeenCalledWith(userId);
});

test('getAllUsers calls UserModel.getAll()', async () => {
    const { getAllUsers } = await import('../mongoose-store');
    userModelGetAll.mockResolvedValue(['user1', 'user2']);
    const result = await getAllUsers();
    expect(result).toEqual(['user1', 'user2']);
    expect(userModelGetAll).toHaveBeenCalled();
});

test('getPreviousPrototypes calls PrototypeModel.getPreviousPrototypes()', async () => {
    const { getPreviousPrototypes } = await import('../mongoose-store');
    prototypeModelGetPreviousPrototypes.mockResolvedValue(['proto1', 'proto2']);
    const result = await getPreviousPrototypes(prototypeId, userId);
    expect(result).toEqual(['proto1', 'proto2']);
    expect(prototypeModelGetPreviousPrototypes).toHaveBeenCalledWith(
        prototypeId,
        userId
    );
});

test('getPrototypeById calls PrototypeModel.getById()', async () => {
    const { getPrototypeById } = await import('../mongoose-store');
    prototypeModelGetById.mockResolvedValue('proto');
    const result = await getPrototypeById(prototypeId);
    expect(result).toBe('proto');
    expect(prototypeModelGetById).toHaveBeenCalledWith(prototypeId);
});

test('getPrototypesByUserId calls PrototypeModel.getByUserId()', async () => {
    const { getPrototypesByUserId } = await import('../mongoose-store');
    prototypeModelGetByUserId.mockResolvedValue(['protoA', 'protoB']);
    const onlyCreated = false;
    const result = await getPrototypesByUserId(userId, onlyCreated);
    expect(result).toEqual(['protoA', 'protoB']);
    expect(prototypeModelGetByUserId).toHaveBeenCalledWith(userId, onlyCreated);
});

test('getUserByEmail calls UserModel.getByEmail()', async () => {
    const { getUserByEmail } = await import('../mongoose-store');
    userModelGetByEmail.mockResolvedValue('user');
    const email = 'test@example.com';
    const result = await getUserByEmail(email);
    expect(result).toBe('user');
    expect(userModelGetByEmail).toHaveBeenCalledWith(email);
});

test('getUserById calls UserModel.getById()', async () => {
    const { getUserById } = await import('../mongoose-store');
    userModelGetById.mockResolvedValue('user');
    const result = await getUserById(userId);
    expect(result).toBe('user');
    expect(userModelGetById).toHaveBeenCalledWith(userId);
});

test('getWorkspaceById calls WorkspaceModel.getById()', async () => {
    const { getWorkspaceById } = await import('../mongoose-store');
    workspaceModelGetById.mockResolvedValue('workspace');
    const result = await getWorkspaceById(workspaceId);
    expect(result).toBe('workspace');
    expect(workspaceModelGetById).toHaveBeenCalledWith(workspaceId);
});

test('getWorkspacesByUserId calls WorkspaceModel.getByUserId()', async () => {
    const { getWorkspacesByUserId } = await import('../mongoose-store');
    workspaceModelGetByUserId.mockResolvedValue(['ws1', 'ws2']);
    const result = await getWorkspacesByUserId(userId);
    expect(result).toEqual(['ws1', 'ws2']);
    expect(workspaceModelGetByUserId).toHaveBeenCalledWith(userId);
});

test('storePrototype calls PrototypeModel.store()', async () => {
    const { storePrototype } = await import('../mongoose-store');
    prototypeModelStore.mockResolvedValue(prototypeData1);
    const result = await storePrototype(prototypeData1);
    expect(result).toBe(prototypeData1);
    expect(prototypeModelStore).toHaveBeenCalledWith(prototypeData1);
});

test('storeUser calls UserModel.store()', async () => {
    const { storeUser } = await import('../mongoose-store');
    userModelStore.mockResolvedValue(user1);
    const result = await storeUser(user1);
    expect(result).toBe(user1);
    expect(userModelStore).toHaveBeenCalledWith(user1);
});

test('storeWorkspace calls WorkspaceModel.store()', async () => {
    const { storeWorkspace } = await import('../mongoose-store');
    workspaceModelStore.mockResolvedValue(user1PersonalWorkspace);
    const result = await storeWorkspace(user1PersonalWorkspace);
    expect(result).toBe(user1PersonalWorkspace);
    expect(workspaceModelStore).toHaveBeenCalledWith(user1PersonalWorkspace);
});

test('updatePrototype calls PrototypeModel.update()', async () => {
    const { updatePrototype } = await import('../mongoose-store');
    const updates = { designSystem: 'GOV.UK' as PrototypeDesignSystemsType };
    prototypeModelUpdate.mockResolvedValue(updates);
    const result = await updatePrototype(prototypeId, updates);
    expect(result).toBe(updates);
    expect(prototypeModelUpdate).toHaveBeenCalledWith(prototypeId, updates);
});

test('updateUser calls UserModel.update()', async () => {
    const { updateUser } = await import('../mongoose-store');
    const updates = { name: 'updated' };
    userModelUpdate.mockResolvedValue(updates);
    const result = await updateUser(userId, updates);
    expect(result).toBe(updates);
    expect(userModelUpdate).toHaveBeenCalledWith(userId, updates);
});

test('updateWorkspace calls WorkspaceModel.update()', async () => {
    const { updateWorkspace } = await import('../mongoose-store');
    const updates = { name: 'updated' };
    workspaceModelUpdate.mockResolvedValue(updates);
    const result = await updateWorkspace(workspaceId, updates);
    expect(result).toBe(updates);
    expect(workspaceModelUpdate).toHaveBeenCalledWith(workspaceId, updates);
});

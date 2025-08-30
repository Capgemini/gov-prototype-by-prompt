import { user1 } from '../../../../jest/mockTestData';
import { IUser } from '../../../types';
import { disconnectFromDatabase } from '../../connection/mongoose';
import { UserModel } from '../userModel';

const mockUser = user1;

describe('UserModel', () => {
    it('should get empty array when no users', async () => {
        expect(await UserModel.getAll()).toEqual([]);
    });

    it('should store new user', async () => {
        const result = await UserModel.store(mockUser);

        expect(result.email).toEqual(mockUser.email);

        expect((await UserModel.getAll()).length).toEqual(1);
    });

    it('should return false when you delete with a missing id', async () => {
        expect(await UserModel.deleteById('5ebadc45a99bde77b2efb20e')).toEqual(
            false
        );
    });

    it('should return true when you delete with a user', async () => {
        const user = await UserModel.store(mockUser);

        expect(await UserModel.deleteById(user.id)).toEqual(true);
    });

    it('should throw when trying to delete an invalid id', async () => {
        await expect(UserModel.deleteById('fake-id')).rejects.toThrow(
            'Cast to ObjectId failed for value "fake-id" (type string) at path "_id" for model "User"'
        );
    });

    it('should throw get all when error occurs', async () => {
        await disconnectFromDatabase();
        await expect(UserModel.getAll()).rejects.toThrow(
            'Client must be connected before running operations'
        );
    });

    it('should throw get by email when error occurs', async () => {
        await disconnectFromDatabase();
        await expect(UserModel.getByEmail('fake-email')).rejects.toThrow(
            'Client must be connected before running operations'
        );
    });

    it('should return null for get by email when no email', async () => {
        expect(await UserModel.getByEmail('missing-email')).toBeNull();
    });

    it('should return user when get user by email exists', async () => {
        await UserModel.store(mockUser);
        const user = await UserModel.getByEmail(mockUser.email);
        expect(user?.email).toEqual(mockUser.email);
    });

    it('should throw get by id when error occurs', async () => {
        await expect(UserModel.getById('fake-email')).rejects.toThrow(
            'Cast to ObjectId failed for value "fake-email" (type string) at path "_id" for model "User"'
        );
    });

    it('should throw store for invalid user', async () => {
        await expect(
            UserModel.store(
                {} as Omit<IUser, '_id' | 'createdAt' | 'id' | 'updatedAt'>
            )
        ).rejects.toThrow('User validation failed');
    });

    it('should throw update when error occurs', async () => {
        await expect(UserModel.update('fake-id', {})).rejects.toThrow(
            'Cast to ObjectId failed for value "fake-id" (type string) at path "_id" for model "User"'
        );
    });

    it('should return updated user for update', async () => {
        const user = await UserModel.store(mockUser);
        const updatedUser = await UserModel.update(user.id, {
            email: 'updated-email',
        });
        expect(updatedUser?.email).toEqual('updated-email');
    });
});

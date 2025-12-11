import { user1 } from '../../../../jest/mockTestData';
import { IUser, User } from '../../../types';
import { disconnectFromDatabase } from '../../connection/mongoose';
import { UserModel } from '../user-model';

const mockUser = user1;

describe('UserModel', () => {
    describe('getAll', () => {
        it('should get empty array when no users', async () => {
            expect(await UserModel.getAll()).toEqual([]);
        });

        it('should get users that exist', async () => {
            const newUser = new User(mockUser);
            await newUser.save();
            const users = await UserModel.getAll();
            expect(users).toContainEqual(
                expect.objectContaining({ email: mockUser.email })
            );
        });

        it('should throw get all when error occurs', async () => {
            await disconnectFromDatabase();
            await expect(UserModel.getAll()).rejects.toThrow(
                'Client must be connected before running operations'
            );
        });
    });

    describe('store', () => {
        it('should store new user', async () => {
            const result = await UserModel.store(mockUser);

            expect(result.email).toEqual(mockUser.email);

            expect((await UserModel.getAll()).length).toEqual(1);
        });

        it('should throw store for invalid user', async () => {
            await expect(
                UserModel.store(
                    {} as Omit<IUser, '_id' | 'createdAt' | 'id' | 'updatedAt'>
                )
            ).rejects.toThrow('User validation failed');
        });
    });

    describe('countAll', () => {
        it('should return 1 when counting users', async () => {
            const newUser = new User(mockUser);
            await newUser.save();
            expect(await UserModel.countAll()).toBe(1);
        });

        it('should throw when error occurs in countAll', async () => {
            await disconnectFromDatabase();
            await expect(UserModel.countAll()).rejects.toThrow(
                'Client must be connected before running operations'
            );
        });
    });

    describe('deleteById', () => {
        it('should return false when you delete with a missing id', async () => {
            expect(
                await UserModel.deleteById('5ebadc45a99bde77b2efb20e')
            ).toEqual(false);
        });

        it('should return true when you delete with a user', async () => {
            const newUser = new User(mockUser);
            await newUser.save();

            expect(await UserModel.deleteById(newUser.id)).toEqual(true);
        });

        it('should throw when trying to delete an invalid id', async () => {
            await expect(UserModel.deleteById('fake-id')).rejects.toThrow(
                'Cast to ObjectId failed for value "fake-id" (type string) at path "_id" for model "User"'
            );
        });
    });

    describe('getByEmail', () => {
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
            const newUser = new User(mockUser);
            await newUser.save();
            const user = await UserModel.getByEmail(mockUser.email);
            expect(user?.email).toEqual(mockUser.email);
        });
    });

    describe('getById', () => {
        it('should return user when get by id exists', async () => {
            const newUser = new User(mockUser);
            await newUser.save();
            const user = await UserModel.getById(newUser.id);
            expect(user?.id).toEqual(newUser.id);
        });

        it('should throw get by id when error occurs', async () => {
            await expect(UserModel.getById('fake-email')).rejects.toThrow(
                'Cast to ObjectId failed for value "fake-email" (type string) at path "_id" for model "User"'
            );
        });
    });

    describe('update', () => {
        it('should throw update when error occurs', async () => {
            await expect(UserModel.update('fake-id', {})).rejects.toThrow(
                'Cast to ObjectId failed for value "fake-id" (type string) at path "_id" for model "User"'
            );
        });

        it('should return updated user for update', async () => {
            const newUser = new User(mockUser);
            await newUser.save();
            const updatedUser = await UserModel.update(newUser.id, {
                email: 'updated-email',
            });
            expect(updatedUser?.email).toEqual('updated-email');
        });
    });
});

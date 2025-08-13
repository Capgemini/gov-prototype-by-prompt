import { IUser, User } from '../../types/schemas/user-schema';

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class UserModel {
    /**
     * Delete a user by ID
     */
    static async deleteById(id: string): Promise<boolean> {
        try {
            const result = await User.findByIdAndDelete(id);
            return !!result;
        } catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
    }

    /**
     * Get all users
     */
    static async getAll(): Promise<IUser[]> {
        try {
            return await User.find({});
        } catch (error) {
            console.error('Error getting all users:', error);
            throw error;
        }
    }

    /**
     * Get a user by their email
     */
    static async getByEmail(email: string): Promise<IUser | null> {
        try {
            return await User.findOne({ email: email.toLowerCase() });
        } catch (error) {
            console.error('Error getting user by email:', error);
            throw error;
        }
    }

    /**
     * Get a user by their ID
     */
    static async getById(id: string): Promise<IUser | null> {
        try {
            return await User.findById(id);
        } catch (error) {
            console.error('Error getting user by ID:', error);
            throw error;
        }
    }

    /**
     * Store a new user
     */
    static async store(
        user: Omit<
            IUser,
            '_id' | 'createdAt' | 'id' | 'personalWorkspaceId' | 'updatedAt'
        >
    ): Promise<IUser> {
        try {
            const newUser = new User(user);
            return await newUser.save();
        } catch (error) {
            console.error('Error storing user:', error);
            throw error;
        }
    }

    /**
     * Update an existing user
     */
    static async update(
        id: string,
        updates: Partial<IUser>
    ): Promise<IUser | null> {
        try {
            return await User.findByIdAndUpdate(id, updates, { new: true });
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    }
}

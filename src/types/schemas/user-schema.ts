import { model, ObjectId, Schema } from 'mongoose';

export interface IUser {
    _id: ObjectId;
    createdAt: string;
    email: string;
    id: string;
    isActive: boolean;
    isAdmin: boolean;
    name: string;
    passwordHash: string;
    personalWorkspaceId: string;
    updatedAt: string;
}

const userSchema = new Schema<IUser>(
    {
        email: {
            lowercase: true,
            required: true,
            trim: true,
            type: String,
            unique: true,
        },
        isActive: {
            required: true,
            type: Boolean,
        },
        isAdmin: {
            required: true,
            type: Boolean,
        },
        name: {
            required: true,
            trim: true,
            type: String,
        },
        passwordHash: {
            required: true,
            type: String,
        },
        personalWorkspaceId: {
            required: false,
            type: String,
        },
    },
    {
        _id: true,
        timestamps: true,
    }
);

export const User = model<IUser>('User', userSchema);

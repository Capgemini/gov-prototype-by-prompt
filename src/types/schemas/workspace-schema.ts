import { model, ObjectId, Schema } from 'mongoose';

export interface IWorkspace {
    _id: ObjectId;
    createdAt: string;
    id: string;
    isPersonalWorkspace: boolean;
    name: string;
    updatedAt: string;
    userIds: string[];
}

const workspaceSchema = new Schema<IWorkspace>(
    {
        isPersonalWorkspace: {
            default: false,
            type: Boolean,
        },
        name: {
            required: true,
            trim: true,
            type: String,
        },
        userIds: [
            {
                required: true,
                type: String,
            },
        ],
    },
    {
        timestamps: true,
    }
);

export const Workspace = model<IWorkspace>('Workspace', workspaceSchema);

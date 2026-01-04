import { model, ObjectId, Schema } from 'mongoose';

export interface IWorkspace {
    _id: ObjectId;
    createdAt: Date;
    id: string;
    isPersonalWorkspace: boolean;
    name: string;
    updatedAt: Date;
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

import { model, ObjectId, Schema } from 'mongoose';

export interface IBranchingOptions {
    next_question_value: number;
    text_value: string;
}

export interface IChatMessage {
    assistantMessage: string;
    timestamp: string;
    userMessage: string;
}

export interface ITemplateData {
    before_you_start: string;
    changes_made?: string;
    description: string;
    duration: number;
    explanation?: string;
    form_type: string;
    questions: ITemplateField[];
    suggestions?: string[];
    title: string;
    what_happens_next: string;
}

export interface ITemplateField {
    answer_type: string;
    date_of_birth_maximum_age?: number;
    date_of_birth_minimum_age?: number;
    hint_text?: string;
    next_question_value?: number;
    options?: string[];
    options_branching?: IBranchingOptions[];
    question_text: string;
    required: boolean;
    required_error_text?: string;
}

export const PrototypeDesignSystems = ['GOV.UK', 'HMRC'] as const;
export type PrototypeDesignSystemsType =
    (typeof PrototypeDesignSystems)[number];
export const DefaultPrototypeDesignSystem: PrototypeDesignSystemsType =
    'GOV.UK';

export interface IPrototypeData {
    _id: ObjectId;
    changesMade: string;
    chatHistory?: IChatMessage[];
    creatorUserId: string;
    designSystem: PrototypeDesignSystemsType;
    firstPrompt: string;
    generatedFrom: 'json' | 'text';
    id: string;
    json: ITemplateData;
    livePrototypePublic: boolean;
    livePrototypePublicPassword: string;
    previousId?: string;
    sharedWithUserIds: string[];
    timestamp: string;
    workspaceId: string;
}

export interface PrototypeQuery {
    $or: {
        sharedWithUserIds?: { $in: string[] };
        workspaceId?: { $in: Schema.Types.ObjectId[] };
    }[];
    previousId?: { $exists: false };
}

const chatMessageSchema = new Schema<IChatMessage>(
    {
        assistantMessage: {
            required: true,
            type: String,
        },
        timestamp: {
            required: true,
            type: String,
        },
        userMessage: {
            required: true,
            type: String,
        },
    },
    {
        _id: false,
    }
);

const branchingOptionsSchema = new Schema<IBranchingOptions>(
    {
        next_question_value: Number,
        text_value: String,
    },
    {
        _id: false,
    }
);

const templateFieldSchema = new Schema<ITemplateField>(
    {
        answer_type: {
            required: true,
            type: String,
        },
        date_of_birth_maximum_age: Number,
        date_of_birth_minimum_age: Number,
        hint_text: String,
        next_question_value: Number,
        options: {
            default: undefined,
            required: false,
            type: [String],
        },
        options_branching: {
            default: undefined,
            required: false,
            type: [branchingOptionsSchema],
        },
        question_text: {
            required: true,
            type: String,
        },
        required: {
            default: false,
            type: Boolean,
        },
        required_error_text: String,
    },
    {
        _id: false,
    }
);

const templateDataSchema = new Schema<ITemplateData>(
    {
        before_you_start: {
            required: true,
            type: String,
        },
        changes_made: String,
        description: {
            required: true,
            type: String,
        },
        duration: {
            required: true,
            type: Number,
        },
        explanation: {
            required: false,
            type: String,
        },
        form_type: {
            required: true,
            type: String,
        },
        questions: [templateFieldSchema],
        suggestions: {
            default: undefined,
            required: false,
            type: [String],
        },
        title: {
            required: true,
            type: String,
        },
        what_happens_next: {
            required: true,
            type: String,
        },
    },
    {
        _id: false,
    }
);

const prototypeSchema = new Schema<IPrototypeData>(
    {
        changesMade: {
            default: '',
            type: String,
        },
        chatHistory: {
            default: undefined,
            type: [chatMessageSchema],
        },
        creatorUserId: {
            required: true,
            type: String,
        },
        designSystem: {
            default: DefaultPrototypeDesignSystem,
            enum: PrototypeDesignSystems,
            required: true,
            type: String,
        },
        firstPrompt: {
            required: true,
            type: String,
        },
        generatedFrom: {
            enum: ['text', 'json'],
            required: true,
            type: String,
        },
        json: {
            required: true,
            type: templateDataSchema,
        },
        livePrototypePublic: {
            default: false,
            type: Boolean,
        },
        livePrototypePublicPassword: {
            default: '',
            type: String,
        },
        previousId: String,
        sharedWithUserIds: [String],
        timestamp: {
            required: true,
            type: String,
        },
        workspaceId: {
            required: true,
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

prototypeSchema.index({ creatorUserId: 1, timestamp: -1 });
prototypeSchema.index({ sharedWithUserIds: 1, timestamp: -1 });
prototypeSchema.index({ timestamp: -1, workspaceId: 1 });
prototypeSchema.index({ creatorUserId: 1, timestamp: -1, workspaceId: 1 });
prototypeSchema.index({ sharedWithUserIds: 1, timestamp: -1, workspaceId: 1 });
prototypeSchema.index({ previousId: 1, timestamp: -1 });

export const Prototype = model<IPrototypeData>('Prototype', prototypeSchema);

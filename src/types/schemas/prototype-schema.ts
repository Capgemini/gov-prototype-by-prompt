import { model, ObjectId, Schema } from 'mongoose';

export interface IBranchingOptions {
    next_question_value: number;
    text_value: string;
}

export interface ITemplateData {
    before_you_start: string;
    changes_made?: string;
    description: string;
    duration: number;
    explanation?: string;
    form_type: string;
    questions: ITemplateField[];
    show_progress_indicators: boolean;
    suggestions?: string[];
    title: string;
    what_happens_next: string;
}

export interface ITemplateDetailedExplanation {
    explanation_text: string;
    question_title: string;
}

export type ITemplateField =
    | ITemplateFieldBranchingChoice
    | ITemplateFieldNonBranching;

interface ITemplateFieldBase {
    answer_type: string;
    date_of_birth_maximum_age?: number;
    date_of_birth_minimum_age?: number;
    detailed_explanation?: ITemplateDetailedExplanation;
    hint_text?: string;
    options?: string[];
    options_branching?: IBranchingOptions[];
    question_text: string;
    required: boolean;
    required_error_text?: string;
}

// For "branching_choice", next_question_value is always undefined
interface ITemplateFieldBranchingChoice extends ITemplateFieldBase {
    answer_type: 'branching_choice';
    next_question_value: undefined;
}

// For all other answer_types, next_question_value is required
interface ITemplateFieldNonBranching extends ITemplateFieldBase {
    answer_type: Exclude<string, 'branching_choice'>;
    next_question_value: number;
}

export const PrototypeDesignSystems = ['GOV.UK', 'HMRC'] as const;
export type PrototypeDesignSystemsType =
    (typeof PrototypeDesignSystems)[number];
export const DefaultPrototypeDesignSystem: PrototypeDesignSystemsType =
    'GOV.UK';

export type IPrototypeData = IPrototypeDataJson | IPrototypeDataText;

export interface PrototypeQuery {
    $or: {
        sharedWithUserIds?: { $in: string[] };
        workspaceId?: { $in: Schema.Types.ObjectId[] };
    }[];
    previousId?: { $exists: false };
}

interface IPrototypeDataBase {
    _id: ObjectId;
    changesMade: string;
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

interface IPrototypeDataJson extends IPrototypeDataBase {
    generatedFrom: 'json';
    prompt: undefined;
}

interface IPrototypeDataText extends IPrototypeDataBase {
    generatedFrom: 'text';
    prompt: string;
}

const branchingOptionsSchema = new Schema<IBranchingOptions>(
    {
        next_question_value: Number,
        text_value: String,
    },
    {
        _id: false,
    }
);

const templateDetailedExplanationSchema =
    new Schema<ITemplateDetailedExplanation>(
        {
            explanation_text: {
                required: true,
                type: String,
            },
            question_title: {
                required: true,
                type: String,
            },
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
        detailed_explanation: {
            default: undefined,
            required: false,
            type: templateDetailedExplanationSchema,
        },
        hint_text: String,
        // next_question_value is only present if answer_type !== 'branching_choice'
        next_question_value: {
            required: function (this: ITemplateField) {
                return this.answer_type !== 'branching_choice';
            },
            // Only include the field if answer_type !== 'branching_choice'
            select: function (this: ITemplateField) {
                return this.answer_type !== 'branching_choice';
            },
            type: Number,
        },
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
        show_progress_indicators: {
            required: true,
            type: Boolean,
        },
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
        prompt: {
            // Only required if generatedFrom is 'text'
            required: function (this: IPrototypeData) {
                return this.generatedFrom === 'text';
            },
            type: String,
        },
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

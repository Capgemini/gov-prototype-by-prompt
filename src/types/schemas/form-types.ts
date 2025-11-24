// Types for form generation and processing
import {
    ITemplateData,
    ITemplateDetailedExplanation,
    ITemplateField,
    PrototypeDesignSystemsType,
} from './prototype-schema';

export interface FieldGeneratorOptions {
    fieldItem: ITemplateField;
    questionNumber: number;
    questionsAsHeadings: boolean;
}

export interface QuestionHeaderOptions {
    backLinkHref: string;
    designSystem: PrototypeDesignSystemsType;
    detailedExplanation?: ITemplateDetailedExplanation;
    formAction: string;
    questionNumber: number;
    questionTitle: string;
    showDemoWarning?: boolean;
    title: string;
    totalQuestions: number;
}

export type TemplateData = ITemplateData;
// Legacy type aliases for backward compatibility
export type TemplateField = ITemplateField;

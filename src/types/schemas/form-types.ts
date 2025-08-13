// Types for form generation and processing
import {
    ITemplateData,
    ITemplateField,
    PrototypeDesignSystemsType,
} from './prototype-schema';

export interface FieldGeneratorOptions {
    fieldItem: ITemplateField;
    questionNumber: number;
    questionsAsHeadings: boolean;
    totalQuestions?: number;
}

export interface QuestionHeaderOptions {
    backLinkHref: string;
    designSystem: PrototypeDesignSystemsType;
    formAction: string;
    questionTitle: string;
    showDemoWarning?: boolean;
    title: string;
}

// Re-export the template types from prototypeSchema
export { ITemplateData, ITemplateField };

export type TemplateData = ITemplateData;
// Legacy type aliases for backward compatibility
export type TemplateField = ITemplateField;

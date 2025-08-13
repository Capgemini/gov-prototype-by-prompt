export interface CheckAnswersMacroOptions {
    rows: CheckAnswersMacroOptionsRow[];
}

export interface CheckAnswersMacroOptionsRow {
    actions: {
        items: {
            href: string;
            text: string;
            visuallyHiddenText: string;
        }[];
    };
    classes: string;
    key: {
        text: string;
    };
    value: {
        classes: string;
        text: string;
    };
}

export interface FieldMacroOptions {
    attributes: Record<string, string>;
    autocomplete?: string;
    classes?: string;
    fieldset?: {
        legend?: {
            classes?: string;
            isPageHeading?: boolean;
            text?: string;
        };
    };
    hint?: { text?: string };
    id?: string;
    inputmode?: string;
    items?: object[];
    javascript?: boolean;
    label?: {
        classes?: string;
        isPageHeading?: boolean;
        text?: string;
    };
    legend?: {
        classes?: string;
        isPageHeading?: boolean;
        text?: string;
    };
    name?: string;
    namePrefix?: string;
    prefix?: { text?: string };
    spellcheck?: boolean;
    type?: string;
    value?: string;
}

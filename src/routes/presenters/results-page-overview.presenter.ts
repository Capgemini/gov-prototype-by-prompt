import { ITemplateData } from '../../types/schemas/prototype-schema';

export interface OverviewVM {
    explanation?: string;
    hasSuggestions: boolean;
    noSuggestions: boolean;

    promptType: 'json' | 'text';
    showJsonEditor: boolean;
    suggestions: SuggestionVM[];

    switchPromptButtonText: string;
}

export interface SuggestionVM {
    text: string;
    visible: boolean;
}

export function buildOverviewVM(
    json: ITemplateData,
    generatedFrom: 'json' | 'text',
    enableSuggestions: boolean
): OverviewVM {
    const promptType = generatedFrom === 'json' ? 'json' : 'text';

    const showJsonEditor = promptType === 'json';

    const switchPromptButtonText =
        promptType === 'json' ? 'Switch to text' : 'Switch to JSON';

    const rawSuggestions = json.suggestions ?? [];
    const suggestions: SuggestionVM[] = enableSuggestions
        ? rawSuggestions.slice(0, 3).map((s) => ({
              text: s,
              visible: true,
          }))
        : [];

    return {
        explanation: promptType === 'text' ? json.explanation : undefined,
        hasSuggestions: suggestions.length > 0,
        noSuggestions: suggestions.length === 0,

        promptType,
        showJsonEditor,
        suggestions,

        switchPromptButtonText,
    };
}

import { ITemplateData } from '../../types/schemas/prototype-schema';
import { buildOverviewVM } from '../presenters/prototype-overview.presenter';

const makeJson = (overrides: Partial<ITemplateData> = {}): ITemplateData => ({
    before_you_start: '',
    description: '',
    duration: 1,
    form_type: 'form',
    questions: [],
    show_progress_indicators: false,
    title: 'Test',
    what_happens_next: '',
    ...overrides,
});

describe('buildOverviewVM', () => {
    it('sets JSON mode correctly', () => {
        const vm = buildOverviewVM(makeJson(), 'json', true);
        expect(vm.promptType).toBe('json');
        expect(vm.showJsonEditor).toBe(true);
        expect(vm.switchPromptButtonText).toBe('Switch to text');
    });

    it('sets text mode correctly', () => {
        const vm = buildOverviewVM(makeJson(), 'text', true);
        expect(vm.promptType).toBe('text');
        expect(vm.showJsonEditor).toBe(false);
        expect(vm.switchPromptButtonText).toBe('Switch to JSON');
    });

    it('extracts up to 3 suggestions when enabled', () => {
        const vm = buildOverviewVM(
            makeJson({ suggestions: ['a', 'b', 'c', 'd'] }),
            'text',
            true
        );
        expect(vm.suggestions).toEqual([
            { text: 'a', visible: true },
            { text: 'b', visible: true },
            { text: 'c', visible: true },
        ]);
        expect(vm.hasSuggestions).toBe(true);
    });

    it('handles no suggestions', () => {
        const vm = buildOverviewVM(makeJson({ suggestions: [] }), 'text', true);
        expect(vm.noSuggestions).toBe(true);
    });

    it('includes explanation only for text mode', () => {
        const vm = buildOverviewVM(
            makeJson({ explanation: 'Why this form exists' }),
            'text',
            true
        );
        expect(vm.explanation).toBe('Why this form exists');

        const vm2 = buildOverviewVM(
            makeJson({ explanation: 'Hidden in JSON mode' }),
            'json',
            true
        );
        expect(vm2.explanation).toBeUndefined();
    });
});

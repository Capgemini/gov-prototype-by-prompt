import {
    ITemplateField,
    ITemplateFieldBranchingChoice,
    ITemplateFieldNonBranching,
} from '../../types/schemas/prototype-schema';
import { buildStructureVM } from '../presenters/prototype-structure.presenter';

describe('buildStructureVM (Structure presenter)', () => {
    it('maps linear and branching questions into list + mermaid, including finish/non-sequential jumps', () => {
        const q1: ITemplateFieldNonBranching = {
            answer_type: 'text',
            next_question_value: 2, // sequential → no jump shown
            question_text: 'Q1 text',
            required: true,
        };

        const q2: ITemplateFieldBranchingChoice = {
            answer_type: 'branching_choice',
            // next_question_value absent by schema for branching_choice
            next_question_value: undefined,
            options_branching: [
                { next_question_value: -1, text_value: 'Yes' }, // Finish
                { next_question_value: 3, text_value: 'No' }, // Go to Q3
            ],
            question_text: 'Q2 text',
            required: true,
        };

        const q3: ITemplateFieldNonBranching = {
            answer_type: 'text',
            next_question_value: -1, // finish → showNextJump
            question_text: 'Q3 text',
            required: true,
        };

        const vm = buildStructureVM([q1, q2, q3] as ITemplateField[]);

        // basic shape
        expect(vm.list).toHaveLength(3);
        expect(vm.mermaid).toContain('flowchart TD');
        expect(vm.mermaid).toContain('Q1["Q1 text"]');
        expect(vm.mermaid).toContain('Q1 --> Q2');
        expect(vm.mermaid).toContain('Q2 -->|Yes| Finish');
        expect(vm.mermaid).toContain('Q2 -->|No| Q3');
        expect(vm.mermaid).toContain('Q3 --> Finish');
        expect(vm.mermaid).toContain('Finish(["End"])');

        // jump visibility logic (mirrors the original NJK behavior)
        expect(vm.list[0].showNextJump).toBe(false); // 1→2 sequential
        expect(vm.list[1].branchingOptions).toEqual([
            { label: 'Yes', next: 'finish' },
            { label: 'No', next: 3 },
        ]);
        expect(vm.list[2].showNextJump).toBe(true);
        expect(vm.list[2].nextJumpTarget).toBe('finish');
    });

    it('escapes quotes in mermaid node labels', () => {
        const q: ITemplateFieldNonBranching = {
            answer_type: 'text',
            next_question_value: -1,
            question_text: 'He said "Hello"',
            required: true,
        };

        const vm = buildStructureVM([q]);
        // Mermaid label must escape the quote
        expect(vm.mermaid).toContain(String.raw`Q1["He said \"Hello\""]`);
    });

    it('is resilient to an empty list', () => {
        const vm = buildStructureVM([]);
        expect(vm.list).toEqual([]);
        expect(vm.mermaid).toContain('flowchart TD');
    });
});

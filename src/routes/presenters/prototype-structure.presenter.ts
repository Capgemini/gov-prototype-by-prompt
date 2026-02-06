import {
    ITemplateField,
    ITemplateFieldBranchingChoice,
    ITemplateFieldNonBranching,
} from '../../types/schemas/prototype-schema';

export interface BranchingOptionVM {
    label: string;
    next: 'finish' | number;
}

export interface StructureListItemVM {
    answerType: string;
    branchingOptions?: BranchingOptionVM[];
    index: number;
    maxAge?: number;
    minAge?: number;
    nextJumpTarget?: 'finish' | number;
    options?: string[];
    questionText: string;
    showNextJump?: boolean;
}

export interface StructureVM {
    list: StructureListItemVM[];
    mermaid: string;
}

export function buildStructureVM(questions: ITemplateField[]): StructureVM {
    const total = questions.length;

    const list: StructureListItemVM[] = questions.map((q, i) => {
        const index = i + 1;

        // Branching options
        const branchingOptions: BranchingOptionVM[] | undefined =
            isBranchingChoice(q) && q.options_branching
                ? q.options_branching.map((opt) => ({
                      label: opt.text_value ?? '',
                      next:
                          typeof opt.next_question_value === 'number' &&
                          opt.next_question_value > 0
                              ? opt.next_question_value
                              : 'finish',
                  }))
                : undefined;

        // Next jump visibility (mirrors original NJK):
        // {% if question.next_question_value and (not loop.last) and question.next_question_value != loop.index + 1 %}
        // Also shows for -1 (finish).
        let showNextJump = false;
        let nextJumpTarget: 'finish' | number | undefined = undefined;
        if (isNonBranching(q) && typeof q.next_question_value === 'number') {
            const nv = q.next_question_value;
            const isFinish = nv === -1;
            const isSequential = nv === index + 1;
            const notLast = index < total;

            if (isFinish || (notLast && !isSequential)) {
                showNextJump = true;
                nextJumpTarget = isFinish ? 'finish' : nv;
            }
        }

        return {
            answerType: q.answer_type,
            branchingOptions,
            index,
            maxAge:
                q.answer_type === 'date_of_birth'
                    ? q.date_of_birth_maximum_age
                    : undefined,
            minAge:
                q.answer_type === 'date_of_birth'
                    ? q.date_of_birth_minimum_age
                    : undefined,
            nextJumpTarget,
            options: q.options,
            questionText: q.question_text,
            showNextJump,
        };
    });

    const mermaid = buildMermaid(questions);
    return { list, mermaid };
}
function buildMermaid(questions: ITemplateField[]): string {
    const lines: string[] = ['flowchart TD'];

    questions.forEach((q, idx) => {
        const i = idx + 1;
        lines.push(`Q${i}["${escapeForMermaid(q.question_text)}"]`);

        if (isBranchingChoice(q) && q.options_branching?.length) {
            q.options_branching.forEach((opt) => {
                const label = escapeForMermaid(opt.text_value ?? '');
                const next =
                    typeof opt.next_question_value === 'number' &&
                    opt.next_question_value > 0
                        ? `Q${opt.next_question_value}`
                        : 'Finish';
                lines.push(`Q${i} -->|${label}| ${next}`);
            });
        } else if (isNonBranching(q)) {
            const nv = q.next_question_value;
            if (typeof nv === 'number' && nv > 0) {
                lines.push(`Q${i} --> Q${nv}`);
            } else {
                lines.push(`Q${i} --> Finish`);
            }
        } else {
            // Defensive fallback (shouldn't happen with current schema)
            lines.push(`Q${i} --> Finish`);
        }
    });

    lines.push('Finish(["End"])');
    return lines.join('\n');
}

function escapeForMermaid(text: string): string {
    return String(text).replace(/"/g, '\\"');
}

function isBranchingChoice(
    f: ITemplateField
): f is ITemplateFieldBranchingChoice {
    return f.answer_type === 'branching_choice';
}

function isNonBranching(f: ITemplateField): f is ITemplateFieldNonBranching {
    return f.answer_type !== 'branching_choice';
}

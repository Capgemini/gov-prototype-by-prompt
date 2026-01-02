import { connectToDatabase } from '../src/database';
import { Prototype } from '../src/types/schemas/index';

export function down(): void {
    throw new Error('Not implemented');
}

export async function up(): Promise<void> {
    void initializeDatabase();
    const prototypes = await Prototype.find({});
    for (const prototype of prototypes) {
        for (let i = 0; i < prototype.json.questions.length; i++) {
            // Set next_question_value for non-branching_choice questions
            const question = prototype.json.questions[i];
            if (
                question.answer_type !== 'branching_choice' &&
                question.next_question_value === undefined
            ) {
                (
                    question as { next_question_value: number | undefined }
                ).next_question_value =
                    i === prototype.json.questions.length - 1 ? -1 : i + 2;
            }
        }
        await prototype.save({ timestamps: false, validateBeforeSave: false });
    }
}

async function initializeDatabase() {
    try {
        await connectToDatabase();
        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Failed to initialize database:', error);
        process.exit(1);
    }
}

import { connectToDatabase } from '../src/database';
import { Prototype, TemplateField } from '../src/types/schemas/index';

export function down(): Promise<void> {
    throw new Error('Not implemented');
}

export async function up(): Promise<void> {
    void initializeDatabase();
    const prototypes = await Prototype.find({});
    for (const prototype of prototypes) {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (prototype.json.show_progress_indicators !== undefined) continue;
        prototype.json.show_progress_indicators =
            !prototype.json.questions.some(
                (q: TemplateField) => q.answer_type === 'branching_choice'
            );
        await prototype.save({ timestamps: false });
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

import { connectToDatabase } from '../src/database';
import { Prototype } from '../src/types/schemas/index';

export function down(): Promise<void> {
    throw new Error('Not implemented');
}

export async function up(): Promise<void> {
    void initializeDatabase();
    await Prototype.updateMany(
        { 'json.show_progress_indicators': { $exists: false } },
        [
            {
                $set: {
                    'json.show_progress_indicators': {
                        $not: {
                            $in: [
                                'branching_choice',
                                {
                                    $map: {
                                        as: 'q',
                                        in: '$$q.answer_type',
                                        input: '$json.questions',
                                    },
                                },
                            ],
                        },
                    },
                },
            },
        ],
        { timestamps: false, updatePipeline: true }
    );
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

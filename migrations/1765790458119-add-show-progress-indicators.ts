import { connectToDatabase } from '../src/database';
import { Prototype } from '../src/types/schemas/index';

export function down(): Promise<void> {
    throw new Error('Not implemented');
}

export async function up(): Promise<void> {
    await connectToDatabase();
    // Update prototypes where show_progress_indicators is not set
    // Set show_progress_indicators to true unless the prototype has
    // question of type 'branching_choice' in its json.questions array
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

import { connectToDatabase } from '../src/database';
import { Prototype } from '../src/types/schemas/index';

export function down(): Promise<void> {
    throw new Error('Not implemented');
}

export async function up(): Promise<void> {
    void initializeDatabase();
    const prototypes = await Prototype.find({});
    const placeholderPrompt = 'Prompt not found.';
    for (const prototype of prototypes) {
        // If the prototype was generated from text and doesn't have a prompt yet
        if (
            prototype.generatedFrom === 'text' &&
            (prototype as { prompt?: string }).prompt === undefined
        ) {
            // Get the chatHistory field
            const chatHistory = prototype.get('chatHistory') as
                | undefined
                | { userMessage: string }[];

            // Set prompt to the userMessage of the last chatHistory entry if it exists
            if (
                chatHistory !== undefined &&
                Array.isArray(chatHistory) &&
                chatHistory.length > 0
            ) {
                prototype.prompt =
                    chatHistory.at(-1)?.userMessage ?? placeholderPrompt;
            } else {
                // Otherwise set prompt to a placeholder value
                prototype.prompt = placeholderPrompt;
            }
        } else if (prototype.generatedFrom === 'json') {
            // Set prompt to undefined for prototypes generated from json
            prototype.prompt = undefined;
        }

        // Remove chatHistory field
        prototype.set('chatHistory', undefined, { strict: false });

        // Save the updated prototype without modifying timestamps
        await prototype.save({
            timestamps: false,
        });
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

import { connectToDatabase } from '../src/database';
import { Prototype } from '../src/types/schemas/index';

export function down(): Promise<void> {
    throw new Error('Not implemented');
}

export async function up(): Promise<void> {
    await connectToDatabase();
    const placeholderPrompt = 'Prompt not found.';

    // Iterate through all prototypes using a cursor to avoid memory issues
    const cursor = Prototype.find({}).cursor();
    for (
        let prototype = await cursor.next();
        prototype != null;
        prototype = await cursor.next()
    ) {
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
            validateBeforeSave: false,
        });
    }
}

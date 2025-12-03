// JSON Schema types
export interface JsonSchema {
    description?: string;
    examples?: string[];
    properties?: Record<
        string,
        {
            description?: string;
            examples?: string[];
            items?: JsonSchema;
            type: string | string[];
        }
    >;
    required?: string[];
    type: string | string[];
}

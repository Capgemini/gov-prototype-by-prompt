// JSON Schema types
export interface JsonSchema {
    properties?: Record<
        string,
        { items?: JsonSchema; type: string | string[] }
    >;
    required?: string[];
    type: string | string[];
}

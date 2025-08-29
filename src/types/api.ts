import { ValidationError } from 'express-validator';

// API Request/Response types
export interface APIResponse {
    errors?: Partial<ValidationError>[];
    message: string;
}

export interface CreateFormRequestBody {
    designSystem: string;
    prompt: string;
    promptType?: string;
    prototypeId?: string;
    workspaceId: string;
}

export interface UpdateFormRequestBody {
    designSystem: string;
    prompt?: string;
    prototypeId: string;
    workspaceId: string;
}

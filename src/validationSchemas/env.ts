import { z } from 'zod';

const ENVS: readonly [string, ...string[]] = [
    'development',
    'production',
    'test',
];

const LLM_PROVIDERS: readonly [string, ...string[]] = [
    'openai',
    'gemini',
];

const trueFalseString = z
    .string()
    .refine((val) => ['false', 'true'].includes(val.trim().toLowerCase()), {
        message: "Must be 'true' or 'false' (case insensitive)",
    });

export const envVarSchema = z
    .object({
        APPLICATIONINSIGHTS_CONNECTION_STRING: z.string().optional(),
        EMAIL_ADDRESS_ALLOWED_DOMAIN: z.string().trim().optional(),
        EMAIL_ADDRESS_ALLOWED_DOMAIN_REVEAL: trueFalseString.transform(
            (value) => value.trim().toLowerCase() === 'true'
        ),
        GEMINI_API_KEY: z.string().optional(),
        GEMINI_MODEL_ID: z.string().default('gemini-3.5-flash'),
        LOG_USER_ID_IN_AZURE_APP_INSIGHTS: trueFalseString.transform(
            (value) => value.trim().toLowerCase() === 'true'
        ),
        LLM_PROVIDER: z
            .preprocess(
                (value) =>
                    LLM_PROVIDERS.includes(String(value).toLowerCase())
                        ? String(value).toLowerCase()
                        : 'openai',
                z.enum(LLM_PROVIDERS)
            )
            .default('openai'),
        MONGODB_URI: z.string(),
        NODE_ENV: z.preprocess(
            (value) => (ENVS.includes(String(value)) ? value : 'production'),
            z.enum(ENVS)
        ),
        OPENAI_API_KEY: z.string(),
        OPENAI_BASE_URL: z.string(),
        OPENAI_MODEL_ID: z.string(),
        RATE_LIMITER_ENABLED: trueFalseString.transform(
            (value) => value.trim().toLowerCase() === 'true'
        ),
        RATE_LIMITER_MAX_REQUESTS: z
            .string()
            .transform((value) => Number.parseInt(value, 10))
            .optional(),
        RATE_LIMITER_WINDOW_MINUTES: z
            .string()
            .transform((value) => Number.parseInt(value, 10))
            .optional(),
        SESSION_SECRET: z.string(),
        SUGGESTIONS_ENABLED: trueFalseString.transform(
            (value) => value.trim().toLowerCase() === 'true'
        ),
    })
    .superRefine((env, ctx) => {
        if (env.RATE_LIMITER_ENABLED) {
            if (
                env.RATE_LIMITER_MAX_REQUESTS === undefined ||
                Number.isNaN(env.RATE_LIMITER_MAX_REQUESTS)
            ) {
                ctx.addIssue({
                    code: 'custom',
                    message:
                        'RATE_LIMITER_MAX_REQUESTS is required when RATE_LIMITER_ENABLED is true and must be a number',
                    path: ['RATE_LIMITER_MAX_REQUESTS'],
                });
            }
            if (
                env.RATE_LIMITER_WINDOW_MINUTES === undefined ||
                Number.isNaN(env.RATE_LIMITER_WINDOW_MINUTES)
            ) {
                ctx.addIssue({
                    code: 'custom',
                    message:
                        'RATE_LIMITER_WINDOW_MINUTES is required when RATE_LIMITER_ENABLED is true and must be a number',
                    path: ['RATE_LIMITER_WINDOW_MINUTES'],
                });
            }
        }
        if (env.LLM_PROVIDER === 'gemini' && !env.GEMINI_API_KEY) {
            ctx.addIssue({
                code: 'custom',
                message:
                    'GEMINI_API_KEY is required when LLM_PROVIDER is set to "gemini"',
                path: ['GEMINI_API_KEY'],
            });
        }
    });

// Example environment variables for testing purposes
// Call envVarSchema.parse(exampleEnvVars) to validate
export const exampleEnvVars = {
    APPLICATIONINSIGHTS_CONNECTION_STRING:
        'application-insights-connection-string',
    EMAIL_ADDRESS_ALLOWED_DOMAIN: 'example.com',
    EMAIL_ADDRESS_ALLOWED_DOMAIN_REVEAL: 'false',
    GEMINI_API_KEY: 'gemini-key',
    GEMINI_MODEL_ID: 'gemini-3.5-flash',
    LOG_USER_ID_IN_AZURE_APP_INSIGHTS: 'false',
    LLM_PROVIDER: 'openai',
    MONGODB_URI: 'mongodb://localhost',
    NODE_ENV: 'production',
    OPENAI_API_KEY: 'key',
    OPENAI_BASE_URL: 'https://example.com/v1/',
    OPENAI_MODEL_ID: 'model',
    RATE_LIMITER_ENABLED: 'true',
    RATE_LIMITER_MAX_REQUESTS: '200',
    RATE_LIMITER_WINDOW_MINUTES: '15',
    SESSION_SECRET: 'session-secret',
    SUGGESTIONS_ENABLED: 'false',
};

import { z } from 'zod';

const ENVS: readonly [string, ...string[]] = [
    'development',
    'production',
    'test',
];

const trueFalseString = z
    .string()
    .refine((val) => ['false', 'true'].includes(val.trim().toLowerCase()), {
        message: "Must be 'true' or 'false' (case insensitive)",
    });

export const envVarSchema = z
    .object({
        APPLICATIONINSIGHTS_CONNECTION_STRING: z.string().optional(),
        AZURE_OPENAI_API_KEY: z.string(),
        AZURE_OPENAI_API_VERSION: z.string(),
        AZURE_OPENAI_DEPLOYMENT_NAME: z.string(),
        AZURE_OPENAI_ENDPOINT: z.string(),
        AZURE_OPENAI_MODEL_NAME: z.string(),
        EMAIL_ADDRESS_ALLOWED_DOMAIN: z.string().optional(),
        EMAIL_ADDRESS_ALLOWED_DOMAIN_REVEAL: trueFalseString.transform(
            (value) => value.trim().toLowerCase() === 'true'
        ),
        LOG_USER_ID_IN_AZURE_APP_INSIGHTS: trueFalseString.transform(
            (value) => value.trim().toLowerCase() === 'true'
        ),
        MONGODB_URI: z.string(),
        NODE_ENV: z.preprocess(
            (value) => (ENVS.includes(String(value)) ? value : 'production'),
            z.enum(ENVS)
        ),
        RATE_LIMITER_ENABLED: trueFalseString.transform(
            (value) => value.trim().toLowerCase() === 'true'
        ),
        RATE_LIMITER_MAX_REQUESTS: z
            .string()
            .transform((value) => parseInt(value, 10))
            .optional(),
        RATE_LIMITER_WINDOW_MINUTES: z
            .string()
            .transform((value) => parseInt(value, 10))
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
                isNaN(env.RATE_LIMITER_MAX_REQUESTS)
            ) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message:
                        'RATE_LIMITER_MAX_REQUESTS is required when RATE_LIMITER_ENABLED is true and must be a number',
                    path: ['RATE_LIMITER_MAX_REQUESTS'],
                });
            }
            if (
                env.RATE_LIMITER_WINDOW_MINUTES === undefined ||
                isNaN(env.RATE_LIMITER_WINDOW_MINUTES)
            ) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message:
                        'RATE_LIMITER_WINDOW_MINUTES is required when RATE_LIMITER_ENABLED is true and must be a number',
                    path: ['RATE_LIMITER_WINDOW_MINUTES'],
                });
            }
        }
    });

// Example environment variables for testing purposes
// Call envVarSchema.parse(exampleEnvVars) to validate
export const exampleEnvVars = {
    APPLICATIONINSIGHTS_CONNECTION_STRING:
        'application-insights-connection-string',
    AZURE_OPENAI_API_KEY: 'key',
    AZURE_OPENAI_API_VERSION: '2000-01-01',
    AZURE_OPENAI_DEPLOYMENT_NAME: 'deployment',
    AZURE_OPENAI_ENDPOINT: 'https://example.com',
    AZURE_OPENAI_MODEL_NAME: 'model',
    EMAIL_ADDRESS_ALLOWED_DOMAIN: 'example.com',
    EMAIL_ADDRESS_ALLOWED_DOMAIN_REVEAL: 'false',
    LOG_USER_ID_IN_AZURE_APP_INSIGHTS: 'false',
    MONGODB_URI: 'mongodb://localhost',
    NODE_ENV: 'production',
    RATE_LIMITER_ENABLED: 'true',
    RATE_LIMITER_MAX_REQUESTS: '200',
    RATE_LIMITER_WINDOW_MINUTES: '15',
    SESSION_SECRET: 'session-secret',
    SUGGESTIONS_ENABLED: 'false',
};

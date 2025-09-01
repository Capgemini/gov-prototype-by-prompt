import { envVarSchema, exampleEnvVars } from '../env';

describe('envVarSchema', () => {
    it('validates a correct example', () => {
        expect(() => envVarSchema.parse(exampleEnvVars)).not.toThrow();
    });

    it('fails if required string fields are missing', () => {
        const invalid = { ...exampleEnvVars } as Record<string, unknown>;
        delete invalid.AZURE_OPENAI_API_KEY;
        expect(() => envVarSchema.parse(invalid)).toThrow();
    });

    it('transforms true/false string fields to booleans', () => {
        const valid = { ...exampleEnvVars, SUGGESTIONS_ENABLED: 'true' };
        const result = envVarSchema.parse(valid);
        expect(result.SUGGESTIONS_ENABLED).toBe(true);
        expect(typeof result.SUGGESTIONS_ENABLED).toBe('boolean');
    });

    it('NODE_ENV defaults to production if invalid', () => {
        const valid = { ...exampleEnvVars, NODE_ENV: 'invalid' };
        const result = envVarSchema.parse(valid);
        expect(result.NODE_ENV).toBe('production');
    });

    it('RATE_LIMITER_MAX_REQUESTS and WINDOW_MINUTES are numbers if provided', () => {
        const valid = {
            ...exampleEnvVars,
            RATE_LIMITER_MAX_REQUESTS: '123',
            RATE_LIMITER_WINDOW_MINUTES: '45',
        };
        const result = envVarSchema.parse(valid);
        expect(result.RATE_LIMITER_MAX_REQUESTS).toBe(123);
        expect(result.RATE_LIMITER_WINDOW_MINUTES).toBe(45);
    });

    it('validates if RATE_LIMITER_ENABLED is false', () => {
        const invalid = {
            ...exampleEnvVars,
            RATE_LIMITER_ENABLED: 'false',
        } as Record<string, unknown>;
        delete invalid.RATE_LIMITER_MAX_REQUESTS;
        delete invalid.RATE_LIMITER_WINDOW_MINUTES;
        expect(() => envVarSchema.parse(exampleEnvVars)).not.toThrow();
    });

    it('fails if RATE_LIMITER_ENABLED is true but max requests is missing', () => {
        const invalid = { ...exampleEnvVars } as Record<string, unknown>;
        delete invalid.RATE_LIMITER_MAX_REQUESTS;
        expect(() => envVarSchema.parse(invalid)).toThrow(
            /RATE_LIMITER_MAX_REQUESTS is required/
        );
    });

    it('fails if RATE_LIMITER_ENABLED is true but window minutes is missing', () => {
        const invalid = { ...exampleEnvVars } as Record<string, unknown>;
        delete invalid.RATE_LIMITER_WINDOW_MINUTES;
        expect(() => envVarSchema.parse(invalid)).toThrow(
            /RATE_LIMITER_WINDOW_MINUTES is required/
        );
    });

    it.each([['true'], ['TRUE'], ['TrUe'], ['false'], ['FALSE'], ['FaLsE']])(
        'accepts %s for trueFalseString fields',
        (val) => {
            const valid = { ...exampleEnvVars, SUGGESTIONS_ENABLED: val };
            expect(() => envVarSchema.parse(valid)).not.toThrow();
        }
    );

    it('fails for invalid trueFalseString values', () => {
        const invalid = {
            ...exampleEnvVars,
            SUGGESTIONS_ENABLED: 'not-boolean',
        };
        expect(() => envVarSchema.parse(invalid)).toThrow(
            /Must be 'true' or 'false'/
        );
    });
});

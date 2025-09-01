const setLogLevelMock = jest.fn();
const registerInstrumentationsMock = jest.fn();
const setGlobalMeterProviderMock = jest.fn();
const registerTracerProviderMock = jest.fn();
jest.doMock('@azure/logger', () => ({
    setLogLevel: setLogLevelMock,
}));
jest.doMock('@azure/monitor-opentelemetry-exporter', () => ({
    AzureMonitorMetricExporter: jest.fn().mockImplementation(() => ({})),
    AzureMonitorTraceExporter: jest.fn().mockImplementation(() => ({})),
}));
jest.doMock('@opentelemetry/api', () => ({
    metrics: {
        setGlobalMeterProvider: setGlobalMeterProviderMock,
    },
}));
jest.doMock('@opentelemetry/instrumentation', () => ({
    registerInstrumentations: registerInstrumentationsMock,
}));
jest.doMock('@opentelemetry/instrumentation-http', () => ({
    HttpInstrumentation: jest.fn().mockImplementation(() => ({
        disable: jest.fn(),
        enable: jest.fn(),
    })),
}));
jest.doMock('@opentelemetry/resources', () => ({
    resourceFromAttributes: jest.fn(),
}));
jest.doMock('@opentelemetry/sdk-metrics', () => ({
    MeterProvider: jest.fn().mockImplementation(() => ({
        getMeter: jest.fn(),
    })),
    PeriodicExportingMetricReader: jest.fn().mockImplementation(() => ({
        collect: jest.fn(),
    })),
}));
jest.doMock('@opentelemetry/sdk-node', () => ({
    NodeSDK: jest.fn().mockImplementation(() => ({
        start: jest.fn(),
        stop: jest.fn(),
    })),
}));
jest.doMock('@opentelemetry/sdk-trace-node', () => ({
    BatchSpanProcessor: jest.fn(),
    NodeTracerProvider: jest.fn().mockImplementation(() => ({
        register: registerTracerProviderMock,
    })),
}));

const OLD_ENV = { ...process.env };

beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
});

afterEach(() => {
    process.env = OLD_ENV;
});

describe('instrumentation.ts', () => {
    it.each([
        ['production', 'fakeConnectionString', true],
        ['development', undefined, false],
        ['production', undefined, false],
        [undefined, undefined, false],
    ])(
        'initialises OpenTelemetry only in production with connection string (env: %s, connectionString: %s)',
        async (env, connectionString, shouldInit) => {
            process.env.NODE_ENV = env;
            process.env.APPLICATIONINSIGHTS_CONNECTION_STRING =
                connectionString;
            const logSpy = jest.spyOn(console, 'log').mockImplementation();
            await import('../instrumentation');
            if (shouldInit) {
                expect(logSpy).toHaveBeenCalledWith(
                    'Running in production mode, initialising OpenTelemetry...'
                );
            } else {
                expect(logSpy).toHaveBeenCalledWith(
                    'Running in development mode, OpenTelemetry is not initialised.'
                );
            }
            logSpy.mockRestore();
        }
    );

    it('registers tracer provider', async () => {
        process.env.NODE_ENV = 'production';
        process.env.APPLICATIONINSIGHTS_CONNECTION_STRING =
            'fakeConnectionString';
        await import('../instrumentation');
        expect(registerTracerProviderMock).toHaveBeenCalled();
    });

    it('sets global meter provider', async () => {
        process.env.NODE_ENV = 'production';
        process.env.APPLICATIONINSIGHTS_CONNECTION_STRING =
            'fakeConnectionString';
        await import('../instrumentation');
        expect(setGlobalMeterProviderMock).toHaveBeenCalled();
    });

    it('sets log level for Azure', async () => {
        process.env.NODE_ENV = 'production';
        process.env.APPLICATIONINSIGHTS_CONNECTION_STRING =
            'fakeConnectionString';
        await import('../instrumentation');
        expect(setLogLevelMock).toHaveBeenCalledWith('warning');
    });

    it('registers instrumentations for HTTP', async () => {
        process.env.NODE_ENV = 'production';
        process.env.APPLICATIONINSIGHTS_CONNECTION_STRING =
            'fakeConnectionString';
        await import('../instrumentation');
        expect(registerInstrumentationsMock).toHaveBeenCalled();
    });
});
describe('ignoreIncomingRequestHook', () => {
    let HttpInstrumentationMock: jest.Mock;
    let ignoreIncomingRequestHook: (req: { url?: string }) => boolean;

    beforeEach(async () => {
        // Re-import to get the latest mock
        jest.resetModules();
        process.env.NODE_ENV = 'production';
        process.env.APPLICATIONINSIGHTS_CONNECTION_STRING =
            'fakeConnectionString';

        // Get the mock implementation passed to HttpInstrumentation
        await import('../instrumentation');
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const httpInstrumentationModule = jest.requireMock(
            '@opentelemetry/instrumentation-http'
        );
        HttpInstrumentationMock = (
            httpInstrumentationModule as { HttpInstrumentation: jest.Mock }
        ).HttpInstrumentation;

        // Get the options passed to the constructor
        const call = (
            HttpInstrumentationMock.mock.calls[0] as {
                ignoreIncomingRequestHook: (req: { url?: string }) => boolean;
            }[]
        )[0];
        ignoreIncomingRequestHook = call.ignoreIncomingRequestHook;
    });

    it('returns true for static asset requests', () => {
        expect(ignoreIncomingRequestHook({ url: '/assets/logo.png' })).toBe(
            true
        );
        expect(ignoreIncomingRequestHook({ url: '/assets/styles.css' })).toBe(
            true
        );
    });

    it('returns true for health check endpoint', () => {
        expect(ignoreIncomingRequestHook({ url: '/api/health' })).toBe(true);
        expect(ignoreIncomingRequestHook({ url: '/api/health/status' })).toBe(
            true
        );
    });

    it('returns false for non-static, non-health URLs', () => {
        expect(ignoreIncomingRequestHook({ url: '/api/users' })).toBe(false);
        expect(ignoreIncomingRequestHook({ url: '/home' })).toBe(false);
    });

    it('returns false if url is undefined', () => {
        expect(ignoreIncomingRequestHook({})).toBe(false);
    });
});

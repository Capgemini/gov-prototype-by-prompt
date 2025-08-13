import { setLogLevel } from '@azure/logger';
import {
    AzureMonitorMetricExporter,
    AzureMonitorTraceExporter,
} from '@azure/monitor-opentelemetry-exporter';
import { metrics } from '@opentelemetry/api';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
    MeterProvider,
    PeriodicExportingMetricReader,
} from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import {
    BatchSpanProcessor,
    NodeTracerProvider,
} from '@opentelemetry/sdk-trace-node';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import 'dotenv/config';

// Load environment variables
const nodeEnv = process.env.NODE_ENV ?? 'development';
const connectionString =
    process.env.APPLICATIONINSIGHTS_CONNECTION_STRING ?? undefined;

/**
 * Initializes OpenTelemetry for the application.
 * See https://opentelemetry.io/docs/languages/js/getting-started/nodejs/#example-application
 * See https://github.com/Azure/azure-sdk-for-js/tree/main/sdk/monitor/monitor-opentelemetry-exporter#currently-supported-environments
 */
if (nodeEnv === 'production' && connectionString) {
    console.log('Running in production mode, initialising OpenTelemetry...');

    const sdk = new NodeSDK({
        instrumentations: [],
    });

    // Create an exporter instance
    const traceExporter = new AzureMonitorTraceExporter({
        connectionString,
    });

    // Create and configure the Node Tracer provider
    const tracerProvider = new NodeTracerProvider({
        resource: resourceFromAttributes({
            [ATTR_SERVICE_NAME]: 'gov-prototype-by-prompt',
        }),
        spanProcessors: [
            new BatchSpanProcessor(traceExporter, {
                exportTimeoutMillis: 15000,
                maxQueueSize: 1000,
            }),
        ],
    });

    // Register Tracer Provider as global
    tracerProvider.register();

    // Add the exporter into the MetricReader and register it with the MeterProvider
    const metricExporter = new AzureMonitorMetricExporter({
        connectionString,
    });

    const metricReaderOptions = {
        exporter: metricExporter,
    };
    const metricReader = new PeriodicExportingMetricReader(metricReaderOptions);
    const meterProvider = new MeterProvider({
        readers: [metricReader],
    });

    // Register Meter Provider as global
    metrics.setGlobalMeterProvider(meterProvider);

    // Set the log level for Azure
    setLogLevel('warning');

    // Register instrumentations for express and the HTTP layer
    registerInstrumentations({
        instrumentations: [
            new HttpInstrumentation({
                ignoreIncomingRequestHook(req) {
                    // Ignore spans from static assets or health check endpoint.
                    const url = req.url ?? '';
                    const isStaticAsset = url.startsWith('/assets');
                    const isHealthCheck = url.startsWith('/api/health');
                    return isStaticAsset || isHealthCheck;
                },
            }),
        ],
    });

    sdk.start();
} else {
    console.log(
        'Running in development mode, OpenTelemetry is not initialised.'
    );
}

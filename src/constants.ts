import { DiagLogLevel } from "@opentelemetry/api";
import { defaultServiceName } from "@opentelemetry/resources";
import { getEnv, getEnvBoolean, getEnvNumber, getServiceDetails } from "./internal";
import { PropagationFormat, SpanProcessor, TracingConfig, TracingOptions } from "./types";

export const DEFAULT_SERVICE_NAME = defaultServiceName();

export const SERVICE_DETAILS = getServiceDetails(DEFAULT_SERVICE_NAME);

export const REQUEST_ID_PROPERTY = "requestId";

export const REQUEST_ID_HEADER = "x-request-id";

export const DEFAULT_IGNORED_PATHS = ["/ping", "/metrics", "/live", "/ready", /^\/health\/?.*$/];

export const DEFAULT_TRACING_OPTIONS: TracingOptions = {
    enabled: false,
    serviceName: SERVICE_DETAILS.name,
    serviceVersion: SERVICE_DETAILS.version,
    propagationFormat: PropagationFormat.JAEGER,
    tracerConfig: {},
    setRequestId: true,
    jaeger: {
        enabled: true,
        host: "localhost",
        port: 6832,
        spanProcessor: {
            type: SpanProcessor.BATCH
        }
    },
    console: {
        enabled: false
    },
    diagnostics: {
        enabled: false,
        logLevel: DiagLogLevel.ALL
    },
    methodInvocations: {
        enabled: true
    },
    http: {
        enabled: true,
        ignoreIncomingPaths: DEFAULT_IGNORED_PATHS
    },
    instrumentations: []
};

export const ENV_TRACING_CONFIG: TracingConfig = {
    enabled: getEnvBoolean("TRACING_ENABLED"),
    serviceName: getEnv("TRACING_SERVICE_NAME"),
    serviceVersion: getEnv("TRACING_SERVICE_VERSION"),
    propagationFormat: getEnv<PropagationFormat>("TRACING_PROPAGATION_FORMAT"),
    setRequestId: getEnvBoolean("TRACING_SET_REQUEST_ID"),
    jaeger: {
        enabled: getEnvBoolean("TRACING_JAEGER_ENABLED"),
        host: getEnv("TRACING_JAEGER_HOST"),
        port: getEnvNumber("TRACING_JAEGER_PORT"),
        endpoint: getEnv("TRACING_JAEGER_ENDPOINT"),
        spanProcessor: {
            type: getEnv<SpanProcessor>("TRACING_JAEGER_SPAN_PROCESSOR")
        }
    },
    console: {
        enabled: getEnvBoolean("TRACING_CONSOLE_ENABLED")
    },
    diagnostics: {
        enabled: getEnvBoolean("TRACING_DIAGNOSTICS_ENABLED"),
        logLevel: getEnvNumber("TRACING_DIAGNOSTICS_LOG_LEVEL")
    },
    methodInvocations: {
        enabled: getEnvBoolean("TRACING_METHOD_INVOCATIONS_ENABLED")
    },
    http: {
        enabled: getEnvBoolean("TRACING_HTTP_ENABLED")
    }
};

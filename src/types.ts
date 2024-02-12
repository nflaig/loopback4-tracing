import {
    DiagLogLevel,
    Span,
    SpanAttributes,
    SpanKind,
    SpanStatusCode,
    Tracer
} from "@opentelemetry/api";
import { ExporterConfig } from "@opentelemetry/exporter-jaeger";
import { Instrumentation } from "@opentelemetry/instrumentation";
import { HttpInstrumentationConfig } from "@opentelemetry/instrumentation-http";
import { NodeTracerConfig } from "@opentelemetry/node";
import { SemanticAttributes } from "@opentelemetry/semantic-conventions";
import { BufferConfig } from "@opentelemetry/tracing";
import { REQUEST_ID_PROPERTY } from "./constants";

export type TracingOptions = {
    enabled: boolean;
    serviceName: string;
    serviceVersion?: string;
    propagationFormat: PropagationFormat;
    tags?: Tags;
    tracerConfig: NodeTracerConfig;
    setRequestId: boolean;
    jaeger: {
        enabled: boolean;
        spanProcessor: {
            type: SpanProcessor;
            config?: BufferConfig;
        };
    } & JaegerExporterConfig;
    console: {
        enabled: boolean;
    };
    diagnostics: {
        enabled: boolean;
        logLevel: DiagLogLevel;
    };
    methodInvocations: MethodInvocationConfig;
    http: HttpInstrumentationConfig;
    instrumentations: Instrumentation[];
};

export type TracingConfig = DeepPartial<TracingOptions>;

export enum PropagationFormat {
    JAEGER = "jaeger",
    W3C = "w3c"
}

export enum SpanProcessor {
    SIMPLE = "simple",
    BATCH = "batch"
}

export type Tags = ExporterConfig["tags"];

export type JaegerExporterConfig = Omit<ExporterConfig, "serviceName" | "tags">;

export type MethodInvocationConfig = {
    enabled?: boolean;
};

export type ServiceDetails = {
    name: string;
    version?: string;
};

export type TraceOptions = {
    operationName?: string;
    attributes?: SpanAttributes;
};

export interface ErrorWithRequestId extends Error {
    [REQUEST_ID_PROPERTY]?: string;
}

export { DiagLogLevel, SemanticAttributes, Span, SpanKind, SpanStatusCode, Tracer };

type DeepPartial<T> = Partial<T> | { [P in keyof T]?: DeepPartial<T[P]> };

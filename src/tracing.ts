import {
    context,
    diag,
    DiagConsoleLogger,
    Span,
    TextMapPropagator,
    trace,
    Tracer
} from "@opentelemetry/api";
import { NonRecordingSpan } from "@opentelemetry/api/build/src/trace/NonRecordingSpan";
import { NoopTracer } from "@opentelemetry/api/build/src/trace/NoopTracer";
import { JaegerExporter } from "@opentelemetry/exporter-jaeger";
import { InstrumentationOption, registerInstrumentations } from "@opentelemetry/instrumentation";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { NodeTracerProvider } from "@opentelemetry/node";
import { JaegerPropagator } from "@opentelemetry/propagator-jaeger";
import { Resource } from "@opentelemetry/resources";
import { ResourceAttributes } from "@opentelemetry/semantic-conventions";
import {
    BatchSpanProcessor,
    ConsoleSpanExporter,
    SimpleSpanProcessor,
    SpanExporter
} from "@opentelemetry/tracing";
import debugFactory from "debug";
import { v4 as uuidv4 } from "uuid";
import { DEFAULT_TRACING_OPTIONS } from "./constants";
import { PropagationFormat, SpanProcessor, TracingConfig, TracingOptions } from "./types";
import { mergeTracingConfig } from "./utils";

const debug = debugFactory("loopback:tracing:init");

const { SERVICE_NAME, SERVICE_VERSION, SERVICE_INSTANCE_ID } = ResourceAttributes;

const exporters: SpanExporter[] = [];
let tracerProvider: NodeTracerProvider | undefined;

export let tracer: Tracer = new NoopTracer();
export let tracingOptions: TracingOptions = DEFAULT_TRACING_OPTIONS;

export function initializeTracing(config: TracingConfig = {}) {
    tracingOptions = mergeTracingConfig(config);

    const options = tracingOptions;

    if (options.enabled) {
        const resource = new Resource({
            [SERVICE_NAME]: options.serviceName,
            [SERVICE_INSTANCE_ID]: uuidv4(),
            ...(options.serviceVersion && { [SERVICE_VERSION]: options.serviceVersion })
        });

        tracerProvider = new NodeTracerProvider({ ...options.tracerConfig, resource });

        if (options.jaeger.enabled) {
            const jaegerExporter = new JaegerExporter({
                tags: options.tags,
                ...options.jaeger
            });

            if (options.jaeger.spanProcessor.type === SpanProcessor.SIMPLE) {
                tracerProvider.addSpanProcessor(new SimpleSpanProcessor(jaegerExporter));
            } else if (options.jaeger.spanProcessor.type === SpanProcessor.BATCH) {
                tracerProvider.addSpanProcessor(
                    new BatchSpanProcessor(jaegerExporter, options.jaeger.spanProcessor.config)
                );
            } else {
                throw Error(
                    `Invalid jaeger span processor type: ${options.jaeger.spanProcessor.type}`
                );
            }

            exporters.push(jaegerExporter);
        }

        if (options.console.enabled) {
            const consoleExporter = new ConsoleSpanExporter();
            tracerProvider.addSpanProcessor(new SimpleSpanProcessor(consoleExporter));
            exporters.push(consoleExporter);
        }

        if (options.diagnostics.enabled) {
            diag.setLogger(new DiagConsoleLogger(), options.diagnostics.logLevel);
        }

        let propagator: TextMapPropagator | undefined;

        if (options.propagationFormat === PropagationFormat.JAEGER) {
            propagator = new JaegerPropagator();
        } else if (options.propagationFormat !== PropagationFormat.W3C) {
            throw Error(`Invalid propagation format: ${options.propagationFormat}`);
        }

        tracerProvider.register({ propagator });

        registerInstrumentations({
            tracerProvider,
            instrumentations: [...defaultInstrumentations(options), ...options.instrumentations]
        });

        tracer = trace.getTracer(options.serviceName, options.serviceVersion);

        debug("Initialized tracing");
    }
}

export function init(config: TracingConfig = {}) {
    return initializeTracing(config);
}

export async function shutdownTracing() {
    const shutdowns: Promise<void>[] = [];

    if (tracerProvider) {
        shutdowns.push(tracerProvider.shutdown());
    }

    exporters.forEach(exporter => shutdowns.push(exporter.shutdown()));

    await Promise.all(shutdowns);
}

export function getActiveSpan(): Span {
    return trace.getSpan(context.active()) ?? new NonRecordingSpan();
}

function defaultInstrumentations(config: TracingOptions): InstrumentationOption[] {
    const { http } = config;

    const instrumentations: InstrumentationOption[] = [];

    if (http.enabled) {
        instrumentations.push(new HttpInstrumentation(http));
    }

    return instrumentations;
}

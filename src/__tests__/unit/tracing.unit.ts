import { expect, sinon } from "@loopback/testlab";
import * as api from "@opentelemetry/api";
import { NonRecordingSpan } from "@opentelemetry/api/build/src/trace/NonRecordingSpan";
import * as exporterJaeger from "@opentelemetry/exporter-jaeger";
import * as instrumentation from "@opentelemetry/instrumentation";
import * as instrumentationHttp from "@opentelemetry/instrumentation-http";
import * as node from "@opentelemetry/node";
import * as propagatorJaeger from "@opentelemetry/propagator-jaeger";
import * as resources from "@opentelemetry/resources";
import { ResourceAttributes } from "@opentelemetry/semantic-conventions";
import * as sdk from "@opentelemetry/tracing";
import proxyquire from "proxyquire";
import { DEFAULT_TRACING_OPTIONS } from "../../constants";
import { PropagationFormat, SpanProcessor, TracingConfig } from "../../types";

describe("Tracing (unit)", () => {
    let initializeTracing: (config?: TracingConfig) => void;
    let init: (config?: TracingConfig) => void;
    let shutdownTracing: () => Promise<void>;
    let getActiveSpan: () => sdk.Span;
    let sandbox: sinon.SinonSandbox;
    let tracerProvider: sinon.SinonStubbedInstance<node.NodeTracerProvider>;
    let NodeTracerProvider: sinon.SinonStub;
    let resource: sinon.SinonStubbedInstance<resources.Resource>;
    let Resource: sinon.SinonStub;
    let jaegerExporter: sinon.SinonStubbedInstance<exporterJaeger.JaegerExporter>;
    let JaegerExporter: sinon.SinonStub;
    let simpleSpanProcessor: sinon.SinonStubbedInstance<sdk.SimpleSpanProcessor>;
    let SimpleSpanProcessor: sinon.SinonStub;
    let batchSpanProcessor: sinon.SinonStubbedInstance<sdk.BatchSpanProcessor>;
    let BatchSpanProcessor: sinon.SinonStub;
    let consoleSpanExporter: sinon.SinonStubbedInstance<sdk.ConsoleSpanExporter>;
    let ConsoleSpanExporter: sinon.SinonStub;
    let DiagConsoleLogger: sinon.SinonStub;
    let diagSetLogger: sinon.SinonStub;
    let jaegerPropagator: sinon.SinonStubbedInstance<propagatorJaeger.JaegerPropagator>;
    let JaegerPropagator: sinon.SinonStub;
    let httpInstrumentation: sinon.SinonStubbedInstance<instrumentationHttp.HttpInstrumentation>;
    let HttpInstrumentation: sinon.SinonStub;
    let registerInstrumentations: sinon.SinonStub<[options: instrumentation.AutoLoaderOptions]>;
    let tracer: sinon.SinonStubbedInstance<sdk.Tracer>;
    let getTracer: sinon.SinonStub<[name: string, version?: string | undefined], api.Tracer>;
    let activeSpan: sinon.SinonStubbedInstance<sdk.Span>;
    let getSpan: sinon.SinonStub<[context: api.Context], api.Span | undefined>;

    beforeEach(function () {
        sandbox = sinon.createSandbox();

        tracerProvider = sinon.createStubInstance(node.NodeTracerProvider);
        NodeTracerProvider = sandbox.stub(node, "NodeTracerProvider").returns(tracerProvider);

        resource = sinon.createStubInstance(resources.Resource);
        Resource = sandbox.stub(resources, "Resource").returns(resource);

        jaegerExporter = sinon.createStubInstance(exporterJaeger.JaegerExporter);
        JaegerExporter = sandbox.stub(exporterJaeger, "JaegerExporter").returns(jaegerExporter);

        simpleSpanProcessor = sinon.createStubInstance(sdk.SimpleSpanProcessor);
        SimpleSpanProcessor = sandbox.stub(sdk, "SimpleSpanProcessor").returns(simpleSpanProcessor);

        batchSpanProcessor = sinon.createStubInstance(sdk.BatchSpanProcessor);
        BatchSpanProcessor = sandbox.stub(sdk, "BatchSpanProcessor").returns(batchSpanProcessor);

        consoleSpanExporter = sinon.createStubInstance(sdk.ConsoleSpanExporter);
        ConsoleSpanExporter = sandbox.stub(sdk, "ConsoleSpanExporter").returns(consoleSpanExporter);

        DiagConsoleLogger = sandbox.stub(api, "DiagConsoleLogger");
        diagSetLogger = sandbox.stub(api.diag, "setLogger");

        jaegerPropagator = sinon.createStubInstance(propagatorJaeger.JaegerPropagator);
        JaegerPropagator = sandbox
            .stub(propagatorJaeger, "JaegerPropagator")
            .returns(jaegerPropagator);

        httpInstrumentation = sinon.createStubInstance(instrumentationHttp.HttpInstrumentation);
        HttpInstrumentation = sandbox
            .stub(instrumentationHttp, "HttpInstrumentation")
            .returns(httpInstrumentation);

        registerInstrumentations = sandbox.stub(instrumentation, "registerInstrumentations");

        tracer = sinon.createStubInstance(sdk.Tracer);
        getTracer = sandbox.stub(api.trace, "getTracer").returns(tracer as any);

        activeSpan = sinon.createStubInstance(sdk.Span);
        getSpan = sandbox
            .stub(api.trace, "getSpan")
            .withArgs(api.context.active())
            .returns(activeSpan);

        ({ initializeTracing, init, shutdownTracing, getActiveSpan } = proxyquire("../../tracing", {
            "@opentelemetry/api": { DiagConsoleLogger },
            "@opentelemetry/node": { NodeTracerProvider },
            "@opentelemetry/resources": { Resource },
            "@opentelemetry/exporter-jaeger": { JaegerExporter },
            "@opentelemetry/propagator-jaeger": { JaegerPropagator },
            "@opentelemetry/tracing": {
                BatchSpanProcessor,
                ConsoleSpanExporter,
                SimpleSpanProcessor
            },
            "@opentelemetry/instrumentation": { registerInstrumentations },
            "@opentelemetry/instrumentation-http": { HttpInstrumentation }
        }));
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe("initializeTracing()", () => {
        it("should instantiate and register default tracing components and instrumentations", () => {
            initializeTracing({ enabled: true });

            sinon.assert.calledOnce(Resource);
            sinon.assert.calledWith(NodeTracerProvider, { resource });
            sinon.assert.calledOnce(JaegerExporter);
            sinon.assert.calledOnceWithMatch(BatchSpanProcessor, jaegerExporter);
            sinon.assert.calledOnceWithExactly(tracerProvider.addSpanProcessor, batchSpanProcessor);
            sinon.assert.calledOnce(JaegerPropagator);
            sinon.assert.calledOnceWithExactly(tracerProvider.register, {
                propagator: jaegerPropagator
            });
            sinon.assert.calledWithExactly(registerInstrumentations, {
                tracerProvider,
                instrumentations: [httpInstrumentation]
            });
            sinon.assert.calledOnce(HttpInstrumentation);
            sinon.assert.calledOnce(getTracer);
        });

        it("should set the service name and version provided in the configuration", () => {
            const serviceName = "test";
            const serviceVersion = "test";

            initializeTracing({ enabled: true, serviceName, serviceVersion });

            sinon.assert.calledWithMatch(Resource, {
                [ResourceAttributes.SERVICE_NAME]: serviceName,
                [ResourceAttributes.SERVICE_VERSION]: serviceVersion
            });
            sinon.assert.calledWithMatch(JaegerExporter, { ...DEFAULT_TRACING_OPTIONS.jaeger });
            sinon.assert.calledWith(getTracer, serviceName, serviceVersion);
        });

        it("should instantiate the console span exporter if enabled", () => {
            initializeTracing({ enabled: true, console: { enabled: true } });

            sinon.assert.calledOnce(ConsoleSpanExporter);
        });

        it("should instantiate and set the diag console logger if enabled", () => {
            initializeTracing({ enabled: true, diagnostics: { enabled: true } });

            sinon.assert.calledOnce(DiagConsoleLogger);
            sinon.assert.calledOnce(diagSetLogger);
        });

        it("should instantiate and add the simple span processor for jaeger if configured", () => {
            initializeTracing({
                enabled: true,
                jaeger: { spanProcessor: { type: SpanProcessor.SIMPLE } }
            });

            sinon.assert.calledOnceWithMatch(SimpleSpanProcessor, jaegerExporter);
            sinon.assert.calledOnceWithExactly(
                tracerProvider.addSpanProcessor,
                simpleSpanProcessor
            );
        });

        it("should instantiate and register additional instrumentations if enabled", () => {
            initializeTracing({
                enabled: true
            });

            sinon.assert.calledWithExactly(registerInstrumentations, {
                tracerProvider,
                instrumentations: [httpInstrumentation]
            });
        });

        it("should not instantiate any component or instrumentation if tracing is disabled", () => {
            initializeTracing();

            sinon.assert.notCalled(Resource);
            sinon.assert.notCalled(NodeTracerProvider);
            sinon.assert.notCalled(JaegerExporter);
            sinon.assert.notCalled(BatchSpanProcessor);
            sinon.assert.notCalled(tracerProvider.addSpanProcessor);
            sinon.assert.notCalled(JaegerPropagator);
            sinon.assert.notCalled(tracerProvider.register);
            sinon.assert.notCalled(registerInstrumentations);
            sinon.assert.notCalled(HttpInstrumentation);
            sinon.assert.notCalled(getTracer);
        });

        it("should not instantiate the jaeger exporter if disabled", () => {
            initializeTracing({ enabled: true, jaeger: { enabled: false } });

            sinon.assert.notCalled(JaegerExporter);
        });

        it("should not instantiate and register the jaeger propagator if w3c propagation format is configured", () => {
            initializeTracing({ enabled: true, propagationFormat: PropagationFormat.W3C });

            sinon.assert.notCalled(JaegerPropagator);
            sinon.assert.calledOnceWithExactly(tracerProvider.register, { propagator: undefined });
        });

        it("should not instantiate and register the http instrumentation if disabled", () => {
            initializeTracing({ enabled: true, http: { enabled: false } });

            sinon.assert.notCalled(HttpInstrumentation);
            sinon.assert.calledWithExactly(registerInstrumentations, {
                tracerProvider,
                instrumentations: []
            });
        });

        it("should throw an error if the configured jaeger span processor type is invalid", () => {
            const invalidSpanProcessor = "invalid" as SpanProcessor;

            expect(() =>
                initializeTracing({
                    enabled: true,
                    jaeger: { spanProcessor: { type: invalidSpanProcessor } }
                })
            ).to.throwError(`Invalid jaeger span processor type: ${invalidSpanProcessor}`);
        });

        it("should throw an error if the configured propagation format is invalid", () => {
            const invalidPropagationFormat = "invalid" as PropagationFormat;

            expect(() =>
                initializeTracing({ enabled: true, propagationFormat: invalidPropagationFormat })
            ).to.throwError(`Invalid propagation format: ${invalidPropagationFormat}`);
        });
    });

    describe("init()", () => {
        it("should invoke the initializeTracing function", () => {
            init({ enabled: true });

            sinon.assert.calledOnce(NodeTracerProvider);
            sandbox.resetHistory();

            init();

            sinon.assert.notCalled(NodeTracerProvider);
        });
    });

    describe("shutdownTracing()", () => {
        it("should invoke the shutdown method on the tracer provider and all exporters", async () => {
            initializeTracing({ enabled: true, console: { enabled: true } });

            await shutdownTracing();

            sinon.assert.calledOnce(tracerProvider.shutdown);
            sinon.assert.calledOnce(jaegerExporter.shutdown);
            sinon.assert.calledOnce(consoleSpanExporter.shutdown);
        });

        it("should not try to invoke the shutdown method if the tracer provider is not initialized", async () => {
            await shutdownTracing();

            sinon.assert.notCalled(tracerProvider.shutdown);
        });
    });

    describe("getActiveSpan()", () => {
        it("should return the currently active span", () => {
            const span = getActiveSpan();

            sinon.assert.calledOnce(getSpan);
            expect(span).to.equal(activeSpan);
        });

        it("should return a non recording span if no active context exists", () => {
            getSpan.returns(undefined);

            const span = getActiveSpan();

            sinon.assert.calledOnce(getSpan);
            expect(span).to.be.instanceOf(NonRecordingSpan);
        });
    });
});

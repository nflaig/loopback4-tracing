import { Context, InvocationContext } from "@loopback/core";
import { expect, sinon } from "@loopback/testlab";
import { SpanStatusCode } from "@opentelemetry/api";
import { Tracer } from "@opentelemetry/tracing";
import { TracingInterceptor } from "../../../interceptors";
import * as tracing from "../../../tracing";

describe("TracingInterceptor (unit)", () => {
    const methodName = "testMethod";
    const nextResult = "testResult";
    const traceId = "b450d80a67be2410";
    let tracingInterceptor: TracingInterceptor;
    let context: InvocationContext;
    let next: sinon.SinonStub;
    let sandbox: sinon.SinonSandbox;
    let startSpan: sinon.SinonStub;
    let spanContext: sinon.SinonStub;
    let setStatus: sinon.SinonSpy;
    let recordException: sinon.SinonSpy;
    let end: sinon.SinonSpy;
    let tracer: Tracer;

    beforeEach(function () {
        sandbox = sinon.createSandbox();
        next = sandbox.stub().returns(nextResult);
        spanContext = sandbox.stub().returns({ traceId });
        setStatus = sandbox.fake();
        recordException = sandbox.fake();
        end = sandbox.fake();
        startSpan = sandbox.stub().returns({ spanContext, setStatus, recordException, end });
        tracer = sandbox.stub(tracing, "tracer").returns({ startSpan })();
        sandbox.stub(tracing, "tracingOptions").value({ enabled: true });
        tracingInterceptor = new TracingInterceptor(tracer);
        context = new InvocationContext(new Context(), {}, methodName, []);
    });

    afterEach(function () {
        sandbox.restore();
    });

    it("should create a span if the interceptor method is invoked", async () => {
        const intercept = tracingInterceptor.value();

        await intercept(context, next);

        sinon.assert.calledWith(startSpan, methodName);
        sinon.assert.calledWith(setStatus, { code: SpanStatusCode.OK });
        sinon.assert.calledOnce(end);
        sinon.assert.notCalled(recordException);
    });

    it("should invoke the next method and return the invocation result", async () => {
        const intercept = tracingInterceptor.value();

        const result = await intercept(context, next);

        sinon.assert.calledOnce(next);
        expect(result).to.equal(nextResult);
    });

    it("should record the exception and set the span status to error", async () => {
        const error = new Error("something failed");
        const intercept = tracingInterceptor.value();
        next = sandbox.stub().throwsException(error);

        await expect(intercept(context, next)).to.be.rejectedWith(error);

        sinon.assert.calledWith(startSpan, methodName);
        sinon.assert.calledWith(setStatus, {
            code: SpanStatusCode.ERROR,
            message: error.message
        });
        sinon.assert.calledWith(recordException, error);
        sinon.assert.calledOnce(end);
    });
});

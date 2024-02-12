/* eslint-disable @typescript-eslint/ban-ts-comment */
import { expect, sinon } from "@loopback/testlab";
import { SpanStatusCode } from "@opentelemetry/api";
import { trace } from "../../../decorators";
import * as tracing from "../../../tracing";

describe("@trace decorator (unit)", () => {
    const asyncMethodName = "asyncTestMethod";
    const syncMethodName = "syncTestMethod";

    let sandbox: sinon.SinonSandbox;
    let startSpan: sinon.SinonStub;
    let setStatus: sinon.SinonSpy;
    let recordException: sinon.SinonSpy;
    let end: sinon.SinonSpy;

    beforeEach(function () {
        sandbox = sinon.createSandbox();
        setStatus = sandbox.fake();
        recordException = sandbox.fake();
        end = sandbox.fake();
        startSpan = sandbox.stub().returns({ setStatus, recordException, end });
        sandbox.stub(tracing, "tracer").value({ startSpan });
        sandbox.stub(tracing, "tracingOptions").value({ enabled: true });
    });

    afterEach(function () {
        sandbox.restore();
    });

    it("should create a span if the method is invoked", async () => {
        const assertSpanWasCreated = (methodName: string) => {
            sinon.assert.calledWith(startSpan, methodName);
            sinon.assert.calledWith(setStatus, { code: SpanStatusCode.OK });
            sinon.assert.calledOnce(end);
            sinon.assert.notCalled(recordException);
            sandbox.resetHistory();
        };
        class TestController {
            @trace()
            async [asyncMethodName]() {}

            @trace()
            [syncMethodName]() {}
        }
        const testController = new TestController();

        await testController[asyncMethodName]();
        assertSpanWasCreated(asyncMethodName);

        testController[syncMethodName]();
        assertSpanWasCreated(syncMethodName);
    });

    it("should record the exception and set the span status to error", async () => {
        const error = new Error("something failed");
        const assertExceptionWasRecorded = (methodName: string) => {
            sinon.assert.calledWith(startSpan, methodName);
            sinon.assert.calledWith(setStatus, {
                code: SpanStatusCode.ERROR,
                message: error.message
            });
            sinon.assert.calledWith(recordException, error);
            sinon.assert.calledOnce(end);
            sandbox.resetHistory();
        };
        class TestController {
            @trace()
            async [asyncMethodName]() {
                throw error;
            }

            @trace()
            [syncMethodName]() {
                throw error;
            }
        }
        const testController = new TestController();

        await expect(testController[asyncMethodName]()).to.be.rejectedWith(error);
        assertExceptionWasRecorded(asyncMethodName);

        expect(() => testController[syncMethodName]()).to.throwError(error);
        assertExceptionWasRecorded(syncMethodName);
    });

    it("should use the operation name provided in the decorator as span name", async () => {
        const operationName = "customName";
        const assertCustomOperationName = () => {
            sinon.assert.calledWith(startSpan, operationName);
            sinon.assert.calledWith(setStatus, { code: SpanStatusCode.OK });
            sinon.assert.calledOnce(end);
            sinon.assert.notCalled(recordException);
            sandbox.resetHistory();
        };
        class TestController {
            @trace({ operationName })
            async [asyncMethodName]() {}

            @trace({ operationName })
            [syncMethodName]() {}
        }
        const testController = new TestController();

        await testController[asyncMethodName]();
        assertCustomOperationName();

        testController[syncMethodName]();
        assertCustomOperationName();
    });

    it("should not create a span if tracing is disabled", async () => {
        sandbox.stub(tracing, "tracingOptions").value({ enabled: false });
        const assertSpanWasNotCreated = () => {
            sinon.assert.notCalled(startSpan);
            sinon.assert.notCalled(setStatus);
            sinon.assert.notCalled(end);
            sinon.assert.notCalled(recordException);
            sandbox.resetHistory();
        };
        class TestController {
            @trace()
            async [asyncMethodName]() {}

            @trace()
            [syncMethodName]() {}
        }
        const testController = new TestController();

        await testController[asyncMethodName]();
        assertSpanWasNotCreated();

        testController[syncMethodName]();
        assertSpanWasNotCreated();
    });

    it("should not modify the return value of the method", async () => {
        const returnValue = "test";
        class TestController {
            @trace()
            async [asyncMethodName]() {
                return returnValue;
            }

            @trace()
            [syncMethodName]() {
                return returnValue;
            }
        }
        const testController = new TestController();

        const asyncResult = await testController[asyncMethodName]();
        expect(asyncResult).to.equal(returnValue);

        const syncResult = testController[syncMethodName]();
        expect(syncResult).to.equal(returnValue);
    });

    it("should throw an error if the decorator is used on a class", () => {
        expect(() => {
            // @ts-ignore
            @trace()
            class TestClass {}
            return TestClass;
        }).to.throwError("@trace cannot be used on a class or property: class TestClass");
    });

    it("should throw an error if the decorator is used on a property", () => {
        expect(() => {
            class TestClass {
                // @ts-ignore
                @trace()
                testProperty: string;
            }
            return TestClass;
        }).to.throwError(
            "@trace cannot be used on a class or property: TestClass.prototype.testProperty"
        );
    });
});

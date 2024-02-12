import { Application } from "@loopback/core";
import { ErrorWriterOptions, Response, RestBindings } from "@loopback/rest";
import { expect, sinon } from "@loopback/testlab";
import * as api from "@opentelemetry/api";
import { REQUEST_ID_HEADER, REQUEST_ID_PROPERTY } from "../../constants";
import { initializeTracing } from "../../tracing";
import { ErrorWithRequestId } from "../../types";
import { addRequestIdToSafeFields, setRequestIdInError, setRequestIdInResponse } from "../../utils";
import { mockRes } from "sinon-express-mock";

describe("Utils (unit)", () => {
    const traceId = "b450d80a67be2410";
    const zeroPadding = "0000000000000000";

    let sandbox: sinon.SinonSandbox;

    beforeEach(function () {
        sandbox = sinon.createSandbox();
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe("addRequestIdToSafeFields()", () => {
        let application: Application;

        beforeEach(function () {
            application = new Application();
        });

        it("should add request id to safe fields in error writer options", () => {
            addRequestIdToSafeFields(application);

            const errorWriterOptions = application.getSync(RestBindings.ERROR_WRITER_OPTIONS);

            expect(errorWriterOptions.safeFields).to.containEql(REQUEST_ID_PROPERTY);
        });

        it("should not overwrite existing error writer options", () => {
            const existingErrorWriterOptions: ErrorWriterOptions = {
                debug: true
            };
            application.bind(RestBindings.ERROR_WRITER_OPTIONS).to(existingErrorWriterOptions);

            addRequestIdToSafeFields(application);

            const errorWriterOptions = application.getSync(RestBindings.ERROR_WRITER_OPTIONS);

            expect(errorWriterOptions).to.deepEqual({
                ...existingErrorWriterOptions,
                safeFields: [REQUEST_ID_PROPERTY]
            });
        });

        it("should not overwrite existing safe field values", () => {
            const existingSafeField = "test";
            application
                .bind(RestBindings.ERROR_WRITER_OPTIONS)
                .to({ safeFields: [existingSafeField] });

            addRequestIdToSafeFields(application);

            const errorWriterOptions = application.getSync(RestBindings.ERROR_WRITER_OPTIONS);

            expect(errorWriterOptions.safeFields).to.containDeep([
                REQUEST_ID_PROPERTY,
                existingSafeField
            ]);
        });
    });

    describe("setRequestIdInError()", () => {
        let error: ErrorWithRequestId;
        let spanContext: sinon.SinonStub;
        let getSpan: sinon.SinonStub;

        beforeEach(function () {
            initializeTracing({ enabled: true, setRequestId: true });
            error = new Error();
            spanContext = sandbox.stub().returns({ traceId });
            getSpan = sandbox.stub(api.trace, "getSpan").returns({ spanContext } as any);
        });

        it("should set the trace id as request id in error", () => {
            setRequestIdInError(error, traceId);

            expect(error).to.have.property(REQUEST_ID_PROPERTY);
            expect(error.requestId).to.equal(traceId);
        });

        it("should remove the zero padding from the trace id", () => {
            setRequestIdInError(error, `${zeroPadding}${traceId}`);

            expect(error).to.have.property(REQUEST_ID_PROPERTY);
            expect(error.requestId).to.equal(traceId);
        });

        it("should set the trace id retrieved from the active context as request id", () => {
            setRequestIdInError(error);

            expect(error).to.have.property(REQUEST_ID_PROPERTY);
            expect(error.requestId).to.equal(traceId);
        });

        it("should not set error request id if setRequestId is set to false", () => {
            initializeTracing({ enabled: true, setRequestId: false });

            setRequestIdInError(error, traceId);

            expect(error).to.not.have.property(REQUEST_ID_PROPERTY);
        });

        it("should not set error request id if tracing is disabled", () => {
            initializeTracing({ enabled: false, setRequestId: true });

            setRequestIdInError(error, traceId);

            expect(error).to.not.have.property(REQUEST_ID_PROPERTY);
        });

        it("should not set error request id if no active span exists", () => {
            getSpan.returns(undefined);

            setRequestIdInError(error);

            expect(error).to.not.have.property(REQUEST_ID_PROPERTY);
        });
    });

    describe("setRequestIdInResponse()", () => {
        let response: Response;
        let spanContext: sinon.SinonStub;
        let getSpan: sinon.SinonStub;

        beforeEach(() => {
            initializeTracing({ enabled: true, setRequestId: true });

            const headers: { [name: string]: string | number | string[] } = {};

            response = mockRes();
            response.setHeader = (name: string, value: string | number | string[]) => {
                headers[name] = value;
                return response;
            };
            response.getHeader = (name: string) => {
                return headers[name];
            };

            spanContext = sandbox.stub().returns({ traceId });
            getSpan = sandbox.stub(api.trace, "getSpan").returns({ spanContext } as any);
        });

        it("should set the trace id as request id header in response", () => {
            setRequestIdInResponse(response, traceId);

            expect(response.getHeader(REQUEST_ID_HEADER)).to.equal(traceId);
        });

        it("should remove the zero padding from the trace id", () => {
            setRequestIdInResponse(response, `${zeroPadding}${traceId}`);

            expect(response.getHeader(REQUEST_ID_HEADER)).to.equal(traceId);
        });

        it("should set the trace id retrieved from the active context as request id", () => {
            setRequestIdInResponse(response);

            expect(response.getHeader(REQUEST_ID_HEADER)).to.equal(traceId);
        });

        it("should not set request id header if setRequestId is set to false", () => {
            initializeTracing({ enabled: true, setRequestId: false });

            setRequestIdInResponse(response, traceId);

            expect(response.getHeader(REQUEST_ID_HEADER)).to.be.undefined();
        });

        it("should not set request id header if tracing is disabled", () => {
            initializeTracing({ enabled: false, setRequestId: true });

            setRequestIdInResponse(response, traceId);

            expect(response.getHeader(REQUEST_ID_HEADER)).to.be.undefined();
        });

        it("should not set request id header if no active span exists", () => {
            getSpan.returns(undefined);

            setRequestIdInResponse(response);

            expect(response.getHeader(REQUEST_ID_HEADER)).to.be.undefined();
        });

        it("should not try to set the request id if response has already been sent to the client", () => {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            response.writableEnded = true;

            setRequestIdInResponse(response, traceId);

            expect(response.getHeader(REQUEST_ID_HEADER)).to.be.undefined();
        });
    });
});

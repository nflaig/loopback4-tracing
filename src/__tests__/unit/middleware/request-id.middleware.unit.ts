import { Middleware, MiddlewareContext, Request, Response } from "@loopback/rest";
import { expect, sinon } from "@loopback/testlab";
import { mockReq, mockRes } from "sinon-express-mock";
import { DEFAULT_IGNORED_PATHS } from "../../../constants";
import { TracingBindings } from "../../../keys";
import { RequestIdMiddlewareProvider } from "../../../middleware";
import * as tracing from "../../../tracing";
import * as utils from "../../../utils";

describe("RequestIdMiddlewareProvider (unit)", () => {
    const error = new Error();
    const mockTraceId = "ea46ebe9a13d871c";
    let sandbox: sinon.SinonSandbox;
    let middlewareProvider: RequestIdMiddlewareProvider;
    let setRequestIdInError: sinon.SinonStub;
    let setRequestIdInResponse: sinon.SinonStub;
    let nextFn: sinon.SinonStub;
    let request: Request;
    let response: Response;
    let context: MiddlewareContext;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        createStubs();
        givenRequestIdMiddlewareProvider();
        initializeContext();
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe("middleware()", () => {
        it("should invoke the functions to set request id in error and response", async () => {
            const middleware = middlewareProvider.value();

            await invokeMiddleware(middleware);

            verifyFunctionCalls();
        });

        it("should not invoke the functions to set request id if the path is ignored", async () => {
            request.path = DEFAULT_IGNORED_PATHS[0] as string;

            const middleware = middlewareProvider.value();

            await invokeMiddleware(middleware);

            sinon.assert.notCalled(setRequestIdInError);
            sinon.assert.notCalled(setRequestIdInResponse);
            sinon.assert.calledOnce(nextFn);
        });
    });

    describe("value()", () => {
        it("should return a middleware that invokes the functions to set request id in error and response", async () => {
            const middleware = middlewareProvider.value();

            await invokeMiddleware(middleware);

            verifyFunctionCalls();
        });
    });

    describe("context.get(bindingKey)", () => {
        it("should return a middleware that invokes the functions to set request id in error and response", async () => {
            context
                .bind(TracingBindings.REQUEST_ID_MIDDLEWARE_GROUP)
                .toProvider(RequestIdMiddlewareProvider);
            const middleware = await context.get<Middleware>(
                TracingBindings.REQUEST_ID_MIDDLEWARE_GROUP
            );

            await invokeMiddleware(middleware);

            verifyFunctionCalls();
        });
    });

    function createStubs() {
        setRequestIdInError = sandbox.stub(utils, "setRequestIdInError");
        setRequestIdInResponse = sandbox.stub(utils, "setRequestIdInResponse");
        sandbox.stub(tracing, "getActiveSpan").returns({
            spanContext: () => ({ traceId: mockTraceId })
        } as any);
        nextFn = sandbox.stub().throws(error);
    }

    function givenRequestIdMiddlewareProvider() {
        middlewareProvider = new RequestIdMiddlewareProvider();
    }

    function initializeContext() {
        request = mockReq({ path: "/test" });
        response = mockRes();
        context = new MiddlewareContext(request, response);
    }

    async function invokeMiddleware(middleware: Middleware) {
        try {
            await middleware(context, nextFn);
        } catch (err) {
            expect(err).to.equal(error);
        }
    }

    function verifyFunctionCalls() {
        sinon.assert.calledOnceWithExactly(setRequestIdInError, error, mockTraceId);
        sinon.assert.calledOnceWithExactly(setRequestIdInResponse, context.response, mockTraceId);
        sinon.assert.calledOnce(nextFn);
        sinon.assert.callOrder(nextFn, setRequestIdInError, setRequestIdInResponse);
    }
});

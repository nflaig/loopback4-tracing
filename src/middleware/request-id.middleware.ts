import { BindingScope, injectable, Provider } from "@loopback/core";
import { asMiddleware, Middleware, RestMiddlewareGroups, RestTags } from "@loopback/rest";
import { isIgnoredPath } from "../internal";
import { TracingBindings } from "../keys";
import { getActiveSpan, tracingOptions } from "../tracing";
import { setRequestIdInError, setRequestIdInResponse } from "../utils";

@injectable(
    asMiddleware({
        chain: RestTags.REST_MIDDLEWARE_CHAIN,
        group: TracingBindings.REQUEST_ID_MIDDLEWARE_GROUP,
        upstreamGroups: RestMiddlewareGroups.SEND_RESPONSE,
        downstreamGroups: RestMiddlewareGroups.CORS
    }),
    { scope: BindingScope.SINGLETON }
)
export class RequestIdMiddlewareProvider implements Provider<Middleware> {
    constructor() {}

    value(): Middleware {
        return async (ctx, next) => {
            const { ignoreIncomingPaths } = tracingOptions.http;

            if (isIgnoredPath(ctx.request.path, ignoreIncomingPaths)) {
                return next();
            }

            const { traceId } = getActiveSpan().spanContext();

            try {
                return await next();
            } catch (e) {
                setRequestIdInError(e as Error, traceId);
                throw e;
            } finally {
                setRequestIdInResponse(ctx.response, traceId);
            }
        };
    }
}

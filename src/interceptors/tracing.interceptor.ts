import {
    asGlobalInterceptor,
    BindingScope,
    inject,
    injectable,
    Interceptor,
    InvocationContext,
    InvocationResult,
    Provider,
    ValueOrPromise
} from "@loopback/core";
import { context, SpanKind, SpanStatusCode, trace, Tracer } from "@opentelemetry/api";
import { SemanticAttributes } from "@opentelemetry/semantic-conventions";
import { TracingBindings, TracingTags } from "../keys";

@injectable(asGlobalInterceptor(TracingTags.TRACING), { scope: BindingScope.SINGLETON })
export class TracingInterceptor implements Provider<Interceptor> {
    constructor(
        @inject(TracingBindings.TRACER)
        private tracer: Tracer
    ) {}

    value() {
        return this.intercept.bind(this);
    }

    async intercept(
        { methodName, targetName }: InvocationContext,
        next: () => ValueOrPromise<InvocationResult>
    ) {
        const span = this.tracer.startSpan(methodName, {
            kind: SpanKind.INTERNAL,
            attributes: { [SemanticAttributes.CODE_FUNCTION]: targetName }
        });
        const ctx = trace.setSpan(context.active(), span);
        try {
            const result = await context.with(ctx, next);
            span.setStatus({ code: SpanStatusCode.OK });
            return result;
        } catch (e) {
            span.recordException(e as Error);
            span.setStatus({
                code: SpanStatusCode.ERROR,
                message: (e as Error).message
            });
            throw e;
        } finally {
            span.end();
        }
    }
}

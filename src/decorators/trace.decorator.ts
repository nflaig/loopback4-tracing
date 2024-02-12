import { DecoratorFactory } from "@loopback/core";
import * as api from "@opentelemetry/api";
import { context, SpanKind, SpanStatusCode } from "@opentelemetry/api";
import { SemanticAttributes } from "@opentelemetry/semantic-conventions";
import { isAsync } from "../internal";
import { tracer, tracingOptions } from "../tracing";
import { TraceOptions } from "../types";

export function trace(options: TraceOptions = {}): MethodDecorator {
    const decoratorName = "@trace";

    return function traceMethodDecorator(
        target: Object,
        propertyKey?: string | symbol,
        descriptor?: TypedPropertyDescriptor<any>
    ) {
        if (propertyKey && descriptor) {
            if (!tracingOptions.enabled) return descriptor;

            const methodName = propertyKey.toString();
            const originalMethod = descriptor.value;
            const spanName = options.operationName ?? methodName;
            const spanOptions = {
                kind: SpanKind.INTERNAL,
                attributes: {
                    ...options.attributes,
                    [SemanticAttributes.CODE_FUNCTION]: methodName
                }
            };

            if (isAsync(originalMethod)) {
                descriptor.value = async function (...args: unknown[]) {
                    const span = tracer.startSpan(spanName, spanOptions);
                    const ctx = api.trace.setSpan(context.active(), span);
                    try {
                        const result = await context.with(ctx, originalMethod, this, ...args);
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
                };
            } else {
                descriptor.value = function (...args: unknown[]) {
                    const span = tracer.startSpan(spanName, spanOptions);
                    const ctx = api.trace.setSpan(context.active(), span);
                    try {
                        const result = context.with(ctx, originalMethod, this, ...args);
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
                };
            }

            return descriptor;
        } else {
            throw Error(
                `${decoratorName} cannot be used on a class or property: ` +
                    DecoratorFactory.getTargetName(target, propertyKey, descriptor)
            );
        }
    };
}

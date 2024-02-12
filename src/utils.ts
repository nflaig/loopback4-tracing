import { Application } from "@loopback/core";
import { Response, RestBindings } from "@loopback/rest";
import { context, trace } from "@opentelemetry/api";
import merge from "lodash/merge";
import {
    DEFAULT_TRACING_OPTIONS,
    ENV_TRACING_CONFIG,
    REQUEST_ID_PROPERTY,
    REQUEST_ID_HEADER
} from "./constants";
import { tracingOptions } from "./tracing";
import { TracingConfig, TracingOptions } from "./types";

const ZERO_PADDING = "0".repeat(16);

export function mergeTracingConfig(config: TracingConfig): TracingOptions {
    return merge({}, DEFAULT_TRACING_OPTIONS, config, ENV_TRACING_CONFIG);
}

export function setRequestIdInError(error: Error, traceId?: string) {
    if (!tracingOptions.enabled || !tracingOptions.setRequestId) return;

    const requestId = getRequestId(traceId);

    if (requestId) {
        Object.assign(error, { [REQUEST_ID_PROPERTY]: removeZeroPadding(requestId) });
    }
}

export function setRequestIdInResponse(response: Response, traceId?: string) {
    if (!tracingOptions.enabled || !tracingOptions.setRequestId) return;

    // make sure response has not already been sent to client
    if (response.writableEnded) return;

    const requestId = getRequestId(traceId);

    if (requestId) {
        response.setHeader(REQUEST_ID_HEADER, removeZeroPadding(requestId));
    }
}

export function getRequestId(traceId?: string) {
    return traceId ?? trace.getSpan(context.active())?.spanContext().traceId;
}

export function removeZeroPadding(traceId: string) {
    return traceId.startsWith(ZERO_PADDING) ? traceId.substring(ZERO_PADDING.length) : traceId;
}

export function addRequestIdToSafeFields(application: Application) {
    const errorWriterOptions = application.getSync(RestBindings.ERROR_WRITER_OPTIONS, {
        optional: true
    });
    const safeFields = errorWriterOptions?.safeFields ?? [];
    safeFields.push(REQUEST_ID_PROPERTY);
    application.bind(RestBindings.ERROR_WRITER_OPTIONS).to({ ...errorWriterOptions, safeFields });
}

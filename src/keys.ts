import { BindingKey, CoreBindings } from "@loopback/core";
import { Span, Tracer } from "@opentelemetry/api";
import { TracingComponent } from "./component";

export namespace TracingBindings {
    export const COMPONENT = BindingKey.create<TracingComponent>(
        `${CoreBindings.COMPONENTS}.TracingComponent`
    );

    export const TRACER = BindingKey.create<Tracer>("tracing.tracer");

    export const ACTIVE_SPAN = BindingKey.create<Span>("tracing.activeSpan");

    export const REQUEST_ID_MIDDLEWARE_GROUP = "requestId";
}

export namespace TracingTags {
    export const TRACING = "tracing";
}

import {
    Application,
    Component,
    ContextTags,
    CoreBindings,
    createBindingFromClass,
    inject,
    injectable
} from "@loopback/core";
import { TracingInterceptor } from "./interceptors";
import { TracingBindings } from "./keys";
import { RequestIdMiddlewareProvider } from "./middleware";
import { TracingObserver } from "./observers";
import { getActiveSpan, tracer, tracingOptions } from "./tracing";
import { addRequestIdToSafeFields } from "./utils";

@injectable({ tags: { [ContextTags.KEY]: TracingBindings.COMPONENT } })
export class TracingComponent implements Component {
    constructor(
        @inject(CoreBindings.APPLICATION_INSTANCE)
        private application: Application
    ) {
        const options = tracingOptions;

        this.application.bind(TracingBindings.TRACER).to(tracer);

        this.application.bind(TracingBindings.ACTIVE_SPAN).toDynamicValue(getActiveSpan);

        if (options.enabled) {
            this.application.lifeCycleObserver(TracingObserver);

            if (options.methodInvocations.enabled) {
                this.application.interceptor(TracingInterceptor);
            }

            if (options.setRequestId) {
                addRequestIdToSafeFields(application);
                this.application.add(createBindingFromClass(RequestIdMiddlewareProvider));
            }
        }
    }
}

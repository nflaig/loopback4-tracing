import {
    Application,
    CoreBindings,
    DEFAULT_TYPE_NAMESPACES,
    GLOBAL_INTERCEPTOR_NAMESPACE
} from "@loopback/core";
import { RestBindings } from "@loopback/rest";
import { expect } from "@loopback/testlab";
import { TracingComponent } from "../../component";
import { TracingInterceptor } from "../../interceptors";
import { TracingBindings } from "../../keys";
import { RequestIdMiddlewareProvider } from "../../middleware";
import { TracingObserver } from "../../observers";
import { initializeTracing } from "../../tracing";

describe("TracingComponent (unit)", () => {
    let app: Application;

    beforeEach(() => {
        app = new Application();
    });

    describe("constructor()", () => {
        it("should always bind tracer and active span to the application", () => {
            app.component(TracingComponent);

            expect(app.isBound(TracingBindings.TRACER)).to.be.true();
            expect(app.isBound(TracingBindings.ACTIVE_SPAN)).to.be.true();
        });

        it("should bind all artifacts to the application if tracing is enabled", () => {
            initializeTracing({ enabled: true });
            app.component(TracingComponent);

            expect(app.isBound(TracingBindings.TRACER)).to.be.true();
            expect(app.isBound(TracingBindings.ACTIVE_SPAN)).to.be.true();
            expect(
                app.isBound(`${CoreBindings.LIFE_CYCLE_OBSERVERS}.${TracingObserver.name}`)
            ).to.be.true();
            expect(
                app.isBound(`${GLOBAL_INTERCEPTOR_NAMESPACE}.${TracingInterceptor.name}`)
            ).to.be.true();
            expect(app.isBound(RestBindings.ERROR_WRITER_OPTIONS)).to.be.true();
            expect(
                app.isBound(
                    `${DEFAULT_TYPE_NAMESPACES.provider}.${RequestIdMiddlewareProvider.name}`
                )
            ).to.be.true();
        });

        it("should not bind artifacts to the application if tracing is disabled", () => {
            initializeTracing({ enabled: false });
            app.component(TracingComponent);

            expect(
                app.isBound(`${CoreBindings.LIFE_CYCLE_OBSERVERS}.${TracingObserver.name}`)
            ).to.be.false();
            expect(
                app.isBound(`${GLOBAL_INTERCEPTOR_NAMESPACE}.${TracingInterceptor.name}`)
            ).to.be.false();
            expect(
                app.isBound(
                    `${DEFAULT_TYPE_NAMESPACES.provider}.${RequestIdMiddlewareProvider.name}`
                )
            ).to.be.false();
        });

        it("should not bind the tracing interceptor if tracing method invocations is disabled", () => {
            initializeTracing({ enabled: true, methodInvocations: { enabled: false } });
            app.component(TracingComponent);

            expect(
                app.isBound(`${CoreBindings.LIFE_CYCLE_OBSERVERS}.${TracingObserver.name}`)
            ).to.be.true();
            expect(
                app.isBound(`${GLOBAL_INTERCEPTOR_NAMESPACE}.${TracingInterceptor.name}`)
            ).to.be.false();
        });

        it("should not update error writer options if error request id is disabled", () => {
            initializeTracing({ enabled: true, setRequestId: false });
            app.component(TracingComponent);

            expect(app.isBound(RestBindings.ERROR_WRITER_OPTIONS)).to.be.false();
        });

        it("should not bind the request id middleware if error request id is disabled", () => {
            initializeTracing({ enabled: true, setRequestId: false });
            app.component(TracingComponent);

            expect(
                app.isBound(
                    `${DEFAULT_TYPE_NAMESPACES.provider}.${RequestIdMiddlewareProvider.name}`
                )
            ).to.be.false();
        });
    });
});

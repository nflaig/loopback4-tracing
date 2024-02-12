import { sinon } from "@loopback/testlab";
import { TracingObserver } from "../../../observers";
import * as tracing from "../../../tracing";

describe("TracingObserver (unit)", () => {
    let tracingObserver: TracingObserver;
    let sandbox: sinon.SinonSandbox;

    beforeEach(function () {
        sandbox = sinon.createSandbox();
        tracingObserver = new TracingObserver();
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe("stop()", () => {
        it("should invoke the shutdownTracing function", async () => {
            const shutdownTracing = sandbox.stub(tracing, "shutdownTracing");

            await tracingObserver.stop();

            sinon.assert.calledOnce(shutdownTracing);
        });
    });
});

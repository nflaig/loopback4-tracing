import { context, propagation, trace } from "@opentelemetry/api";
import nock from "nock";

before(() => {
    context.disable();
    trace.disable();
    propagation.disable();
    nock.disableNetConnect();
});

import { lifeCycleObserver, LifeCycleObserver } from "@loopback/core";
import { TracingTags } from "../keys";
import { shutdownTracing } from "../tracing";

@lifeCycleObserver(TracingTags.TRACING)
export class TracingObserver implements LifeCycleObserver {
    async stop(): Promise<void> {
        await shutdownTracing();
    }
}

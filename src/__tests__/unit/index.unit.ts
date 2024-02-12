import { expect } from "@loopback/testlab";
import * as otelApi from "@opentelemetry/api";
import * as otelCore from "@opentelemetry/core";
import * as otelSdk from "@opentelemetry/tracing";
import tracing, { api, core, sdk } from "../../index";

describe("Index (unit)", () => {
    it("should re-export opentelemetry packages from exports", () => {
        expect(api).to.deepEqual(otelApi);
        expect(core).to.deepEqual(otelCore);
        expect(sdk).to.deepEqual(otelSdk);
    });

    it("should re-export opentelemetry packages from exports as default", () => {
        expect(tracing.api).to.deepEqual(otelApi);
        expect(tracing.core).to.deepEqual(otelCore);
        expect(tracing.sdk).to.deepEqual(otelSdk);
    });
});

import { expect } from "@loopback/testlab";
import * as otelApi from "@opentelemetry/api";
import * as otelCore from "@opentelemetry/core";
import * as otelSdk from "@opentelemetry/tracing";
import { api, core, sdk } from "../../exports";

describe("Exports (unit)", () => {
    it("should re-export opentelemetry packages", () => {
        expect(api).to.deepEqual(otelApi);
        expect(core).to.deepEqual(otelCore);
        expect(sdk).to.deepEqual(otelSdk);
    });
});

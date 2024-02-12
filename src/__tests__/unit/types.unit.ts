import { expect } from "@loopback/testlab";
import * as api from "@opentelemetry/api";
import * as semantic from "@opentelemetry/semantic-conventions";
import { DiagLogLevel, SemanticAttributes, SpanKind, SpanStatusCode } from "../../types";

describe("Types (unit)", () => {
    it("should re-export opentelemetry types and enums", () => {
        expect(DiagLogLevel).to.deepEqual(api.DiagLogLevel);
        expect(SemanticAttributes).to.deepEqual(semantic.SemanticAttributes);
        expect(SpanKind).to.deepEqual(api.SpanKind);
        expect(SpanStatusCode).to.deepEqual(api.SpanStatusCode);
    });
});

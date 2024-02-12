/* eslint-disable @typescript-eslint/naming-convention */
import { expect, sinon } from "@loopback/testlab";
import { IgnoreMatcher } from "@opentelemetry/instrumentation-http";
import _module from "module";
import { DEFAULT_SERVICE_NAME } from "../../constants";
import {
    getEnv,
    getEnvBoolean,
    getEnvNumber,
    getServiceDetails,
    isIgnoredPath
} from "../../internal";

describe("Internal (unit)", () => {
    describe("getServiceDetails()", () => {
        let _require: sinon.SinonStub;
        const packagePath = `${process.cwd()}/package.json`;
        const packageInfo = {
            name: "project-name",
            version: "1.0.0"
        };

        let sandbox: sinon.SinonSandbox;

        beforeEach(function () {
            sandbox = sinon.createSandbox();
            _require = sandbox.stub(_module as any, "_load");
        });

        afterEach(function () {
            sandbox.restore();
        });

        it("should return the name and version contained in package.json", () => {
            _require.withArgs(packagePath).returns(packageInfo);

            const { name, version } = getServiceDetails(DEFAULT_SERVICE_NAME);

            expect(name).to.equal(packageInfo.name);
            expect(version).to.equal(packageInfo.version);
        });

        it("should return the default name if name is not defined in package.json", () => {
            _require.withArgs(packagePath).returns({});

            const { name, version } = getServiceDetails(DEFAULT_SERVICE_NAME);

            expect(name).to.equal(DEFAULT_SERVICE_NAME);
            expect(version).to.be.undefined();
        });

        it("should return the default name if loading package.json failed", () => {
            _require.withArgs(packagePath).throwsException();

            const { name, version } = getServiceDetails(DEFAULT_SERVICE_NAME);

            expect(name).to.equal(DEFAULT_SERVICE_NAME);
            expect(version).to.be.undefined();
        });
    });

    describe("getEnv()", () => {
        const key = "TEST_STRING";
        const defaultValue = "test";

        beforeEach(() => {
            setEnv(key, defaultValue);
        });

        it("should return the environment variable as a string", () => {
            const value = getEnv(key);

            expect(value).to.be.a.String();
            expect(value).to.equal(defaultValue);
        });

        it("should return undefined if the environment variable is not set", () => {
            unsetEnv(key);

            const value = getEnv(key);

            expect(value).to.be.undefined();
        });
    });

    describe("getEnvNumber()", () => {
        const key = "TEST_NUMBER";
        const defaultValue = 123;

        beforeEach(() => {
            setEnv(key, defaultValue);
        });

        it("should return the environment variable as a number", () => {
            const value = getEnvNumber(key);

            expect(value).to.be.a.Number();
            expect(value).to.equal(defaultValue);
        });

        it("should return undefined if the environment variable is not set", () => {
            unsetEnv(key);

            const value = getEnvNumber(key);

            expect(value).to.be.undefined();
        });

        it("should return undefined if the environment variable is not a number", () => {
            setEnv(key, "abc");

            const value = getEnvNumber(key);

            expect(value).to.be.undefined();
        });
    });

    describe("getEnvBoolean()", () => {
        const key = "TEST_BOOLEAN";
        const defaultValue = true;

        beforeEach(() => {
            setEnv(key, defaultValue);
        });

        it("should return the environment variable as a boolean", () => {
            const value = getEnvBoolean(key);

            expect(value).to.be.a.Boolean();
            expect(value).to.equal(defaultValue);
        });

        it("should return false if the environment variable is set to 'false'", () => {
            setEnv(key, "false");
            const value = getEnvBoolean(key);

            expect(value).to.be.a.Boolean();
            expect(value).to.equal(false);
        });

        it("should return undefined if the environment variable is not set", () => {
            unsetEnv(key);

            const value = getEnvBoolean(key);

            expect(value).to.be.undefined();
        });

        it("should return undefined if the environment variable is not a boolean", () => {
            setEnv(key, "abc");

            const value = getEnvBoolean(key);

            expect(value).to.be.undefined();
        });
    });

    describe("isIgnoredPath()", () => {
        const path = "/ping";
        let ignoredPaths: IgnoreMatcher[];

        it("should return true if the path is included in ignored paths as string", () => {
            ignoredPaths = ["/ping"];

            const isIgnored = isIgnoredPath(path, ignoredPaths);

            expect(isIgnored).to.be.true();
        });

        it("should return true if the path is included in ignored paths as regex", () => {
            ignoredPaths = [/^\/ping\/?.*$/];

            const isIgnored = isIgnoredPath(path, ignoredPaths);

            expect(isIgnored).to.be.true();
        });

        it("should return false if the path is not included in ignored paths", () => {
            ignoredPaths = ["/metrics", /^\/health\/?.*$/];

            const isIgnored = isIgnoredPath(path, ignoredPaths);

            expect(isIgnored).to.be.false();
        });

        it("should return false if no paths are ignored", () => {
            ignoredPaths = [];

            const isIgnored = isIgnoredPath(path, ignoredPaths);

            expect(isIgnored).to.be.false();
        });

        it("should return false if path matcher is invalid", () => {
            ignoredPaths = [123 as any];

            const isIgnored = isIgnoredPath(path, ignoredPaths);

            expect(isIgnored).to.be.false();
        });

        it("should return false if no ignored paths are provided", () => {
            const isIgnored = isIgnoredPath(path);

            expect(isIgnored).to.be.false();
        });
    });

    function setEnv(key: string, value: string | number | boolean) {
        process.env[key] = value.toString();
    }

    function unsetEnv(key: string) {
        delete process.env[key];
    }
});

import { IgnoreMatcher } from "@opentelemetry/instrumentation-http";
import { ServiceDetails } from "./types";

export function getServiceDetails(defaultName: string): ServiceDetails {
    try {
        // eslint-disable-next-line global-require
        const { name, version } = require(`${process.cwd()}/package.json`);

        return { name: name || defaultName, version };
    } catch {
        return { name: defaultName };
    }
}

export function getEnv<T extends string = string>(key: string): T {
    return process.env[key] as T;
}

export function getEnvNumber(key: string) {
    const value = Number(process.env[key]);

    return Number.isNaN(value) ? undefined : value;
}

export function getEnvBoolean(key: string) {
    const value = process.env[key];

    if (!value) return;
    if (value === "true") return true;
    if (value === "false") return false;
}

export function isAsync(method: (...args: unknown[]) => unknown) {
    return /^async /.test(method.toString().trim());
}

export function isIgnoredPath(path: string, matchers: IgnoreMatcher[] = []): boolean {
    if (!matchers.length) {
        return false;
    }

    for (const matcher of matchers) {
        if (matchesPath(path, matcher)) {
            return true;
        }
    }

    return false;
}

export function matchesPath(path: string, matcher: IgnoreMatcher): boolean {
    if (typeof matcher === "string") {
        return matcher === path;
    } else if (matcher instanceof RegExp) {
        return matcher.test(path);
    } else {
        return false;
    }
}

<!-- omit in toc -->
# loopback4-tracing

[![Actions Status][build-badge]][actions]
[![Coverage Status][coveralls-badge]][coveralls]

[![Latest version][npm-version-badge]][npm-package]
[![License][license-badge]][license]
[![Downloads][npm-downloads-badge]][npm-package]
[![Total Downloads][npm-total-downloads-badge]][npm-package]

LoopBack 4 Tracing Component

<!-- omit in toc -->
## Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
  - [Initialize tracing](#initialize-tracing)
  - [Bind the component](#bind-the-component)
- [Usage](#usage)
  - [Trace decorator](#trace-decorator)
  - [Create custom span](#create-custom-span)
  - [Get active span](#get-active-span)
- [Configuration](#configuration)
- [Example](#example)
- [Debug](#debug)
- [Related resources](#related-resources)
- [Contributing](#contributing)
- [License](#license)

## Prerequisites

Some modules need to be installed as peer dependencies with at least a certain version.

```sh
@loopback/core  >=2.14.0
@loopback/rest  >=9.1.2
```

## Installation

```sh
npm install loopback4-tracing
```

### Initialize tracing

Before loading any application code it is required to initialize tracing. This is usually done at
the top of the `index.js` or `index.ts` file.

```js
require("loopback4-tracing").init({/* config */});
```

or in TypeScript it is also possible to do

```ts
import { initializeTracing } from "loopback4-tracing";

initializeTracing({/* config */});
```

### Bind the component

This will add the tracing interceptor and observer to the application. The interceptor will create
method invocation spans and the observer is required to gracefully shutdown the tracer
provider and exporters when the application is stopped.

```ts
import { TracingBindings, TracingComponent } from "loopback4-tracing";

export class MyApplication extends BootMixin(
    ServiceMixin(RepositoryMixin(RestApplication))
) {
    constructor(options?: ApplicationConfig) {
        super(options);

        this.component(TracingComponent);
    }
}
```

## Usage

The module provides a lot of auto instrumentations by default but is also possible to create
custom spans in your code.

### Trace decorator

The easiest way create custom spans is by using the decorator which can be added to any method.

```ts
import { trace } from "loopback4-tracing";

class ExampleService {
    constructor() {}

    @trace()
    exampleMethod() {
        // do some work
    }
}
```

The decorator will wrap the method into a span which will use the method name as span name by default.
It is also possible to use a custom span name by setting the operation name in the decorator options.

```ts
@trace({ operationName: "customName" })
```

### Create custom span

The first step is get the tracer of the service either by using dependency injection

```ts
import { Tracer, TracingBindings } from "loopback4-tracing";

class ExampleService {
    constructor(
        @inject(TracingBindings.TRACER)
        private tracer: Tracer
    ) {}

    exampleMethod() {
        const span = this.tracer.startSpan("exampleMethod");

        // do some work

        span.end();
    }
}
```

or by directly importing the `tracer`

```ts
import { tracer } from "loopback4-tracing";

function exampleFunction() {
    const span = tracer.startSpan("exampleFunction");

    // do some work

    span.end();
}
```

### Get active span

In some cases it might not be desired to create a new span but instead get the active span to
add additional events and attributes to it.

```ts
import { getActiveSpan } from "loopback4-tracing";

function exampleFunction() {
    const span = getActiveSpan();

    span.addEvent("some event");

    span.setAttribute("custom.attribute", "some value");
}
```

## Configuration

Most of the time it is not recommended to change the [default configuration][default-config] but
there are some cases where it makes sense, for example to enable / disable default instrumentations
provided by the module such as `http`.

The module can be configured by providing custom values in the [init function](#initialize-tracing)
or by using [environment variables][env-vars] which will have highest priority.

**Note:** By default tracing is not enabled. The recommended approach is to enable tracing by setting
the environment variable `TRACING_ENABLED=true` and to only enable it if the collected traces are analyzed.

<!-- omit in toc -->
### Configuration parameters

| Parameter                   | Environment Variable                 | Description                          | Default       | Type                  |
| --------------------------- | ------------------------------------ | ------------------------------------ | ------------- | --------------------- |
| `enabled`                   | `TRACING_ENABLED`                    | Enable tracing                       | `false`       | `boolean`             |
| `serviceName`               | `TRACING_SERVICE_NAME`               | Name of service                      | `pkg.name`    | `string`              |
| `serviceVersion`            | `TRACING_SERVICE_VERSION`            | Version of service                   | `pkg.version` | `string`              |
| `propagationFormat`         | `TRACING_PROPAGATION_FORMAT`         | Propagation format                   | `"jaeger"`    | `"jaeger" \| "w3c"`   |
| `setRequestId`              | `TRACING_SET_REQUEST_ID`             | Set request id in error and response | `true`        | `boolean`             |
| `jaeger.enabled`            | `TRACING_JAEGER_ENABLED`             | Enable jaeger exporter               | `true`        | `boolean`             |
| `jaeger.host`               | `TRACING_JAEGER_HOST`                | Jaeger host                          | `"localhost"` | `string`              |
| `jaeger.port`               | `TRACING_JAEGER_PORT`                | Jaeger port                          | `6832`        | `number`              |
| `jaeger.endpoint`           | `TRACING_JAEGER_ENDPOINT`            | Jaeger traces endpoint               | `undefined`   | `string`              |
| `jaeger.spanProcessor.type` | `TRACING_JAEGER_SPAN_PROCESSOR`      | Jaeger span processor type           | `"batch"`     | `"simple" \| "batch"` |
| `console.enabled`           | `TRACING_CONSOLE_ENABLED`            | Enable console exporter              | `false`       | `boolean`             |
| `diagnostics.enabled`       | `TRACING_DIAGNOSTICS_ENABLED`        | Enable diagnostics logger            | `false`       | `boolean`             |
| `diagnostics.logLevel`      | `TRACING_DIAGNOSTICS_LOG_LEVEL`      | Log level of diag logger             | `9999`        | `DiagLogLevel`        |
| `methodInvocations.enabled` | `TRACING_METHOD_INVOCATIONS_ENABLED` | Enable method invocation spans       | `true`        | `boolean`             |
| `http.enabled`              | `TRACING_HTTP_ENABLED`               | Enable http instrumentation          | `true`        | `boolean`             |

For further details about possible configuration options, see [tracing options][tracing-options].

**Note:** Some values can not be configured by using environment variables but instead need to be
provided to the [init function](#initialize-tracing).

## Example

For an example on how to create custom spans see [tracing interceptor](src/interceptors/tracing.interceptor.ts)
and for more information, please read the [opentelemetry tracing documentation][opentelemetry-tracing].

## Debug

To enable debug logs set the `DEBUG` environment variable to `loopback:tracing:*`, see
[Setting debug strings][lb4-debug-strings] for further details.

## Related resources

- [Specifications for OpenTelemetry][opentelemtry-specifications]
- [Jaeger Distributed Tracing][jaeger-tracing]

## Contributing

[![contributions welcome][contributions-welcome-badge]][issues]

## License

This project is licensed under the MIT license. See the [LICENSE](LICENSE) file for more info.

[actions]: https://github.com/nflaig/loopback4-tracing/actions
[license]: https://github.com/nflaig/loopback4-tracing/blob/main/LICENSE
[issues]: https://github.com/nflaig/loopback4-tracing/issues
[coveralls]: https://coveralls.io/github/nflaig/loopback4-tracing?branch=main
[npm-package]: https://www.npmjs.com/package/loopback4-tracing

[build-badge]: https://github.com/nflaig/loopback4-tracing/workflows/build/badge.svg
[coveralls-badge]: https://coveralls.io/repos/github/nflaig/loopback4-tracing/badge.svg?branch=main
[npm-version-badge]: https://img.shields.io/npm/v/loopback4-tracing.svg?style=flat-square
[npm-downloads-badge]: https://img.shields.io/npm/dw/loopback4-tracing.svg?label=Downloads&style=flat-square&color=blue
[npm-total-downloads-badge]: https://img.shields.io/npm/dt/loopback4-tracing.svg?label=Total%20Downloads&style=flat-square&color=blue
[license-badge]: https://img.shields.io/github/license/nflaig/loopback4-tracing.svg?color=blue&label=License&style=flat-square
[contributions-welcome-badge]: https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat

[lb4-debug-strings]: https://loopback.io/doc/en/lb4/Setting-debug-strings.html

[default-config]: https://github.com/nflaig/loopback4-tracing/blob/master/src/constants.ts#L12
[env-vars]: https://github.com/nflaig/loopback4-tracing/blob/master/src/constants.ts#L58
[tracing-options]: https://github.com/nflaig/loopback4-tracing/blob/master/src/types.ts#L21

[opentelemetry-tracing]: https://github.com/open-telemetry/opentelemetry-js-api/blob/main/docs/tracing.md
[opentelemtry-specifications]: https://github.com/open-telemetry/opentelemetry-specification

[jaeger-tracing]: https://www.jaegertracing.io/

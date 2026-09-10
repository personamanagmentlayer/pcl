---
name: nestjs-expert
version: 1.0.0
description: >-
  Expert knowledge in NestJS framework, modular architecture, dependency injection,
  TypeORM/Prisma persistence, microservices transports, and enterprise-grade Node.js
  backend development. Use when the user mentions NestJS, Nest CLI, decorators,
  dependency injection, guards, interceptors, or backend microservices, or when the
  task involves NestJS Fundamentals, Providers and Modules, Microservices, or Testing.
category: frameworks
tags:
  [
    nestjs,
    nodejs,
    typescript,
    dependency-injection,
    microservices,
    backend,
    rest,
    graphql,
  ]
allowed-tools: [Read, Write, Edit, Bash, Glob, Grep]
---

# NestJS Expert

You are an expert in NestJS, specializing in modular architecture, dependency injection, TypeORM/Prisma persistence, microservices transports, and building scalable, testable, enterprise-grade Node.js backends.

## Core Concepts

### NestJS Fundamentals

- **Modules**: Feature encapsulation via `@Module()`
- **Controllers**: Route handlers via `@Controller()`
- **Providers**: Injectable services via `@Injectable()`
- **Decorators**: Metadata-driven composition (`@Get`, `@Param`, `@Body`, custom decorators)
- **Dependency Injection**: Constructor-based IoC container
- **Pipes**: Input transformation and validation
- **Guards**: Route-level authorization
- **Interceptors**: Cross-cutting concerns (logging, caching, transform)
- **Exception Filters**: Centralized error handling

### Architecture Patterns

- **Modular Architecture**: Feature modules, shared modules, core module
- **Dynamic Modules**: `forRoot()` / `forRootAsync()` configuration patterns
- **Custom Providers**: `useValue`, `useClass`, `useFactory`, `useExisting`
- **Provider Scopes**: Singleton (default), Request, Transient
- **Middleware**: Express/Fastify middleware pipeline
- **CQRS Module**: Command/query separation with event sourcing support

### Data & Persistence

- **TypeORM Integration**: Entities, repositories, migrations
- **Prisma Integration**: PrismaService pattern, generated client injection
- **Mongoose Integration**: Schemas and models for MongoDB
- **Repository Pattern**: Abstracting persistence behind injectable services
- **Transactions**: Query runners and unit-of-work patterns

### Microservices & Messaging

- **Transport Layers**: TCP, Redis, NATS, Kafka, gRPC, RabbitMQ
- **Message Patterns**: Request-response and event-based (`@MessagePattern`, `@EventPattern`)
- **Hybrid Applications**: Combining HTTP servers with microservice transports
- **CQRS & Sagas**: Distributed transaction orchestration

### Advanced Features

- **GraphQL**: Code-first and schema-first approaches with `@nestjs/graphql`
- **WebSockets**: Gateways with `@WebSocketGateway()`, Socket.IO and ws adapters
- **Task Scheduling**: `@nestjs/schedule` cron jobs and intervals
- **Authentication**: Passport strategies, JWT, refresh tokens, guards composition
- **Swagger/OpenAPI**: Auto-generated API documentation via `@nestjs/swagger`
- **Configuration**: `@nestjs/config` with schema validation (Joi/Zod), typed `ConfigService`
- **Custom Decorators**: `createParamDecorator()`, `applyDecorators()`, decorator composition
- **Caching**: `@nestjs/cache-manager` with in-memory or Redis stores, `@CacheKey`/`@CacheTTL`
- **Rate Limiting**: `@nestjs/throttler` guards, per-route overrides
- **Health Checks**: `@nestjs/terminus` for readiness/liveness probes (DB, disk, memory indicators)
- **Platform Adapters**: Express (default) vs. Fastify (`@nestjs/platform-fastify`) for higher throughput
- **Testing**: `@nestjs/testing` module builder, Jest, Supertest for e2e

## Best Practices

### Module & Provider Design

- Keep controllers thin — delegate business logic to services
- One feature per module; expose only what other modules need via `exports`
- Use dynamic modules for configurable, reusable library modules
- Prefer constructor injection over property injection
- Scope providers to `REQUEST` only when per-request state is truly needed (has a performance cost)

### Validation & DTOs

- Define a DTO class per endpoint payload with `class-validator` decorators
- Enable a global `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true`
- Use `class-transformer` to serialize/deserialize between DTOs and entities
- Never pass raw `Request`/`Body` objects into service or persistence layers

### Security & Auth

- Compose guards for authentication and authorization separately (`AuthGuard`, `RolesGuard`)
- Store secrets via `@nestjs/config` backed by environment variables, never hard-coded
- Validate configuration at startup with a Joi/Zod schema in `ConfigModule.forRoot({ validate })`
- Apply `helmet`, CORS allow-lists, and rate limiting (`@nestjs/throttler`) by default

### Error Handling & Observability

- Centralize error shaping in a global `ExceptionFilter`; never leak stack traces to clients
- Use interceptors for structured request logging and correlation IDs
- Emit domain events for auditable state transitions rather than logging as an afterthought
- Add health checks with `@nestjs/terminus` for readiness/liveness probes

### Testing

- Build test modules with `Test.createTestingModule()` and override providers for mocks
- Write e2e tests with Supertest against a compiled `INestApplication` instance
- Test guards, pipes, and interceptors in isolation with mocked `ExecutionContext`
- Keep unit tests fast by mocking the persistence layer; reserve real DB access for integration tests

## Anti-Patterns

### Architecture Issues

- Business logic living in controllers instead of services
- Circular dependencies between modules (use `forwardRef()` only as a last resort — prefer restructuring)
- One giant `AppModule` instead of feature modules
- Providers reaching into other modules' internals instead of using exported interfaces

### Dependency Injection Misuse

- Manually instantiating services with `new` instead of injecting them
- Overusing `REQUEST`-scoped providers, causing DI subtree duplication and latency
- Injecting the ORM/database client directly into controllers

### Validation & Security Gaps

- Skipping DTO validation and trusting client input directly
- Missing global `ValidationPipe`, allowing unexpected fields through
- Hard-coding JWT secrets or database credentials in source
- Returning raw ORM entities (with internal fields) directly as API responses

### Microservices Mistakes

- Mixing synchronous HTTP semantics into fire-and-forget event patterns
- Not handling transport-level connection failures/retries
- Sharing a single monolithic DTO across incompatible message contracts

### Testing Gaps

- Testing only the happy path, skipping guard/pipe rejection cases
- Hitting a real database in unit tests, making the suite slow and flaky
- Not resetting mocked providers between tests, causing state leakage

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Code Examples](references/EXAMPLES.md) — Installation and Setup, Modules Controllers and Providers, DTOs and Validation, Guards and JWT Authentication, Exception Filters and Interceptors, Configuration and Validation, Custom Param Decorators, Swagger and OpenAPI, GraphQL Resolvers, WebSocket Gateways, Task Scheduling, Prisma Integration, Health Checks, Microservices, Testing

## Resources

### Official Documentation

- [NestJS Documentation](https://docs.nestjs.com/)
- [NestJS CLI](https://docs.nestjs.com/cli/overview)
- [NestJS Recipes](https://docs.nestjs.com/recipes/crud-generator)
- [NestJS Microservices](https://docs.nestjs.com/microservices/basics)

### Learning Resources

- [NestJS Fundamentals Course (official)](https://courses.nestjs.com/)
- [NestJS DevTools](https://devtools.nestjs.com/)

### Tools and Libraries

- [Prisma](https://www.prisma.io/) — Type-safe ORM
- [TypeORM](https://typeorm.io/) — Decorator-based ORM
- [class-validator](https://github.com/typestack/class-validator) — DTO validation
- [Swagger Module](https://docs.nestjs.com/openapi/introduction) — OpenAPI generation
- [Passport](https://docs.nestjs.com/security/authentication) — Authentication strategies
- [GraphQL Module](https://docs.nestjs.com/graphql/quick-start) — Code-first and schema-first GraphQL
- [Terminus](https://docs.nestjs.com/recipes/terminus) — Health checks
- [Throttler](https://docs.nestjs.com/security/rate-limiting) — Rate limiting

### Community

- [NestJS Discord](https://discord.gg/nestjs)
- [NestJS GitHub Discussions](https://github.com/nestjs/nest/discussions)
- [Awesome NestJS](https://github.com/nestjs/awesome-nestjs)

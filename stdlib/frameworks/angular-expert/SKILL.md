---
name: angular-expert
version: 1.1.0
description: >-
  Expert knowledge in Angular framework, RxJS reactive programming, TypeScript, dependency
  injection, and enterprise application development. Use when the user mentions RxJS,
  TypeScript, dependency injection, reactive, frontend, or enterprise, or when the task
  involves Angular Fundamentals, RxJS Integration, Advanced Features, or Installation and
  Setup.
category: frameworks
tags:
  [
    angular,
    rxjs,
    typescript,
    dependency-injection,
    reactive,
    frontend,
    enterprise,
  ]
allowed-tools: [Read, Write, Edit, Bash, Glob, Grep]
---

# Angular Expert

You are an expert in Angular framework, specializing in RxJS reactive programming, TypeScript, dependency injection, and building scalable enterprise applications.

## Core Concepts

### Angular Fundamentals

- **Component Architecture**: Modular UI building blocks
- **Templates**: Declarative view definitions
- **Dependency Injection**: Hierarchical DI system
- **Modules**: Feature organization (NgModules)
- **Services**: Business logic and data
- **Directives**: DOM manipulation

### RxJS Integration

- **Observables**: Async data streams
- **Operators**: Transform and combine streams
- **Subjects**: Multicasting observables
- **Subscription Management**: Memory leak prevention
- **Error Handling**: Catch and retry strategies
- **Testing**: Marble testing

### TypeScript

- **Strong Typing**: Type safety throughout
- **Interfaces**: Contract definitions
- **Decorators**: Metadata annotations
- **Generics**: Type-safe reusable code
- **Enums**: Named constants
- **Type Guards**: Runtime type checking

### Advanced Features

- **Standalone Components**: Module-free architecture
- **Signals**: Fine-grained reactivity
- **Change Detection**: OnPush strategy
- **Lazy Loading**: Code splitting
- **Guards**: Route protection
- **Interceptors**: HTTP middleware

## Best Practices

### Component Design

- Use OnPush change detection for performance
- Keep components focused and small
- Extract business logic to services
- Use smart/dumb component pattern
- Implement proper unsubscription
- Leverage standalone components (Angular 14+)

### RxJS Management

- Always unsubscribe from observables
- Use async pipe in templates
- Prefer higher-order operators
- Handle errors appropriately
- Use shareReplay for expensive operations
- Avoid nested subscriptions

### TypeScript

- Enable strict mode
- Define interfaces for all data structures
- Use enums for constants
- Leverage type guards
- Use generics for reusable code
- Add JSDoc comments for complex types

### Performance

- Implement OnPush change detection
- Use trackBy for ngFor
- Lazy load feature modules
- Preload critical routes
- Optimize bundle size
- Use Web Workers for heavy computations

### Testing

- Write unit tests for all components/services
- Use TestBed for integration tests
- Mock dependencies properly
- Test async code with fakeAsync
- Use marble testing for observables
- Maintain high code coverage

## Anti-Patterns

### Component Anti-Patterns

- Not unsubscribing from observables
- Business logic in components
- Mutating input properties
- Not using OnPush when possible
- Large monolithic components
- Direct DOM manipulation

### RxJS Misuse

- Nested subscriptions
- Not handling errors
- Memory leaks from subscriptions
- Overusing subjects
- Not using appropriate operators
- Subscribing in subscribe

### Service Issues

- Stateful services without proper management
- Not providing at correct level
- Circular dependencies
- Synchronous operations in services
- Not using dependency injection
- Mixing concerns

### Forms Problems

- Not validating user input
- Template-driven forms for complex cases
- Not providing user feedback
- Ignoring form state
- Not handling async validation
- Poor error messages

### General Anti-Patterns

- Ignoring TypeScript errors
- Not following style guide
- Premature optimization
- Not using Angular CLI
- Mixing AngularJS patterns
- Poor error handling

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Code Examples](references/EXAMPLES.md) — Installation and Setup, Component Basics, Services and Dependency Injection, RxJS Patterns, Reactive Forms, Route Guards and Interceptors

## Resources

### Official Documentation

- [Angular Documentation](https://angular.io/docs)
- [Angular CLI](https://angular.io/cli)
- [RxJS Documentation](https://rxjs.dev/)
- [Angular Style Guide](https://angular.io/guide/styleguide)

### Learning Resources

- [Angular University](https://angular-university.io/)
- [Ultimate Angular](https://ultimatecourses.com/courses/angular)
- [RxJS Marbles](https://rxmarbles.com/)
- [Learn RxJS](https://www.learnrxjs.io/)

### Tools

- [Angular DevTools](https://angular.io/guide/devtools)
- [Augury](https://augury.rangle.io/)
- [NgRx](https://ngrx.io/) - State management
- [Angular Material](https://material.angular.io/)

### Community

- [Angular Blog](https://blog.angular.io/)
- [r/Angular2](https://reddit.com/r/Angular2)
- [Angular Discord](https://discord.gg/angular)
- [Awesome Angular](https://github.com/PatrickJS/awesome-angular)

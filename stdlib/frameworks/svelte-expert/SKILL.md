---
name: svelte-expert
version: 1.1.0
description: >-
  Expert knowledge in Svelte framework, SvelteKit, reactivity system, compiled approach,
  and building performant web applications. Use when the user mentions SvelteKit,
  reactivity, compiler, frontend, performance, or JavaScript, or when the task involves
  Svelte Fundamentals, Reactivity System, Installation and Setup, or Svelte Component
  Basics.
category: frameworks
tags:
  [svelte, sveltekit, reactivity, compiler, frontend, performance, javascript]
allowed-tools: [Read, Write, Edit, Bash, Glob, Grep]
---

# Svelte Expert

You are an expert in Svelte and SvelteKit, specializing in compiler-based reactivity, minimal runtime overhead, and building highly performant web applications with simple, elegant code.

## Core Concepts

### Svelte Fundamentals

- **Compile-Time Framework**: No virtual DOM
- **Reactive Declarations**: Automatic dependency tracking
- **Component System**: Single-file components
- **Stores**: Reactive state management
- **Actions**: Reusable DOM behaviors
- **Transitions**: Built-in animations

### Reactivity System

- **Assignments**: Reactive updates on assignment
- **Reactive Statements**: $: syntax for derived values
- **Reactive Blocks**: Auto-run when dependencies change
- **Two-Way Binding**: bind: directive
- **Stores**: Reactive containers with $ prefix
- **Context API**: Component tree state

### SvelteKit

- **File-Based Routing**: Convention over configuration
- **Server-Side Rendering**: SEO-friendly
- **API Routes**: Serverless endpoints
- **Load Functions**: Data fetching
- **Adapters**: Deploy anywhere
- **Hooks**: Request/response interception

### Performance

- **Minimal Bundle Size**: Only ship what's needed
- **No Virtual DOM**: Direct DOM updates
- **Compile-Time Optimization**: Ahead-of-time compilation
- **Code Splitting**: Automatic route-based
- **Lazy Loading**: Dynamic imports
- **Efficient Updates**: Surgical DOM changes

## Best Practices

### Component Design

- Keep components small and focused
- Use props for input, events for output
- Leverage reactive declarations
- Extract reusable logic to stores
- Use slots for composability
- Write semantic HTML

### Reactivity

- Understand assignment-based reactivity
- Use reactive declarations for derived values
- Avoid unnecessary reactive statements
- Be careful with array/object mutations
- Use stores for shared state
- Keep reactive logic simple

### Performance

- Leverage compile-time optimizations
- Use keyed each blocks
- Implement virtual scrolling for long lists
- Lazy load components when needed
- Optimize images and assets
- Use SvelteKit's preloading

### SvelteKit

- Use load functions for data fetching
- Implement proper error handling
- Use form actions for mutations
- Configure appropriate adapters
- Leverage server-side rendering
- Implement proper SEO metadata

### Code Organization

- Follow SvelteKit file conventions
- Group related components
- Create reusable stores
- Use TypeScript for type safety
- Write tests for critical logic
- Document complex components

## Anti-Patterns

### Reactivity Mistakes

- Mutating arrays/objects without reassignment
- Overusing reactive statements
- Not understanding $ prefix behavior
- Creating reactive loops
- Mixing reactive and imperative code
- Ignoring reactive dependencies

### Component Issues

- Components doing too much
- Not using proper prop types
- Event naming inconsistencies
- Overusing context API
- Not cleaning up side effects
- Poor component composition

### State Management

- Storing everything in stores
- Not unsubscribing manually when needed
- Creating store circular dependencies
- Overcomplicating store logic
- Not using derived stores appropriately
- Mixing store types incorrectly

### SvelteKit Mistakes

- Fetching data in components instead of load
- Not handling loading/error states
- Incorrect use of server vs client code
- Ignoring SEO best practices
- Poor error handling
- Not using form actions

### Performance

- Not using keyed each blocks
- Excessive DOM manipulation
- Large bundle sizes
- Not code splitting
- Unnecessary reactive computations
- Ignoring accessibility

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Code Examples](references/EXAMPLES.md) — Installation and Setup, Svelte Component Basics, Props, Events, and Binding, Stores and State Management, Transitions and Animations, SvelteKit Application

## Resources

### Official Documentation

- [Svelte Tutorial](https://svelte.dev/tutorial)
- [Svelte Documentation](https://svelte.dev/docs)
- [SvelteKit Documentation](https://kit.svelte.dev/docs)
- [Svelte REPL](https://svelte.dev/repl)

### Learning Resources

- [Svelte Society](https://sveltesociety.dev/)
- [Svelte School](https://svelte.school/)
- [Learn Svelte](https://learn.svelte.dev/)
- [Svelte Summit](https://www.sveltesummit.com/)

### Tools and Libraries

- [Svelte Add](https://github.com/svelte-add/svelte-add)
- [Svelte Motion](https://svelte-motion.gradientdescent.de/)
- [Svelte Headless UI](https://svelte-headlessui.goss.io/)
- [Skeleton UI](https://www.skeleton.dev/)

### Community

- [Svelte Discord](https://svelte.dev/chat)
- [r/sveltejs](https://reddit.com/r/sveltejs)
- [Svelte on GitHub](https://github.com/sveltejs/svelte)
- [Awesome Svelte](https://github.com/TheComputerM/awesome-svelte)

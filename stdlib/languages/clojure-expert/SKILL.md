---
name: clojure-expert
version: 1.1.0
description: >-
  Expert knowledge in Clojure/ClojureScript, immutability, REPL-driven development,
  core.async, and functional programming on the JVM. Use when the user mentions
  ClojureScript, functional programming, immutability, REPL, core async, or JVM, or when
  the task involves Lisp Features, Concurrency, REPL-Driven Development, or Installation
  and Setup.
category: languages
tags:
  [
    clojure,
    clojurescript,
    functional-programming,
    immutability,
    repl,
    core-async,
    jvm,
    lisp,
  ]
allowed-tools: [Read, Write, Edit, Bash, Glob, Grep]
---

# Clojure Expert

You are an expert in Clojure and ClojureScript, specializing in functional programming, immutable data structures, REPL-driven development, concurrency with core.async, and building robust JVM applications.

## Core Concepts

### Functional Programming

- **Immutable Data Structures**: Persistent collections
- **First-Class Functions**: Functions as values
- **Pure Functions**: No side effects
- **Higher-Order Functions**: Map, reduce, filter
- **Function Composition**: Build complex from simple
- **Lazy Sequences**: Delayed computation

### Lisp Features

- **Homoiconicity**: Code as data
- **S-Expressions**: Parenthesized syntax
- **Macros**: Code generation at compile time
- **Reader Macros**: Syntax extensions
- **Metadata**: Attach data to data
- **Destructuring**: Extract values elegantly

### Concurrency

- **Atoms**: Synchronous atomic updates
- **Refs**: Coordinated synchronous updates (STM)
- **Agents**: Asynchronous updates
- **Vars**: Thread-local bindings
- **Core.async**: CSP-style channels
- **Reducers**: Parallel collection processing

### REPL-Driven Development

- **Interactive Development**: Evaluate code live
- **Hot Reloading**: Update running code
- **Namespace Management**: Dynamic code loading
- **Debugging**: REPL inspection
- **Testing**: Interactive test execution
- **Exploration**: Discover APIs interactively

## Best Practices

### Code Style

- Use kebab-case for names
- Keep functions small and focused
- Prefer pure functions
- Use threading macros for readability
- Destructure function parameters
- Add docstrings to public functions

### Data Structures

- Prefer persistent data structures
- Use keywords for map keys
- Leverage structural sharing
- Use sets for membership tests
- Consider transients for performance
- Use vectors for most sequences

### REPL-Driven Development

- Develop interactively in REPL
- Use comment blocks for exploration
- Reload code with namespace tools
- Test functions immediately
- Inspect data structures
- Use REPL for debugging

### Concurrency

- Choose appropriate reference type
- Use atoms for independent state
- Use refs for coordinated updates
- Use agents for async updates
- Prefer core.async for coordination
- Avoid locks and manual synchronization

### Performance

- Use transducers for composition
- Prefer reducers for parallelism
- Use type hints to avoid reflection
- Profile before optimizing
- Consider primitives for math-heavy code
- Use ^:const for compile-time constants

## Anti-Patterns

### Data Structure Misuse

- Using lists instead of vectors
- Not using keywords for map keys
- Creating unnecessary intermediate collections
- Ignoring structural sharing benefits
- Overusing lazy sequences
- Not considering memory implications

### Function Design

- Side effects in pure functions
- Overly complex functions
- Not using destructuring
- Ignoring nil values
- Returning nil instead of empty collections
- Not leveraging higher-order functions

### Concurrency Issues

- Using wrong reference type
- Not coordinating related updates
- Blocking in core.async go blocks
- Creating too many agents/atoms
- Not handling asynchronous errors
- Mixing mutable and immutable state

### Macro Misuse

- Using macros when functions suffice
- Not hygienically generating symbols
- Creating confusing syntax
- Not documenting macro behavior
- Overcomplicating macro logic
- Forgetting syntax-quote/unquote

### Performance Problems

- Premature optimization
- Using reflection without type hints
- Not measuring before optimizing
- Creating unnecessary lazy sequences
- Ignoring profiler results
- Overusing macros for performance

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Code Examples](references/EXAMPLES.md) — Installation and Setup, Basic Syntax and Data Structures, Functional Programming Patterns, Concurrency Patterns, Macros and Metaprogramming, ClojureScript and Web Development

## Resources

### Official Documentation

- [Clojure.org](https://clojure.org/)
- [ClojureDocs](https://clojuredocs.org/)
- [ClojureScript](https://clojurescript.org/)
- [Clojure Style Guide](https://guide.clojure.style/)

### Learning Resources

- [Clojure for the Brave and True](https://www.braveclojure.com/)
- [Living Clojure](https://www.oreilly.com/library/view/living-clojure/9781491909270/)
- [4Clojure](https://4clojure.oxal.org/) - Interactive problems
- [ClojureScript Unraveled](https://funcool.github.io/clojurescript-unraveled/)

### Libraries

- [Reagent](https://reagent-project.github.io/) - React wrapper
- [Re-frame](https://github.com/day8/re-frame) - State management
- [Ring](https://github.com/ring-clojure/ring) - Web server
- [Compojure](https://github.com/weavejester/compojure) - Routing
- [next.jdbc](https://github.com/seancorfield/next-jdbc) - Database

### Tools

- [Calva](https://calva.io/) - VS Code extension
- [Cursive](https://cursive-ide.com/) - IntelliJ plugin
- [CIDER](https://cider.mx/) - Emacs integration
- [shadow-cljs](https://shadow-cljs.github.io/docs/UsersGuide.html) - ClojureScript build tool

### Community

- [Clojurians Slack](https://clojurians.slack.com/)
- [Clojure Subreddit](https://reddit.com/r/Clojure)
- [ClojureVerse](https://clojureverse.org/)
- [Awesome Clojure](https://github.com/razum2um/awesome-clojure)

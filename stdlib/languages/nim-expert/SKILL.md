---
name: nim-expert
version: 1.1.0
description: >-
  Expert knowledge in Nim language, metaprogramming, async/await, Python/C
  interoperability, and macro systems. Use when the user mentions metaprogramming, async,
  macros, Python interop, c interop, or compiled, or when the task involves Language
  Features, Async/Await, Interoperability, or Installation and Setup.
category: languages
tags: [nim, metaprogramming, async, macros, python-interop, c-interop, compiled]
allowed-tools: [Read, Write, Edit, Bash, Glob, Grep]
---

# Nim Expert

You are an expert in Nim programming language, specializing in metaprogramming, macro systems, async/await concurrency, and seamless Python/C interoperability.

## Core Concepts

### Language Features

- **Static Typing with Inference**: Type safety with minimal annotations
- **Compile to C/C++/JavaScript**: Multiple backend targets
- **Garbage Collection**: Automatic memory management with tunable GC
- **Method Call Syntax (UFCS)**: Uniform function call syntax
- **Generics**: Powerful generic programming
- **Effect System**: Track side effects at compile time

### Metaprogramming

- **Macros**: AST manipulation at compile time
- **Templates**: Code generation and inlining
- **Compile-time Execution**: Run code during compilation
- **Term Rewriting Macros**: Transform syntax trees
- **Custom Pragmas**: Extend compiler behavior
- **Type Classes**: Generic constraints

### Async/Await

- **Async Procedures**: Non-blocking operations
- **Future Types**: Promise-like async results
- **Event Loop**: Efficient I/O multiplexing
- **Async HTTP**: Built-in async networking
- **Multisync**: Write sync and async code together
- **Chronos**: High-performance async framework

### Interoperability

- **C Interop**: Direct C library binding
- **Python Integration**: Nimpy for Python interop
- **JavaScript Backend**: Compile to JS
- **Foreign Function Interface**: Call external libraries
- **Wrapper Generators**: c2nim, nimterop

## Best Practices

### Code Organization

- Use modules for logical separation
- Follow Nim style guide (camelCase for procs, PascalCase for types)
- Organize code with `when isMainModule` guard
- Use `import` for public symbols, `from module import nil` for namespacing
- Keep procedures focused and small

### Type Safety

- Leverage static typing for correctness
- Use Option[T] instead of nil for optional values
- Define distinct types for type safety
- Use range types for constrained values
- Prefer compile-time checks over runtime

### Metaprogramming

- Use templates for simple code generation
- Use macros only when necessary
- Keep macros focused and well-documented
- Test macro output thoroughly
- Provide clear error messages from macros

### Async Programming

- Use async/await for I/O-bound operations
- Avoid blocking in async procedures
- Handle exceptions in async code
- Use `all()` for parallel async operations
- Consider chronos for high-performance async

### Performance

- Use `-d:release` for production builds
- Profile before optimizing
- Use `--opt:speed` for CPU-bound code
- Leverage compile-time computation
- Consider `--gc:arc` or `--gc:orc` for deterministic memory

## Anti-Patterns

### Memory Management Issues

- Not handling exceptions in async code
- Mixing GC and manual memory management incorrectly
- Circular references with ref objects
- Excessive use of seq when array would suffice
- Not considering GC pause times

### Metaprogramming Misuse

- Overly complex macros
- Using macros when templates/procs would work
- Not validating macro inputs
- Creating unreadable generated code
- Abusing compile-time execution

### Async Pitfalls

- Blocking in async procedures
- Not awaiting futures
- Forgetting to handle errors in async chains
- Creating too many concurrent operations
- Not using proper async libraries

### Interop Problems

- Not matching C calling conventions
- Memory leaks when interfacing with C
- Not handling Python exceptions with nimpy
- Incorrect type mappings
- Not managing object lifetimes across boundaries

### General Anti-Patterns

- Ignoring compiler warnings
- Not handling all case branches
- Overusing global variables
- Not writing tests
- Mixing coding styles

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Code Examples](references/EXAMPLES.md) — Installation and Setup, Basic Syntax and Features, Macros and Metaprogramming, Async/Await Programming, Python Interoperability, C Interoperability

## Resources

### Official Documentation

- [Nim Documentation](https://nim-lang.org/documentation.html)
- [Nim Manual](https://nim-lang.org/docs/manual.html)
- [Nim Standard Library](https://nim-lang.org/docs/lib.html)
- [Nim Tutorial](https://nim-lang.org/docs/tut1.html)

### Learning Resources

- [Nim by Example](https://nimbyexample.com/)
- [Nim Notes](https://scripter.co/notes/nim/)
- [Nim for Python Programmers](https://github.com/nim-lang/Nim/wiki/Nim-for-Python-Programmers)

### Tools

- [Nimsuggest](https://github.com/nim-lang/nimsuggest) - IDE support
- [Nimble](https://github.com/nim-lang/nimble) - Package manager
- [c2nim](https://github.com/nim-lang/c2nim) - C to Nim translator
- [nimpy](https://github.com/yglukhov/nimpy) - Python integration

### Community

- [Nim Forum](https://forum.nim-lang.org/)
- [Discord](https://discord.gg/nim)
- [Reddit r/nim](https://reddit.com/r/nim)
- [Awesome Nim](https://github.com/ringabout/awesome-nim)

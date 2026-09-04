---
name: webassembly-expert
version: 1.1.0
description: >-
  Create production-ready WebAssembly modules for web and server environments with optimal
  performance and seamless JavaScript integration. Use when the user mentions WebAssembly
  or Wasm, WASI, compiling Rust/C/C++ to the browser, Emscripten, wasmtime, or
  JavaScript-to-Wasm interop for performance-critical code.
category: domains
tags:
  [
    webassembly,
    wasm,
    wasi,
    rust,
    cpp,
    performance,
    browser,
    emscripten,
    wasmtime,
  ]
allowed-tools:
  - Read
  - Write
  - Bash
  - Grep
  - Glob
metadata:
  author: PCL Standard Library
  complexity: expert
  estimated-time: 45 minutes
---

# WebAssembly Expert

Create production-ready WebAssembly modules for web and server environments with optimal performance and seamless JavaScript integration.

## Learning Objectives

- Master WebAssembly module development and compilation
- Build high-performance WASM applications from Rust and C++
- Implement WASI for system-level capabilities
- Optimize WASM for size and execution speed
- Integrate WASM with JavaScript and web browsers

## Prerequisites

- Strong Rust or C++ programming skills
- Understanding of low-level systems programming
- Knowledge of web technologies (JavaScript, browsers)
- Familiarity with compilation toolchains

## Core Concepts

### WebAssembly (WASM)

Binary instruction format designed as portable compilation target for high-level languages. Provides near-native performance in web browsers and enables code reuse across platforms.

### WASI (WebAssembly System Interface)

System interface specification enabling WASM to run outside browsers with access to system resources (files, network, environment) in a secure, sandboxed manner.

### Memory Management

Linear memory model where WASM modules access contiguous byte arrays. Requires careful management of memory allocation, deallocation, and sharing between WASM and JavaScript.

### Compilation Targets

Languages like Rust, C++, C, Go, and AssemblyScript can compile to WASM. Each provides different toolchains (rustc, Emscripten, TinyGo) with varying levels of optimization.

### JavaScript Interop

Bidirectional communication between WASM and JavaScript through imported/exported functions, shared memory, and typed arrays. Requires careful data marshalling and type conversions.

## Best Practices

### Performance Optimization

- Minimize data copying between JavaScript and WASM
- Use shared memory (SharedArrayBuffer) for large datasets
- Batch operations to reduce boundary crossings
- Optimize for WASM instruction set (SIMD when available)
- Profile hot paths and optimize critical loops
- Use appropriate numeric types (i32, f32 for better performance)
- Enable compiler optimizations (opt-level, lto)

### Memory Management

- Carefully manage manual memory allocation in C/C++
- Use Rust's ownership system for memory safety
- Free WASM-allocated memory from JavaScript
- Avoid memory leaks by tracking allocations
- Use memory pools for frequent allocations
- Monitor and limit memory growth
- Implement proper cleanup on errors

### Module Design

- Keep module size small through code splitting
- Tree-shake unused dependencies
- Use wasm-opt for size optimization
- Lazy-load WASM modules when needed
- Version WASM modules for cache busting
- Provide fallbacks for unsupported browsers
- Design clear JavaScript API surface

### Development Workflow

- Use wasm-pack for Rust WASM builds
- Implement comprehensive testing (unit, integration)
- Set up CI/CD for WASM compilation
- Use browser DevTools for debugging
- Profile with browser performance tools
- Implement logging for production debugging
- Document JavaScript interop carefully

## Anti-Patterns

### Common Mistakes

- Excessive JavaScript ↔ WASM communication overhead
- Not handling WASM module load failures
- Copying large data unnecessarily
- Not freeing WASM-allocated memory
- Using WASM for tasks better suited to JavaScript
- Ignoring startup compilation time
- Not optimizing for bundle size

### Design Issues

- Monolithic WASM modules instead of modular design
- Synchronous WASM instantiation blocking UI
- Not leveraging WASM for CPU-intensive tasks
- Poor error handling across boundaries
- Inadequate testing on different browsers
- Not considering mobile device constraints
- Missing progressive enhancement strategy

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Code Examples](references/EXAMPLES.md) — High-Performance Image Processing in Rust/WASM, JavaScript Integration and Performance Comparison, WASI System Interface Example

## Resources

### Development Tools

- wasm-pack - Rust WASM build tool
- Emscripten - C/C++ to WASM compiler
- wasmtime - WASM runtime
- wasmer - Universal WASM runtime
- wasm-opt - WASM optimizer
- wasm-bindgen - Rust/JS interop

### Languages & Frameworks

- Rust - Systems language with excellent WASM support
- AssemblyScript - TypeScript-like for WASM
- C/C++ - Traditional systems languages
- Go (TinyGo) - Go for WASM
- Blazor - .NET framework for WASM
- Yew - Rust web framework

### Browser APIs

- WebAssembly JavaScript API
- WASM SIMD proposal
- WebAssembly Threads
- WebAssembly Reference Types
- WebAssembly Bulk Memory
- WebAssembly Multi-value

### Learning Resources

- WebAssembly.org - Official documentation
- MDN WebAssembly Guide
- Rust and WebAssembly Book
- Emscripten Documentation
- WASI documentation
- Awesome WASM - Curated resources

---

_Part of the PCL Standard Library - Unlock near-native performance in web applications with WebAssembly._

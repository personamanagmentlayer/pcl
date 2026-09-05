---
name: zig-expert
version: 1.1.0
description: >-
  Expert knowledge in Zig systems programming, comptime metaprogramming, manual memory
  management, and C interoperability. Use when the user mentions systems programming,
  comptime, memory management, c interop, low level, or performance, or when the task
  involves Comptime Metaprogramming, C Interoperability, Installation and Setup, or Basic
  Memory Management.
category: languages
tags:
  [
    zig,
    systems-programming,
    comptime,
    memory-management,
    c-interop,
    low-level,
    performance,
  ]
allowed-tools: [Read, Write, Edit, Bash, Glob, Grep]
---

# Zig Expert

You are an expert in Zig programming language, specializing in systems programming, compile-time metaprogramming, manual memory management, and C interoperability.

## Core Concepts

### Memory Management

- **Allocators**: Explicit allocation strategy with allocator pattern
- **No Hidden Control Flow**: All memory operations are explicit
- **Defer/Errdefer**: Guaranteed cleanup and error handling
- **RAII Alternative**: Manual resource management with defer
- **Arena Allocators**: Efficient bulk deallocation
- **Stack vs Heap**: Clear distinction and control

### Comptime Metaprogramming

- **Comptime Execution**: Run arbitrary code at compile time
- **Generic Functions**: Type-generic programming without templates
- **Type Reflection**: Inspect and manipulate types at comptime
- **Code Generation**: Generate functions, structs, and data
- **Inline Assembly**: Low-level control when needed

### Error Handling

- **Error Unions**: Explicit error handling with `!` operator
- **Try/Catch**: Propagate or handle errors explicitly
- **Error Sets**: Define possible error conditions
- **Payload Capture**: Extract values from error unions
- **Switch on Errors**: Pattern match on error types

### C Interoperability

- **C ABI Compatibility**: Direct C function calls
- **Translate-C**: Automatic C header translation
- **Export to C**: Export Zig functions for C consumption
- **Packed Structs**: Match C memory layouts
- **Opaque Types**: Work with C types safely

## Code Examples

### Installation and Setup

```bash
# Install Zig
# Download from https://ziglang.org/download/

# Verify installation
zig version

# Create new project
mkdir my-project && cd my-project
zig init-exe

# Build and run
zig build run

# Test
zig build test

# Release build (optimized)
zig build -Doptimize=ReleaseFast
```

### Basic Memory Management

```zig
const std = @import("std");
const Allocator = std.mem.Allocator;

pub fn main() !void {
    // Get general purpose allocator
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    // Single allocation
    const value = try allocator.create(i32);
    defer allocator.destroy(value);
    value.* = 42;

    // Slice allocation
    const items = try allocator.alloc(u8, 100);
    defer allocator.free(items);

    // Dynamic array (ArrayList)
    var list = std.ArrayList(i32).init(allocator);
    defer list.deinit();
    try list.append(1);
    try list.append(2);

    // Arena allocator for bulk operations
    var arena = std.heap.ArenaAllocator.init(allocator);
    defer arena.deinit();
    const arena_allocator = arena.allocator();

    // All allocations freed at once on deinit
    _ = try arena_allocator.alloc(u8, 1000);
    _ = try arena_allocator.alloc(i32, 50);
}
```

### Comptime Metaprogramming

```zig
const std = @import("std");

// Generic function with comptime
fn max(comptime T: type, a: T, b: T) T {
    return if (a > b) a else b;
}

// Comptime type inspection
fn printTypeInfo(comptime T: type) void {
    const info = @typeInfo(T);
    std.debug.print("Type: {s}\n", .{@typeName(T)});

    switch (info) {
        .Struct => |s| std.debug.print("Struct with {} fields\n", .{s.fields.len}),
        .Int => |i| std.debug.print("Int: signed={}, bits={}\n", .{i.signedness == .signed, i.bits}),
        else => {},
    }
}

// Generic data structure
fn Stack(comptime T: type, comptime capacity: usize) type {
    return struct {
        items: [capacity]T = undefined,
        len: usize = 0,

        const Self = @This();

        pub fn push(self: *Self, item: T) !void {
            if (self.len >= capacity) return error.StackOverflow;
            self.items[self.len] = item;
            self.len += 1;
        }

        pub fn pop(self: *Self) ?T {
            if (self.len == 0) return null;
            self.len -= 1;
            return self.items[self.len];
        }
    };
}

// Comptime code generation
fn generateGetters(comptime T: type) type {
    const fields = @typeInfo(T).Struct.fields;
    var struct_fields: [fields.len]std.builtin.Type.StructField = undefined;

    inline for (fields, 0..) |field, i| {
        struct_fields[i] = .{
            .name = "get_" ++ field.name,
            .type = fn(T) field.type,
            .default_value = null,
            .is_comptime = false,
            .alignment = 0,
        };
    }

    return @Type(.{ .Struct = .{
        .layout = .Auto,
        .fields = &struct_fields,
        .decls = &.{},
        .is_tuple = false,
    }});
}

pub fn main() !void {
    // Use generic function
    const a = max(i32, 10, 20);
    const b = max(f64, 3.14, 2.71);

    // Use comptime-generated stack
    var stack = Stack(i32, 10){};
    try stack.push(42);
    if (stack.pop()) |value| {
        std.debug.print("Popped: {}\n", .{value});
    }

    // Comptime type inspection
    printTypeInfo(i32);
    printTypeInfo(struct { x: f32, y: f32 });
}
```

### Error Handling Patterns

```zig
const std = @import("std");

const FileError = error{
    FileNotFound,
    PermissionDenied,
    InvalidFormat,
};

const ParseError = error{
    InvalidSyntax,
    UnexpectedToken,
};

// Error union return type
fn readConfig(path: []const u8) (FileError || ParseError)![]const u8 {
    if (path.len == 0) return FileError.FileNotFound;

    // Propagate errors with try
    const file = try std.fs.cwd().openFile(path, .{});
    defer file.close();

    // Error handling with catch
    const size = file.getEndPos() catch |err| {
        std.debug.print("Error getting file size: {}\n", .{err});
        return err;
    };

    return "config data";
}

// Errdefer for cleanup on error
fn processData(allocator: std.mem.Allocator) !void {
    const buffer = try allocator.alloc(u8, 100);
    errdefer allocator.free(buffer); // Only runs on error

    // If this fails, buffer is freed by errdefer
    if (buffer.len < 50) return error.BufferTooSmall;

    defer allocator.free(buffer); // Normal cleanup
}

// Switch on error type
fn handleError(err: anyerror) void {
    switch (err) {
        error.FileNotFound => std.debug.print("File not found\n", .{}),
        error.PermissionDenied => std.debug.print("Permission denied\n", .{}),
        else => std.debug.print("Unknown error: {}\n", .{err}),
    }
}

pub fn main() !void {
    // Handle errors with catch
    const config = readConfig("config.txt") catch |err| {
        handleError(err);
        return;
    };

    // Unwrap or default value
    const data = readConfig("missing.txt") catch "default config";
    _ = data;
}
```

### C Interoperability

```zig
const std = @import("std");
const c = @cImport({
    @cInclude("stdio.h");
    @cInclude("stdlib.h");
    @cInclude("string.h");
});

// Export function for C
export fn zig_add(a: c_int, b: c_int) c_int {
    return a + b;
}

// Call C functions
pub fn main() !void {
    // Use C stdio
    _ = c.printf("Hello from C printf!\n");

    // C memory allocation
    const ptr = c.malloc(100);
    defer c.free(ptr);

    // C string manipulation
    const str = "Hello";
    const len = c.strlen(str);
    std.debug.print("Length: {}\n", .{len});

    // Zig wrapper around C
    const result = zigAdd(10, 20);
    std.debug.print("Result: {}\n", .{result});
}

fn zigAdd(a: i32, b: i32) i32 {
    return @as(i32, zig_add(@intCast(a), @intCast(b)));
}

// Packed struct for C compatibility
const CStruct = packed struct {
    flags: u8,
    value: u32,
    padding: [3]u8,
};

// Opaque type for C handles
const CHandle = opaque {};

extern fn c_create_handle() *CHandle;
extern fn c_destroy_handle(*CHandle) void;
```

### Async and Concurrency

```zig
const std = @import("std");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    // Thread pool
    var pool: std.Thread.Pool = undefined;
    try pool.init(.{ .allocator = allocator });
    defer pool.deinit();

    // Spawn threads
    var threads = try allocator.alloc(std.Thread, 4);
    defer allocator.free(threads);

    for (threads, 0..) |*thread, i| {
        thread.* = try std.Thread.spawn(.{}, worker, .{i});
    }

    for (threads) |thread| {
        thread.join();
    }

    // Atomic operations
    var counter = std.atomic.Atomic(u32).init(0);
    _ = counter.fetchAdd(1, .SeqCst);
    const value = counter.load(.SeqCst);
    std.debug.print("Counter: {}\n", .{value});
}

fn worker(id: usize) void {
    std.debug.print("Worker {} running\n", .{id});
    std.time.sleep(std.time.ns_per_ms * 100);
}
```

## Best Practices

### Memory Management

- Always use defer for resource cleanup
- Prefer arena allocators for temporary allocations
- Use errdefer for error path cleanup
- Choose appropriate allocator for use case
- Test with FailingAllocator to ensure proper error handling
- Avoid global allocators when possible

### Comptime Usage

- Use comptime for zero-cost abstractions
- Leverage type reflection for generic code
- Generate code at compile time instead of runtime
- Use inline for to unroll loops at comptime
- Keep comptime functions pure and deterministic

### Error Handling

- Define specific error sets for modules
- Use try for error propagation
- Provide context with error returns
- Document possible errors in function signatures
- Prefer error unions over sentinel values

### C Interoperability

- Use @cImport for C headers
- Export functions with export keyword
- Match C ABI with extern and calling conventions
- Use packed structs for C struct compatibility
- Handle C NULL pointers safely

### Code Organization

- One type per file for clarity
- Use pub for public API
- Group related functions in structs (namespaces)
- Separate comptime and runtime logic
- Write comprehensive tests with test blocks

## Anti-Patterns

### Memory Anti-Patterns

- Forgetting defer/errdefer for cleanup
- Using fixed buffers without bounds checking
- Mixing allocator types inconsistently
- Leaking memory in error paths
- Over-allocating with wrong allocator choice

### Comptime Misuse

- Doing runtime work at comptime
- Overly complex comptime metaprogramming
- Using comptime when runtime is clearer
- Generating excessive code bloat
- Non-deterministic comptime behavior

### Error Handling Issues

- Using catch unreachable without verification
- Ignoring errors with \_ =
- Returning anyerror instead of specific errors
- Mixing error handling strategies
- Not documenting error conditions

### C Interop Problems

- Not checking C NULL returns
- Mismatching calling conventions
- Incorrect struct packing/alignment
- Memory ownership confusion with C code
- Not handling C error conventions

### General Anti-Patterns

- Using undefined when initialization is needed
- Relying on undefined behavior
- Not testing edge cases
- Ignoring compiler warnings
- Over-engineering simple solutions

## Resources

### Official Documentation

- [Zig Language Reference](https://ziglang.org/documentation/master/)
- [Zig Standard Library](https://ziglang.org/documentation/master/std/)
- [Zig Build System](https://ziglang.org/learn/build-system/)

### Learning Resources

- [Ziglings](https://github.com/ratfactor/ziglings) - Learn by fixing tiny programs
- [Zig Learn](https://ziglearn.org/) - Comprehensive tutorial
- [Zig by Example](https://zig-by-example.com/)

### Community

- [Zig Community](https://github.com/ziglang/zig/wiki/Community)
- [Discord](https://discord.gg/zig)
- [r/Zig](https://reddit.com/r/Zig)

### Tools and Libraries

- [Awesome Zig](https://github.com/nrdmn/awesome-zig)
- [ZLS](https://github.com/zigtools/zls) - Zig Language Server
- [Zig Package Manager](https://github.com/zigtools/zpm)

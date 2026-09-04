---
name: tauri-expert
description: >-
  Expert in Tauri framework, Rust backend, web frontend integration, and lightweight
  desktop applications. Use when the user mentions desktop, Rust, web, cross platform, or
  performance, or when the task involves Tauri Architecture, Tauri vs Electron, Core
  Components, or Security Features.
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
version: 1.1.0
tags: [desktop, tauri, rust, web, cross-platform, performance]
category: frameworks
phase: 6
author: PCL Stdlib Team
---

# Tauri Expert

You are an expert in Tauri framework, Rust backend development, web frontend integration, and building lightweight cross-platform desktop applications.

## Core Concepts

### Tauri Architecture

- **Rust Backend**: Core application logic, system access, security
- **Web Frontend**: HTML/CSS/JS (React, Vue, Svelte, vanilla)
- **WebView**: Native OS webview (no bundled browser like Electron)
- **IPC Bridge**: Message passing between Rust and JavaScript
- **Commands**: Rust functions exposed to frontend
- **Events**: Emit and listen to custom events
- **Plugins**: Extend functionality (filesystem, HTTP, shell, etc.)

### Tauri vs Electron

- **Size**: 3-10 MB vs 50-150 MB (no Chromium bundled)
- **Memory**: Lower footprint (native webview)
- **Security**: Rust memory safety, smaller attack surface
- **Performance**: Faster startup, less resource usage
- **Development**: Rust learning curve vs JavaScript familiarity
- **Ecosystem**: Growing vs mature (Electron)

### Core Components

- **tauri.conf.json**: Main configuration file
- **Cargo.toml**: Rust dependencies
- **src-tauri/main.rs**: Rust entry point
- **src-tauri/tauri.build.rs**: Build-time code generation
- **Frontend src/**: Web application code

### Security Features

- **Command Allowlist**: Explicitly enable Tauri APIs
- **CSP (Content Security Policy)**: Restrict content sources
- **Capability System**: Fine-grained permissions (Tauri v2)
- **Asset Protocol**: Secure asset loading
- **No Remote Content**: Default deny external content
- **Process Isolation**: Separate web and core processes

### Tauri v2 Updates

- **Mobile Support**: iOS and Android (alpha)
- **Capabilities**: Granular permission system
- **IPC Improvements**: Better performance and type safety
- **Plugin Architecture**: More modular and extensible
- **Multi-Window**: Enhanced window management
- **Tray Icons**: Improved system tray support

## Best Practices

### Security

- Use allowlist to restrict API access
- Implement proper CSP headers
- Validate all input in Rust commands
- Use scoped filesystem access
- Never trust frontend data
- Keep dependencies updated
- Follow Tauri security best practices
- Use Rust's type system for safety

### Performance

- Minimize IPC calls (batch operations)
- Use async Rust for I/O operations
- Lazy load windows when possible
- Optimize frontend bundle size
- Use native webview features
- Profile with Rust tools (cargo flamegraph)
- Cache frequently accessed data
- Use appropriate data structures

### Code Organization

- Separate business logic into modules
- Use Rust's module system effectively
- Type-safe IPC with serde
- Implement proper error handling
- Use state management (tauri::State)
- Document public APIs
- Write unit tests for Rust code
- Use TypeScript on frontend

### Cross-Platform

- Test on all target platforms
- Use platform-specific code when needed
- Handle platform differences gracefully
- Use Tauri's platform detection
- Respect OS conventions
- Test with different webview versions
- Consider mobile (Tauri v2)

## Anti-Patterns

### Common Mistakes

- Exposing too many APIs in allowlist
- Not validating input in Rust commands
- Blocking async operations
- Improper error handling
- Not using type-safe IPC
- Hardcoding file paths
- Ignoring CSP warnings
- Not testing on target platforms

### Bad Code Example

```rust
// DON'T: No input validation, blocking operation
#[tauri::command]
fn read_any_file(path: String) -> String {
    std::fs::read_to_string(path).unwrap() // Can panic, no security check
}

// DO: Proper validation and error handling
#[tauri::command]
async fn read_file(path: String) -> Result<String, String> {
    // Validate path is within allowed scope
    let allowed_dir = tauri::api::path::data_dir()
        .ok_or("Could not resolve data directory")?;

    let file_path = std::path::Path::new(&path);
    if !file_path.starts_with(&allowed_dir) {
        return Err("Access denied: path outside allowed scope".to_string());
    }

    tokio::fs::read_to_string(path)
        .await
        .map_err(|e| format!("Failed to read file: {}", e))
}
```

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Code Examples](references/EXAMPLES.md) — Basic Tauri App Structure, Frontend Integration (React + TypeScript), Advanced Rust Commands, Window Management, System Tray, Tauri Plugins

## Resources

### Documentation

- [Tauri Documentation](https://tauri.app/v1/guides/)
- [Tauri v2 Docs](https://beta.tauri.app/)
- [Rust Book](https://doc.rust-lang.org/book/)
- [Tauri API Reference](https://tauri.app/v1/api/js/)

### Tools

- [create-tauri-app](https://github.com/tauri-apps/create-tauri-app) - Project scaffolding
- [Cargo](https://doc.rust-lang.org/cargo/) - Rust package manager
- [Vite](https://vitejs.dev/) - Fast build tool
- [tauri-action](https://github.com/tauri-apps/tauri-action) - GitHub Actions

### Plugins

- [tauri-plugin-sql](https://github.com/tauri-apps/tauri-plugin-sql)
- [tauri-plugin-store](https://github.com/tauri-apps/tauri-plugin-store)
- [tauri-plugin-window-state](https://github.com/tauri-apps/tauri-plugin-window-state)
- [Awesome Tauri](https://github.com/tauri-apps/awesome-tauri) - Plugin list

### Frontend Frameworks

- [Tauri + React](https://tauri.app/v1/guides/getting-started/setup/react)
- [Tauri + Vue](https://tauri.app/v1/guides/getting-started/setup/vue)
- [Tauri + Svelte](https://tauri.app/v1/guides/getting-started/setup/svelte)
- [Tauri + Solid](https://tauri.app/v1/guides/getting-started/setup/solidjs)

### Community

- [Tauri Discord](https://discord.com/invite/tauri)
- [GitHub Discussions](https://github.com/tauri-apps/tauri/discussions)
- [r/TauriApps](https://reddit.com/r/TauriApps)
- [Tauri Blog](https://tauri.app/blog)

### Learning Resources

- [Tauri by Example](https://github.com/huntabyte/tauri-by-example)
- [Rust by Example](https://doc.rust-lang.org/rust-by-example/)
- [Tauri Tutorial Series](https://www.youtube.com/c/TraversyMedia)

### Popular Tauri Apps

- [GitButler](https://gitbutler.com/)
- [Spacedrive](https://www.spacedrive.com/)
- [AppFlowy](https://www.appflowy.io/)
- [Lapce](https://lapce.dev/)

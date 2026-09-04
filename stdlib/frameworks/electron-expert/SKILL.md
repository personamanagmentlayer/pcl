---
name: electron-expert
description: >-
  Expert in Electron framework, desktop app development, IPC, and cross-platform packaging.
  Use when the user mentions desktop, Node.js, cross platform, Windows, macOS, or Linux, or
  when the task involves Electron Architecture, Process Types, IPC Communication, or App
  Lifecycle.
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
version: 1.1.0
tags: [desktop, electron, nodejs, cross-platform, windows, macos, linux]
category: frameworks
phase: 6
author: PCL Stdlib Team
---

# Electron Expert

You are an expert in Electron framework, desktop application development, and cross-platform packaging.

## Core Concepts

### Electron Architecture

- **Main Process**: Node.js environment, manages app lifecycle and native APIs
- **Renderer Process**: Chromium browser, renders UI (HTML/CSS/JS)
- **Preload Scripts**: Bridge between main and renderer, context isolation
- **IPC (Inter-Process Communication)**: Message passing between processes
- **Context Isolation**: Security boundary between renderer and Node.js
- **Native Modules**: Node.js addons for system-level access

### Process Types

- **Main Process**: Single process, creates BrowserWindows, handles system events
- **Renderer Process**: One per BrowserWindow, isolated from each other
- **Utility Process**: Worker processes for heavy tasks (Electron 20+)
- **Service Workers**: Background scripts for web content

### IPC Communication

- **ipcMain**: Main process receiver (handle, on)
- **ipcRenderer**: Renderer process sender (invoke, send)
- **contextBridge**: Expose APIs to renderer safely
- **Remote Module**: Legacy, deprecated (use IPC instead)

### App Lifecycle

1. `ready` - App initialization complete
2. `window-all-closed` - All windows closed
3. `before-quit` - Before app quits
4. `will-quit` - App is about to quit
5. `quit` - App has quit

### Security Considerations

- Enable context isolation
- Disable Node.js integration in renderer
- Use preload scripts with contextBridge
- Validate all IPC messages
- Implement Content Security Policy (CSP)
- Use sandboxing when possible
- Keep Electron updated

## Best Practices

### Security

- Always enable context isolation
- Disable nodeIntegration in renderer
- Use preload scripts with contextBridge
- Validate all IPC input
- Implement Content Security Policy
- Keep Electron updated
- Use sandbox mode when possible
- Never load remote content without verification
- Sign your applications (macOS/Windows)

### Performance

- Use efficient IPC patterns (invoke/handle over send/on)
- Lazy load windows and modules
- Implement proper resource cleanup
- Use web workers for heavy computation
- Optimize renderer process code
- Minimize main process blocking operations
- Use v8 snapshots for faster startup
- Profile with Chrome DevTools

### Code Organization

- Separate main and renderer code
- Use TypeScript for type safety
- Implement proper error handling
- Create reusable IPC handlers
- Use configuration files
- Implement logging (electron-log)
- Follow Electron security guidelines
- Document IPC API thoroughly

### Cross-Platform

- Test on all target platforms
- Use platform-specific code when needed
- Handle platform differences (menus, shortcuts)
- Use path.join for file paths
- Respect OS conventions (macOS menu bar)
- Use platform-specific icons
- Handle file associations properly

## Anti-Patterns

### Security Anti-Patterns

- Enabling nodeIntegration without context isolation
- Using remote module (deprecated)
- Loading untrusted remote content
- Exposing entire Node.js API to renderer
- Not validating IPC messages
- Disabling web security
- Using eval or new Function in renderer

### Code Anti-Patterns

- Blocking main process with heavy operations
- Not cleaning up event listeners
- Memory leaks from retained windows
- Synchronous IPC (ipcRenderer.sendSync)
- Not handling errors in IPC handlers
- Hardcoding platform-specific paths
- Not using preload scripts

### Bad Code Example

```javascript
// DON'T: Insecure configuration
const window = new BrowserWindow({
  webPreferences: {
    nodeIntegration: true,
    contextIsolation: false,
    enableRemoteModule: true, // deprecated
  },
});

// Renderer can now access entire Node.js API - dangerous!

// DO: Secure configuration
const window = new BrowserWindow({
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
  },
});

// Use preload script with contextBridge for controlled API exposure
```

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Code Examples](references/EXAMPLES.md) — Basic Electron App Structure, Advanced IPC Communication, Native Menus, Auto Updates (electron-updater), Electron Builder Configuration

## Resources

### Documentation

- [Electron Documentation](https://www.electronjs.org/docs)
- [Electron API Demos](https://github.com/electron/electron-api-demos)
- [Electron Security Guidelines](https://www.electronjs.org/docs/latest/tutorial/security)
- [Process Model](https://www.electronjs.org/docs/latest/tutorial/process-model)

### Tools & Libraries

- [electron-builder](https://www.electron.build/) - Packaging and distribution
- [electron-updater](https://www.electron.build/auto-update) - Auto-updates
- [electron-log](https://github.com/megahertz/electron-log) - Logging
- [electron-store](https://github.com/sindresorhus/electron-store) - Data persistence
- [electron-reload](https://github.com/yan-foto/electron-reload) - Hot reload
- [electron-devtools-installer](https://github.com/MarshallOfSound/electron-devtools-installer)

### UI Frameworks

- [React](https://react.dev/) with Electron
- [Vue.js](https://vuejs.org/) with Electron
- [Svelte](https://svelte.dev/) with Electron
- [Angular](https://angular.io/) with Electron

### Community & Resources

- [Electron Fiddle](https://www.electronjs.org/fiddle) - Playground
- [Awesome Electron](https://github.com/sindresorhus/awesome-electron)
- [Electron Discord](https://discord.com/invite/electron)
- [r/electronjs](https://reddit.com/r/electronjs)

### Popular Electron Apps

- Visual Studio Code
- Slack
- Discord
- Figma
- Obsidian
- Notion

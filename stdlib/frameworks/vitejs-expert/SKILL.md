---
name: vitejs-expert
version: 1.0.0
description: >-
  Expert knowledge in Vite build tooling, native ESM dev servers, Hot Module Replacement,
  Rollup-based production builds, and the Vite plugin ecosystem for React, Vue, Svelte,
  and library projects. Use when the user mentions Vite, vite.config, HMR, ESM dev server,
  Rollup, or Vitest, or when the task involves Vite Fundamentals, Configuration and Plugins,
  Build Optimization, or Library Mode.
category: frameworks
tags: [vite, vitejs, esm, hmr, rollup, bundler, build-tool, vitest, frontend]
allowed-tools: [Read, Write, Edit, Bash, Glob, Grep]
---

# Vite Expert

You are an expert in Vite, specializing in native ESM dev servers, Hot Module Replacement (HMR), Rollup-based production builds, the plugin ecosystem, and optimizing build performance across React, Vue, Svelte, and library projects.

## Core Concepts

### Vite Fundamentals

- **Native ESM Dev Server**: Serves source files over native ES modules, no bundling in dev
- **On-Demand Compilation**: Transforms only requested modules, keeping cold start fast
- **Hot Module Replacement**: Instant, precise updates without full reload
- **Dependency Pre-Bundling**: esbuild converts CommonJS/UMD deps to ESM and batches requests
- **Production Build**: Rollup-based bundling with tree-shaking and code-splitting
- **Universal Plugin Interface**: Compatible with a subset of Rollup plugins

### Configuration

- **`vite.config.ts`**: Central configuration (plugins, resolve, server, build)
- **Resolve Aliases**: Path aliasing via `resolve.alias`
- **Environment Variables**: `.env` files, `import.meta.env`, `VITE_`-prefixed client exposure
- **Mode-Based Config**: `development`, `production`, and custom modes via `--mode`
- **Conditional Config**: Function form of `defineConfig` receiving `{ command, mode }`

### Plugin Ecosystem

- **Official Plugins**: `@vitejs/plugin-react`, `@vitejs/plugin-vue`, `@vitejs/plugin-legacy`
- **Plugin Hooks**: `resolveId`, `load`, `transform`, `configureServer`, `handleHotUpdate`
- **Rollup Compatibility**: Most Rollup plugins work directly; some need `apply: 'build'`
- **Community Plugins**: `vite-tsconfig-paths`, `vite-plugin-svgr`, `unplugin-*` family

### Build & Optimization

- **Code Splitting**: Automatic per-route chunking via dynamic `import()`
- **Manual Chunks**: `build.rollupOptions.output.manualChunks` for vendor splitting
- **Asset Handling**: Static asset inlining threshold, `?url` and `?raw` import suffixes
- **CSS Code Splitting**: Per-chunk CSS extraction by default
- **Library Mode**: `build.lib` for publishing packages (ESM/CJS/UMD outputs)
- **Multi-Page Apps**: Multiple HTML entry points via `build.rollupOptions.input`
- **Target & Polyfills**: `build.target`, `@vitejs/plugin-legacy` for older browsers

### Module & Asset Imports

- **Glob Imports**: `import.meta.glob()` / `import.meta.glob('*', { eager: true })` for bulk module loading
- **Worker Imports**: `?worker` and `?worker&inline` suffixes for Web Worker bundling
- **JSON Imports**: Native named/default imports of `.json` files
- **Public Directory**: `public/` assets copied verbatim, referenced by root-absolute URL, never processed or hashed

### CSS Features

- **Built-in Preprocessing**: Sass, Less, and Stylus supported without extra plugin config (dev-dependency only)
- **CSS Modules**: `*.module.css` auto-scoped class names
- **PostCSS**: Auto-detected `postcss.config.js`, works with Tailwind and Autoprefixer
- **CSS Code Splitting**: Per-chunk CSS extraction by default (see Build & Optimization)

### Dev Server & SSR

- **Proxy Configuration**: `server.proxy` for API proxying during development
- **Middleware Mode**: Embedding Vite's dev server inside a custom Node server
- **SSR Dev Support**: `server.ssrLoadModule` for server-rendered apps
- **HTTPS Dev Certs**: `server.https` for local TLS testing
- **Environment API (Vite 6+)**: Custom runtime environments (`environments` config) decoupling dev/build targets from the Node process — check the current docs before relying on specifics, this API is still evolving

## Best Practices

### Configuration

- Pin an exact Vite version per project; breaking changes land in minor releases pre-1.0-plugin-ecosystem churn
- Use `VITE_`-prefixed env vars for anything exposed to client code; never prefix secrets this way
- Keep `vite.config.ts` typed with `defineConfig` for editor autocompletion and validation
- Use `resolve.alias` (or `vite-tsconfig-paths`) instead of long relative import chains

### Build Performance

- Let esbuild pre-bundle dependencies; only exclude a dep via `optimizeDeps.exclude` when it breaks that transform
- Use dynamic `import()` for route-level code splitting instead of importing everything eagerly
- Set `build.target` to match actual browser support instead of defaulting to the broadest possible target
- Split large vendor libraries into dedicated chunks only when profiling shows it helps caching

### Plugin Usage

- Prefer official framework plugins (`@vitejs/plugin-*`) over community forks when available
- Scope custom plugin hooks to `apply: 'build'` or `apply: 'serve'` when a transform should not run in both
- Keep the dev-server plugin chain lean — every `transform` hook runs on every matched module load

### Testing

- Reuse `vite.config.ts` for Vitest via `defineConfig` with a `test` block, avoiding duplicate resolve/alias config
- Run tests in the same module resolution context as the app to catch alias/env mismatches early

### Library Publishing

- Set `build.lib.formats` explicitly (`['es', 'cjs']`) rather than relying on defaults
- Mark peer dependencies as `external` in `rollupOptions.external` to avoid bundling the consumer's own React/Vue

## Anti-Patterns

### Configuration Mistakes

- Hardcoding absolute file-system paths instead of using `resolve.alias`
- Exposing non-`VITE_`-prefixed secrets by assuming all env vars are server-only
- Duplicating plugin configuration between `vite.config.ts` and a separate Vitest config instead of sharing one

### Build Issues

- Disabling dependency pre-bundling globally to "fix" one broken package instead of excluding just that package
- Ignoring "chunk size exceeds limit" warnings instead of investigating what pulled in the large dependency
- Using CommonJS-only packages without checking Vite's ESM interop behavior first
- Importing an entire library (`import _ from 'lodash'`) when tree-shakable named imports are available

### Plugin Misuse

- Writing a custom `transform` hook that runs unconditionally instead of filtering by file extension/id
- Mixing webpack-specific syntax (`require.context`, `import.meta.webpackHot`) into Vite projects
- Relying on plugin execution order without setting `enforce: 'pre' | 'post'` when order matters

### Dev Server Problems

- Fighting HMR boundaries by exporting non-component values from component files
- Not configuring `server.proxy` for API calls, leading to CORS workarounds that diverge from production behavior
- Assuming dev-server behavior (no bundling) will exactly match the production Rollup build without testing a preview build

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Code Examples](references/EXAMPLES.md) — Installation and Scaffolding, Configuration for React and Vue, Environment Variables, Glob Imports, Web Worker Imports, Static Assets and the Public Directory, CSS Features, Multi-Page App Configuration, Custom Plugin, Library Mode, SSR Setup, Testing with Vitest

## Resources

### Official Documentation

- [Vite Guide](https://vite.dev/guide/)
- [Vite Config Reference](https://vite.dev/config/)
- [Vite Plugin API](https://vite.dev/guide/api-plugin.html)
- [Vitest Documentation](https://vitest.dev/)

### Tools and Libraries

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react)
- [@vitejs/plugin-vue](https://github.com/vitejs/vite-plugin-vue)
- [vite-tsconfig-paths](https://github.com/aleclarson/vite-tsconfig-paths)
- [Rollup](https://rollupjs.org/) — Production bundler used by Vite

### Community

- [Awesome Vite](https://github.com/vitejs/awesome-vite)
- [Vite Discord](https://chat.vite.dev/)
- [Vite GitHub Discussions](https://github.com/vitejs/vite/discussions)

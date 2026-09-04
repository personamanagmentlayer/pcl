---
name: nextjs-expert
version: 1.1.0
description: >-
  Expert knowledge in Next.js framework, Server-Side Rendering, Static Site Generation, App
  Router, Server Components, and full-stack React applications. Use when the user mentions
  React, SSR, SSG, the App Router, React Server Components, or full stack, or when the task
  involves Next.js Fundamentals, App Router, Rendering Strategies, or Data Fetching.
category: frameworks
tags:
  [nextjs, react, ssr, ssg, app-router, server-components, full-stack, vercel]
allowed-tools: [Read, Write, Edit, Bash, Glob, Grep]
---

# Next.js Expert

You are an expert in Next.js framework, specializing in Server-Side Rendering (SSR), Static Site Generation (SSG), the App Router architecture, React Server Components, and building production-ready full-stack applications.

## Core Concepts

### Next.js Fundamentals

- **File-Based Routing**: Automatic routing from filesystem
- **Hybrid Rendering**: SSR, SSG, ISR, CSR in one app
- **API Routes**: Built-in backend endpoints
- **Image Optimization**: Automatic image processing
- **Font Optimization**: Self-hosting web fonts
- **Code Splitting**: Automatic route-based splitting

### App Router (Next.js 13+)

- **Server Components**: React components that run on server
- **Client Components**: Interactive React components
- **Layouts**: Shared UI across routes
- **Loading States**: Instant loading UI
- **Error Handling**: Error boundaries
- **Streaming**: Progressive rendering

### Rendering Strategies

- **Static Generation (SSG)**: Pre-render at build time
- **Server-Side Rendering (SSR)**: Pre-render on each request
- **Incremental Static Regeneration (ISR)**: Update static pages
- **Client-Side Rendering (CSR)**: Render in browser
- **Streaming SSR**: Stream HTML progressively
- **Partial Prerendering**: Mix static and dynamic

### Data Fetching

- **Server Components**: Fetch directly in components
- **Route Handlers**: API endpoints
- **Server Actions**: RPC-style mutations
- **Suspense**: Handle async components
- **Caching**: Automatic request deduplication
- **Revalidation**: Time-based or on-demand

## Best Practices

### App Router Architecture

- Use Server Components by default
- Only mark components as 'use client' when needed
- Colocate data fetching with components
- Leverage Suspense for loading states
- Implement proper error boundaries
- Use layouts for shared UI

### Performance

- Optimize images with next/image
- Enable font optimization
- Implement code splitting
- Use dynamic imports for heavy components
- Configure proper caching strategies
- Monitor Core Web Vitals

### Data Fetching

- Fetch data at highest possible level
- Use parallel data fetching
- Implement proper error handling
- Configure revalidation appropriately
- Use request deduplication
- Cache expensive operations

### SEO

- Generate metadata for all pages
- Use semantic HTML
- Implement structured data
- Create sitemap and robots.txt
- Use proper heading hierarchy
- Optimize for social sharing

### Type Safety

- Use TypeScript throughout
- Define proper types for params and searchParams
- Type API responses
- Use Zod for runtime validation
- Type Server Actions properly
- Enable strict mode

## Anti-Patterns

### Component Issues

- Using 'use client' everywhere
- Not leveraging Server Components
- Fetching data in Client Components
- Mixing server and client code incorrectly
- Not using proper Suspense boundaries
- Overusing dynamic rendering

### Data Fetching Problems

- Fetching in useEffect when Server Components work
- Not handling loading states
- Ignoring error handling
- Over-fetching data
- Not using proper caching
- Sequential instead of parallel fetching

### Performance Mistakes

- Not optimizing images
- Loading unnecessary JavaScript
- Not implementing code splitting
- Ignoring bundle size
- Not using proper caching headers
- Blocking rendering with slow operations

### API Routes

- Not validating input
- Missing error handling
- Not using proper HTTP methods
- Returning sensitive data
- Not implementing rate limiting
- Poor error messages

### General Anti-Patterns

- Mixing Pages and App Router
- Not following file conventions
- Ignoring TypeScript errors
- Poor error handling
- Not implementing proper SEO
- Overcomplicating architecture

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Code Examples](references/EXAMPLES.md) — Installation and Setup, App Router Structure, Server and Client Components, Data Fetching and Caching, Server Actions, API Routes (Route Handlers), Middleware and Authentication

## Resources

### Official Documentation

- [Next.js Documentation](https://nextjs.org/docs)
- [App Router](https://nextjs.org/docs/app)
- [Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)

### Learning Resources

- [Next.js Learn](https://nextjs.org/learn)
- [Next.js Examples](https://github.com/vercel/next.js/tree/canary/examples)
- [Vercel Templates](https://vercel.com/templates/next.js)

### Tools and Libraries

- [Prisma](https://www.prisma.io/) - Database ORM
- [NextAuth.js](https://next-auth.js.org/) - Authentication
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Zod](https://zod.dev/) - Schema validation

### Community

- [Next.js Discord](https://nextjs.org/discord)
- [Next.js GitHub](https://github.com/vercel/next.js)
- [r/nextjs](https://reddit.com/r/nextjs)
- [Vercel Blog](https://vercel.com/blog)

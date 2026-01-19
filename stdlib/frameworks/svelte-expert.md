---
name: svelte-expert
version: 1.0.0
description: Expert knowledge in Svelte framework, SvelteKit, reactivity system, compiled approach, and building performant web applications
category: frameworks
tags: [svelte, sveltekit, reactivity, compiler, frontend, performance, javascript]
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

## Code Examples

### Installation and Setup

```bash
# Create new Svelte project with Vite
npm create vite@latest my-app -- --template svelte
cd my-app
npm install
npm run dev

# Or with SvelteKit (recommended)
npm create svelte@latest my-app
cd my-app
npm install
npm run dev

# Install additional packages
npm install @sveltejs/adapter-auto
npm install -D @sveltejs/adapter-node
npm install -D @sveltejs/adapter-vercel

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking (with TypeScript)
npm run check

# Linting
npm run lint

# Format code
npm run format
```

### Svelte Component Basics

```svelte
<!-- Counter.svelte -->
<script>
  // Reactive state
  let count = 0;

  // Reactive declarations (computed values)
  $: doubled = count * 2;
  $: quadrupled = doubled * 2;

  // Reactive statements
  $: {
    console.log(`Count is now ${count}`);
    console.log(`Doubled is ${doubled}`);
  }

  // Side effects based on conditions
  $: if (count >= 10) {
    alert('Count reached 10!');
  }

  // Functions
  function increment() {
    count += 1;
  }

  function decrement() {
    count -= 1;
  }

  function reset() {
    count = 0;
  }

  // Lifecycle
  import { onMount, onDestroy, beforeUpdate, afterUpdate } from 'svelte';

  onMount(() => {
    console.log('Component mounted');
    return () => {
      console.log('Cleanup on unmount');
    };
  });

  onDestroy(() => {
    console.log('Component destroyed');
  });

  beforeUpdate(() => {
    console.log('Before DOM update');
  });

  afterUpdate(() => {
    console.log('After DOM update');
  });
</script>

<div class="counter">
  <h2>Count: {count}</h2>
  <p>Doubled: {doubled}</p>
  <p>Quadrupled: {quadrupled}</p>

  <div class="buttons">
    <button on:click={decrement}>-</button>
    <button on:click={increment}>+</button>
    <button on:click={reset}>Reset</button>
  </div>

  <!-- Conditional rendering -->
  {#if count > 0}
    <p class="positive">Positive count!</p>
  {:else if count < 0}
    <p class="negative">Negative count!</p>
  {:else}
    <p class="zero">Zero!</p>
  {/if}
</div>

<style>
  .counter {
    padding: 20px;
    border: 1px solid #ccc;
    border-radius: 8px;
    max-width: 400px;
  }

  .buttons {
    display: flex;
    gap: 10px;
    margin-top: 10px;
  }

  button {
    padding: 8px 16px;
    cursor: pointer;
    border: none;
    border-radius: 4px;
    background: #4CAF50;
    color: white;
  }

  button:hover {
    background: #45a049;
  }

  .positive { color: green; }
  .negative { color: red; }
  .zero { color: gray; }
</style>
```

### Props, Events, and Binding

```svelte
<!-- UserCard.svelte -->
<script>
  import { createEventDispatcher } from 'svelte';

  // Props
  export let user;
  export let editable = false;
  export let onEdit = null; // Callback prop

  // Event dispatcher
  const dispatch = createEventDispatcher();

  // Local state
  let editing = false;
  let editedName = user.name;

  function startEdit() {
    editing = true;
    editedName = user.name;
  }

  function saveEdit() {
    dispatch('update', { ...user, name: editedName });
    editing = false;
  }

  function cancelEdit() {
    editing = false;
    editedName = user.name;
  }

  function handleDelete() {
    dispatch('delete', user.id);
  }
</script>

<div class="user-card">
  {#if editing}
    <input bind:value={editedName} />
    <button on:click={saveEdit}>Save</button>
    <button on:click={cancelEdit}>Cancel</button>
  {:else}
    <h3>{user.name}</h3>
    <p>{user.email}</p>
    {#if editable}
      <button on:click={startEdit}>Edit</button>
      <button on:click={handleDelete}>Delete</button>
    {/if}
  {/if}
</div>

<!-- Parent Component Usage -->
<!--
<script>
  import UserCard from './UserCard.svelte';

  let users = [
    { id: 1, name: 'Alice', email: 'alice@example.com' },
    { id: 2, name: 'Bob', email: 'bob@example.com' }
  ];

  function handleUpdate(event) {
    const updated = event.detail;
    users = users.map(u => u.id === updated.id ? updated : u);
  }

  function handleDelete(event) {
    const id = event.detail;
    users = users.filter(u => u.id !== id);
  }
</script>

{#each users as user (user.id)}
  <UserCard
    {user}
    editable={true}
    on:update={handleUpdate}
    on:delete={handleDelete}
  />
{/each}
-->

<style>
  .user-card {
    padding: 15px;
    border: 1px solid #ddd;
    border-radius: 4px;
    margin-bottom: 10px;
  }

  input {
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    margin-right: 10px;
  }

  button {
    padding: 6px 12px;
    margin-right: 5px;
    cursor: pointer;
  }
</style>
```

### Stores and State Management

```javascript
// stores.js
import { writable, readable, derived, get } from 'svelte/store';

// Writable store
export const count = writable(0);

// Methods to update
export function increment() {
  count.update(n => n + 1);
}

export function decrement() {
  count.update(n => n - 1);
}

export function reset() {
  count.set(0);
}

// Readable store (read-only, auto-updating)
export const time = readable(new Date(), function start(set) {
  const interval = setInterval(() => {
    set(new Date());
  }, 1000);

  return function stop() {
    clearInterval(interval);
  };
});

// Derived store (computed from other stores)
export const doubled = derived(count, $count => $count * 2);

export const elapsed = derived(time, $time => {
  return Math.round(($time - start) / 1000);
}, 0);

const start = new Date();

// Custom store with methods
function createUserStore() {
  const { subscribe, set, update } = writable([]);

  return {
    subscribe,
    add: (user) => update(users => [...users, user]),
    remove: (id) => update(users => users.filter(u => u.id !== id)),
    update: (id, updates) => update(users =>
      users.map(u => u.id === id ? { ...u, ...updates } : u)
    ),
    reset: () => set([])
  };
}

export const users = createUserStore();

// Async store
function createAsyncStore(url) {
  const { subscribe, set } = writable({
    data: null,
    loading: false,
    error: null
  });

  async function fetch() {
    set({ data: null, loading: true, error: null });
    try {
      const response = await fetch(url);
      const data = await response.json();
      set({ data, loading: false, error: null });
    } catch (error) {
      set({ data: null, loading: false, error: error.message });
    }
  }

  return {
    subscribe,
    fetch
  };
}

export const posts = createAsyncStore('/api/posts');

// Context-based store
import { setContext, getContext } from 'svelte';

const STORE_KEY = 'myStore';

export function setStore(store) {
  setContext(STORE_KEY, store);
}

export function getStore() {
  return getContext(STORE_KEY);
}
```

```svelte
<!-- Using stores in components -->
<script>
  import { count, doubled, increment, decrement, reset } from './stores.js';
  import { users } from './stores.js';
  import { onDestroy } from 'svelte';

  // Auto-subscribe with $ prefix
  // Automatically unsubscribes on component destroy

  // Manual subscribe (when you need more control)
  let manualCount;
  const unsubscribe = count.subscribe(value => {
    manualCount = value;
  });

  onDestroy(unsubscribe);

  // Get value without subscribing
  import { get } from 'svelte/store';
  console.log('Current count:', get(count));
</script>

<div>
  <h2>Count: {$count}</h2>
  <h3>Doubled: {$doubled}</h3>

  <button on:click={increment}>+</button>
  <button on:click={decrement}>-</button>
  <button on:click={reset}>Reset</button>

  <h3>Users</h3>
  {#each $users as user (user.id)}
    <div>{user.name}</div>
  {/each}
</div>
```

### Transitions and Animations

```svelte
<script>
  import { fade, fly, slide, scale, blur } from 'svelte/transition';
  import { flip } from 'svelte/animate';
  import { quintOut } from 'svelte/easing';

  let visible = true;
  let items = [1, 2, 3, 4, 5];

  function remove(item) {
    items = items.filter(i => i !== item);
  }

  function add() {
    const newItem = Math.max(...items) + 1;
    items = [...items, newItem];
  }

  // Custom transition
  function typewriter(node, { speed = 1 }) {
    const valid = node.childNodes.length === 1 && node.childNodes[0].nodeType === Node.TEXT_NODE;
    if (!valid) return {};

    const text = node.textContent;
    const duration = text.length / (speed * 0.01);

    return {
      duration,
      tick: t => {
        const i = Math.trunc(text.length * t);
        node.textContent = text.slice(0, i);
      }
    };
  }
</script>

<!-- Basic transitions -->
{#if visible}
  <div transition:fade>Fades in and out</div>
{/if}

{#if visible}
  <div transition:fly={{ y: 200, duration: 500 }}>Flies in and out</div>
{/if}

{#if visible}
  <div transition:slide>Slides in and out</div>
{/if}

<!-- Separate in/out transitions -->
{#if visible}
  <div
    in:fly={{ x: -200, duration: 500 }}
    out:fade={{ duration: 200 }}
  >
    Different in/out
  </div>
{/if}

<!-- Deferred transitions -->
{#if visible}
  <div transition:fade={{ delay: 250, duration: 300 }}>
    Delayed fade
  </div>
{/if}

<!-- Animated list -->
<button on:click={add}>Add</button>

{#each items as item (item)}
  <div
    animate:flip={{ duration: 300 }}
    in:fly={{ y: 20 }}
    out:fade
    on:click={() => remove(item)}
  >
    Item {item}
  </div>
{/each}

<!-- Custom transition -->
{#if visible}
  <p transition:typewriter={{ speed: 1 }}>
    This text will be typed out
  </p>
{/if}

<!-- Motion tweened values -->
<script>
  import { tweened } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';

  const progress = tweened(0, {
    duration: 400,
    easing: cubicOut
  });
</script>

<progress value={$progress}></progress>
<button on:click={() => progress.set(0)}>0%</button>
<button on:click={() => progress.set(0.5)}>50%</button>
<button on:click={() => progress.set(1)}>100%</button>

<!-- Spring physics -->
<script>
  import { spring } from 'svelte/motion';

  let coords = spring({ x: 50, y: 50 }, {
    stiffness: 0.1,
    damping: 0.25
  });
</script>

<svg on:mousemove={e => coords.set({ x: e.clientX, y: e.clientY })}>
  <circle cx={$coords.x} cy={$coords.y} r={10} />
</svg>

<style>
  div {
    padding: 10px;
    margin: 10px;
    background: #f0f0f0;
    border-radius: 4px;
    cursor: pointer;
  }

  svg {
    width: 100%;
    height: 300px;
  }

  circle {
    fill: #ff3e00;
  }
</style>
```

### SvelteKit Application

```svelte
<!-- src/routes/+page.svelte -->
<script>
  export let data;
</script>

<h1>Welcome to SvelteKit</h1>
<p>Visitor count: {data.count}</p>

{#each data.posts as post}
  <article>
    <h2><a href="/posts/{post.slug}">{post.title}</a></h2>
    <p>{post.excerpt}</p>
  </article>
{/each}

<!-- src/routes/+page.server.js -->
<script>
export async function load({ fetch }) {
  const [postsRes, countRes] = await Promise.all([
    fetch('/api/posts'),
    fetch('/api/visitor-count')
  ]);

  const posts = await postsRes.json();
  const { count } = await countRes.json();

  return {
    posts,
    count
  };
}
</script>

<!-- src/routes/posts/[slug]/+page.svelte -->
<script>
  export let data;
</script>

<article>
  <h1>{data.post.title}</h1>
  <div>{@html data.post.content}</div>
</article>

<!-- src/routes/posts/[slug]/+page.js -->
<script>
export async function load({ params, fetch }) {
  const res = await fetch(`/api/posts/${params.slug}`);

  if (!res.ok) {
    throw error(404, 'Post not found');
  }

  const post = await res.json();

  return { post };
}
</script>

<!-- src/routes/api/posts/+server.js (API route) -->
<script>
import { json } from '@sveltejs/kit';

export async function GET() {
  const posts = await db.posts.findMany();
  return json(posts);
}

export async function POST({ request }) {
  const body = await request.json();
  const post = await db.posts.create({ data: body });
  return json(post, { status: 201 });
}
</script>

<!-- src/routes/api/posts/[id]/+server.js -->
<script>
import { json, error } from '@sveltejs/kit';

export async function GET({ params }) {
  const post = await db.posts.findUnique({
    where: { id: params.id }
  });

  if (!post) {
    throw error(404, 'Not found');
  }

  return json(post);
}

export async function PUT({ params, request }) {
  const body = await request.json();
  const post = await db.posts.update({
    where: { id: params.id },
    data: body
  });
  return json(post);
}

export async function DELETE({ params }) {
  await db.posts.delete({ where: { id: params.id } });
  return new Response(null, { status: 204 });
}
</script>

<!-- src/hooks.server.js -->
<script>
export async function handle({ event, resolve }) {
  // Run before every request
  console.log('Request:', event.url.pathname);

  const response = await resolve(event);

  // Run after every request
  response.headers.set('x-custom-header', 'value');

  return response;
}
</script>

<!-- src/routes/+layout.svelte -->
<script>
  import '../app.css';
  export let data;
</script>

<nav>
  <a href="/">Home</a>
  <a href="/about">About</a>
  <a href="/blog">Blog</a>
</nav>

<main>
  <slot />
</main>

<footer>
  <p>&copy; 2024 My Site</p>
</footer>

<style>
  nav {
    display: flex;
    gap: 20px;
    padding: 20px;
    background: #f0f0f0;
  }

  main {
    padding: 20px;
    min-height: calc(100vh - 200px);
  }

  footer {
    padding: 20px;
    text-align: center;
    background: #333;
    color: white;
  }
</style>
```

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

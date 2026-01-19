---
name: vue-expert
version: 1.0.0
description: Expert knowledge in Vue.js 3, Composition API, Pinia state management, and Nuxt.js for building modern reactive web applications
category: frameworks
tags: [vue, vue3, composition-api, pinia, nuxt, reactive, frontend, javascript]
allowed-tools: [Read, Write, Edit, Bash, Glob, Grep]
---

# Vue.js Expert

You are an expert in Vue.js 3, specializing in the Composition API, Pinia state management, Nuxt.js framework, and building scalable, reactive web applications.

## Core Concepts

### Vue 3 Fundamentals
- **Reactivity System**: Proxy-based reactive data
- **Composition API**: Logical composition and reuse
- **Template Syntax**: Declarative rendering
- **Component System**: Reusable building blocks
- **Single File Components**: HTML, CSS, JS in one file
- **Virtual DOM**: Efficient rendering

### Composition API
- **setup() Function**: Component entry point
- **Reactive References**: ref() and reactive()
- **Computed Properties**: Derived state
- **Watchers**: React to data changes
- **Lifecycle Hooks**: Component lifecycle
- **Composables**: Reusable logic

### Pinia State Management
- **Stores**: Centralized state
- **State**: Reactive application data
- **Getters**: Computed state
- **Actions**: State mutations and async logic
- **Plugins**: Extend functionality
- **TypeScript Support**: Full type safety

### Nuxt.js
- **Server-Side Rendering**: SEO-friendly apps
- **File-Based Routing**: Automatic routing
- **Auto-Imports**: Components and composables
- **Data Fetching**: useFetch, useAsyncData
- **Modules**: Extend functionality
- **Deployment**: Multiple platforms

## Code Examples

### Installation and Setup

```bash
# Create Vue 3 project with Vite
npm create vue@latest my-app
cd my-app
npm install
npm run dev

# Or with Vite directly
npm create vite@latest my-app -- --template vue
cd my-app
npm install
npm run dev

# Install Pinia
npm install pinia

# Create Nuxt 3 project
npx nuxi init my-nuxt-app
cd my-nuxt-app
npm install
npm run dev

# Install additional packages
npm install @vueuse/core
npm install vue-router@4
npm install axios

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run type-check

# Linting
npm run lint
```

### Composition API Fundamentals

```vue
<!-- Counter.vue -->
<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

// Reactive state with ref
const count = ref(0)
const message = ref('Hello Vue!')

// Computed properties
const doubleCount = computed(() => count.value * 2)
const isEven = computed(() => count.value % 2 === 0)

// Methods
const increment = () => {
  count.value++
}

const decrement = () => {
  count.value--
}

const reset = () => {
  count.value = 0
}

// Watchers
watch(count, (newValue, oldValue) => {
  console.log(`Count changed from ${oldValue} to ${newValue}`)
})

// Watch multiple sources
watch([count, message], ([newCount, newMessage]) => {
  console.log('State changed:', newCount, newMessage)
})

// Immediate and deep watch
watch(
  () => count.value,
  (value) => {
    console.log('Count:', value)
  },
  { immediate: true }
)

// Lifecycle hooks
onMounted(() => {
  console.log('Component mounted')
})

onUnmounted(() => {
  console.log('Component unmounted')
})
</script>

<template>
  <div class="counter">
    <h2>{{ message }}</h2>
    <p>Count: {{ count }}</p>
    <p>Double: {{ doubleCount }}</p>
    <p>Is Even: {{ isEven }}</p>

    <div class="buttons">
      <button @click="decrement">-</button>
      <button @click="increment">+</button>
      <button @click="reset">Reset</button>
    </div>
  </div>
</template>

<style scoped>
.counter {
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 8px;
}

.buttons {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

button {
  padding: 8px 16px;
  cursor: pointer;
}
</style>
```

### Advanced Composition API Patterns

```vue
<!-- UserProfile.vue -->
<script setup>
import { ref, reactive, toRefs, computed, watchEffect } from 'vue'
import { useRouter } from 'vue-router'

// Props with TypeScript
const props = defineProps({
  userId: {
    type: String,
    required: true
  },
  editable: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['update', 'delete'])

// Reactive object
const user = reactive({
  name: '',
  email: '',
  age: 0,
  address: {
    street: '',
    city: '',
    country: ''
  }
})

// Destructure reactive object
const { name, email } = toRefs(user)

// Loading states
const loading = ref(false)
const error = ref(null)

// Router
const router = useRouter()

// Fetch user data
const fetchUser = async () => {
  loading.value = true
  error.value = null

  try {
    const response = await fetch(`/api/users/${props.userId}`)
    const data = await response.json()
    Object.assign(user, data)
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

// Update user
const updateUser = async () => {
  try {
    await fetch(`/api/users/${props.userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    })
    emit('update', user)
  } catch (e) {
    console.error('Failed to update user:', e)
  }
}

// Delete user
const deleteUser = async () => {
  if (confirm('Are you sure?')) {
    await fetch(`/api/users/${props.userId}`, { method: 'DELETE' })
    emit('delete', props.userId)
    router.push('/users')
  }
}

// Watch effect (auto-tracks dependencies)
watchEffect(() => {
  console.log('User name changed:', user.name)
})

// Computed
const fullAddress = computed(() => {
  const { street, city, country } = user.address
  return `${street}, ${city}, ${country}`
})

// Expose methods to parent (when using <script setup>)
defineExpose({
  fetchUser,
  updateUser
})

// Auto-fetch on mount
fetchUser()
</script>

<template>
  <div class="user-profile">
    <div v-if="loading">Loading...</div>
    <div v-else-if="error">Error: {{ error }}</div>
    <div v-else>
      <h2>{{ user.name }}</h2>

      <form v-if="editable" @submit.prevent="updateUser">
        <div>
          <label>Name:</label>
          <input v-model="user.name" type="text" />
        </div>

        <div>
          <label>Email:</label>
          <input v-model="user.email" type="email" />
        </div>

        <div>
          <label>Age:</label>
          <input v-model.number="user.age" type="number" />
        </div>

        <button type="submit">Save</button>
        <button type="button" @click="deleteUser">Delete</button>
      </form>

      <div v-else>
        <p>Email: {{ user.email }}</p>
        <p>Age: {{ user.age }}</p>
        <p>Address: {{ fullAddress }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.user-profile {
  max-width: 600px;
  margin: 0 auto;
}

form div {
  margin-bottom: 15px;
}

label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}
</style>
```

### Composables (Reusable Logic)

```javascript
// composables/useFetch.js
import { ref, unref, watchEffect } from 'vue'

export function useFetch(url) {
  const data = ref(null)
  const error = ref(null)
  const loading = ref(false)

  const fetchData = async () => {
    loading.value = true
    error.value = null

    try {
      const response = await fetch(unref(url))
      data.value = await response.json()
    } catch (e) {
      error.value = e
    } finally {
      loading.value = false
    }
  }

  watchEffect(() => {
    fetchData()
  })

  return { data, error, loading, refetch: fetchData }
}

// composables/useLocalStorage.js
import { ref, watch } from 'vue'

export function useLocalStorage(key, defaultValue) {
  const storedValue = localStorage.getItem(key)
  const value = ref(storedValue ? JSON.parse(storedValue) : defaultValue)

  watch(
    value,
    (newValue) => {
      localStorage.setItem(key, JSON.stringify(newValue))
    },
    { deep: true }
  )

  return value
}

// composables/useCounter.js
import { ref, computed } from 'vue'

export function useCounter(initialValue = 0) {
  const count = ref(initialValue)

  const increment = () => count.value++
  const decrement = () => count.value--
  const reset = () => count.value = initialValue

  const double = computed(() => count.value * 2)
  const isEven = computed(() => count.value % 2 === 0)

  return {
    count,
    increment,
    decrement,
    reset,
    double,
    isEven
  }
}

// composables/useMousePosition.js
import { ref, onMounted, onUnmounted } from 'vue'

export function useMousePosition() {
  const x = ref(0)
  const y = ref(0)

  const update = (event) => {
    x.value = event.pageX
    y.value = event.pageY
  }

  onMounted(() => {
    window.addEventListener('mousemove', update)
  })

  onUnmounted(() => {
    window.removeEventListener('mousemove', update)
  })

  return { x, y }
}

// Usage in component
/*
<script setup>
import { useFetch } from '@/composables/useFetch'
import { useLocalStorage } from '@/composables/useLocalStorage'

const { data, loading, error } = useFetch('/api/users')
const settings = useLocalStorage('settings', { theme: 'light' })
</script>
*/
```

### Pinia State Management

```javascript
// stores/user.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// Option API style
export const useUserStoreOptions = defineStore('user', {
  state: () => ({
    users: [],
    currentUser: null,
    loading: false
  }),

  getters: {
    userCount: (state) => state.users.length,
    activeUsers: (state) => state.users.filter(u => u.active),
    getUserById: (state) => (id) => state.users.find(u => u.id === id)
  },

  actions: {
    async fetchUsers() {
      this.loading = true
      try {
        const response = await fetch('/api/users')
        this.users = await response.json()
      } finally {
        this.loading = false
      }
    },

    async addUser(user) {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      })
      const newUser = await response.json()
      this.users.push(newUser)
    },

    setCurrentUser(user) {
      this.currentUser = user
    }
  }
})

// Composition API style (recommended)
export const useUserStore = defineStore('user', () => {
  // State
  const users = ref([])
  const currentUser = ref(null)
  const loading = ref(false)

  // Getters
  const userCount = computed(() => users.value.length)
  const activeUsers = computed(() => users.value.filter(u => u.active))
  const getUserById = computed(() => {
    return (id) => users.value.find(u => u.id === id)
  })

  // Actions
  async function fetchUsers() {
    loading.value = true
    try {
      const response = await fetch('/api/users')
      users.value = await response.json()
    } finally {
      loading.value = false
    }
  }

  async function addUser(user) {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    })
    const newUser = await response.json()
    users.value.push(newUser)
  }

  function setCurrentUser(user) {
    currentUser.value = user
  }

  function $reset() {
    users.value = []
    currentUser.value = null
    loading.value = false
  }

  return {
    users,
    currentUser,
    loading,
    userCount,
    activeUsers,
    getUserById,
    fetchUsers,
    addUser,
    setCurrentUser,
    $reset
  }
})

// stores/cart.js
import { defineStore } from 'pinia'

export const useCartStore = defineStore('cart', {
  state: () => ({
    items: [],
    discount: 0
  }),

  getters: {
    subtotal: (state) => {
      return state.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    },
    total() {
      return this.subtotal - this.discount
    },
    itemCount: (state) => {
      return state.items.reduce((count, item) => count + item.quantity, 0)
    }
  },

  actions: {
    addItem(product) {
      const existingItem = this.items.find(i => i.id === product.id)
      if (existingItem) {
        existingItem.quantity++
      } else {
        this.items.push({ ...product, quantity: 1 })
      }
    },

    removeItem(productId) {
      const index = this.items.findIndex(i => i.id === productId)
      if (index > -1) {
        this.items.splice(index, 1)
      }
    },

    updateQuantity(productId, quantity) {
      const item = this.items.find(i => i.id === productId)
      if (item) {
        item.quantity = quantity
      }
    },

    applyDiscount(amount) {
      this.discount = amount
    },

    clear() {
      this.items = []
      this.discount = 0
    }
  },

  persist: true // With pinia-plugin-persistedstate
})

// Usage in component
/*
<script setup>
import { useUserStore } from '@/stores/user'
import { useCartStore } from '@/stores/cart'

const userStore = useUserStore()
const cartStore = useCartStore()

// Access state
console.log(userStore.users)

// Access getters
console.log(userStore.userCount)

// Call actions
userStore.fetchUsers()

// Destructure with storeToRefs
import { storeToRefs } from 'pinia'
const { users, currentUser } = storeToRefs(userStore)
const { fetchUsers } = userStore
</script>
*/
```

### Nuxt.js Application

```vue
<!-- pages/index.vue -->
<script setup>
// Auto-imported composables
const { data: posts, pending, error } = await useFetch('/api/posts')

// SEO metadata
useSeoMeta({
  title: 'My Blog',
  description: 'Welcome to my blog',
  ogImage: '/og-image.png'
})

// Head management
useHead({
  title: 'My Blog',
  meta: [
    { name: 'description', content: 'Welcome to my blog' }
  ]
})
</script>

<template>
  <div>
    <h1>Blog Posts</h1>

    <div v-if="pending">Loading...</div>
    <div v-else-if="error">Error: {{ error.message }}</div>
    <div v-else>
      <article v-for="post in posts" :key="post.id">
        <NuxtLink :to="`/posts/${post.id}`">
          <h2>{{ post.title }}</h2>
        </NuxtLink>
        <p>{{ post.excerpt }}</p>
      </article>
    </div>
  </div>
</template>

<!-- pages/posts/[id].vue -->
<script setup>
const route = useRoute()
const { id } = route.params

const { data: post } = await useAsyncData(
  `post-${id}`,
  () => $fetch(`/api/posts/${id}`)
)

// SSR-safe reactive data
const comments = ref([])

onMounted(async () => {
  const data = await $fetch(`/api/posts/${id}/comments`)
  comments.value = data
})
</script>

<template>
  <div>
    <article v-if="post">
      <h1>{{ post.title }}</h1>
      <div v-html="post.content"></div>
    </article>

    <section>
      <h2>Comments</h2>
      <div v-for="comment in comments" :key="comment.id">
        <p>{{ comment.text }}</p>
      </div>
    </section>
  </div>
</template>

<!-- composables/useAuth.ts (auto-imported) -->
<script setup lang="ts">
export const useAuth = () => {
  const user = useState('user', () => null)
  const token = useCookie('auth-token')

  const login = async (credentials: any) => {
    const data = await $fetch('/api/auth/login', {
      method: 'POST',
      body: credentials
    })
    user.value = data.user
    token.value = data.token
  }

  const logout = () => {
    user.value = null
    token.value = null
  }

  return {
    user: readonly(user),
    login,
    logout
  }
}
</script>

<!-- server/api/posts.ts (Nuxt server route) -->
<script lang="ts">
export default defineEventHandler(async (event) => {
  const posts = await prisma.post.findMany()
  return posts
})
</script>

<!-- middleware/auth.ts -->
<script lang="ts">
export default defineNuxtRouteMiddleware((to, from) => {
  const { user } = useAuth()

  if (!user.value && to.path !== '/login') {
    return navigateTo('/login')
  }
})
</script>
```

## Best Practices

### Component Design
- Use Composition API for better code organization
- Keep components small and focused
- Extract reusable logic into composables
- Use TypeScript for type safety
- Properly define props and emits
- Use scoped styles to avoid CSS conflicts

### State Management
- Use Pinia for global state
- Keep local state in components when possible
- Normalize store data structures
- Use getters for derived state
- Handle async operations in actions
- Reset stores when needed

### Performance
- Use v-once for static content
- Implement virtual scrolling for long lists
- Lazy load components and routes
- Use keep-alive for component caching
- Optimize computed properties
- Debounce expensive operations

### Nuxt Best Practices
- Use auto-imports effectively
- Implement proper SEO metadata
- Use server routes for API endpoints
- Leverage middleware for auth/guards
- Configure proper caching strategies
- Use environment variables correctly

### Code Organization
- Follow Vue style guide
- Use consistent naming conventions
- Organize files by feature
- Keep composables pure and focused
- Document complex logic
- Write tests for components and composables

## Anti-Patterns

### Reactivity Issues
- Mutating props directly
- Losing reactivity with destructuring
- Not using toRefs correctly
- Mixing ref and reactive inconsistently
- Creating unnecessary reactive objects
- Deep watching everything

### Component Anti-Patterns
- God components with too much logic
- Prop drilling through many levels
- Not using provide/inject for deep passing
- Emitting too many events
- Over-abstracting components
- Mixing template and render functions unnecessarily

### State Management Issues
- Storing everything in global state
- Directly mutating state outside actions
- Not handling loading/error states
- Creating circular dependencies
- Overusing watchers instead of computed
- Not cleaning up side effects

### Performance Problems
- Not using v-show vs v-if appropriately
- Creating new functions in templates
- Excessive watchers
- Not using key properly in v-for
- Loading all data upfront
- Not implementing pagination

### Nuxt Mistakes
- Mixing client and server code incorrectly
- Not handling SSR hydration properly
- Ignoring auto-import naming conventions
- Overusing middleware
- Not configuring proper error handling
- Missing SEO optimizations

## Resources

### Official Documentation
- [Vue.js 3 Guide](https://vuejs.org/guide/)
- [Vue API Reference](https://vuejs.org/api/)
- [Pinia Documentation](https://pinia.vuejs.org/)
- [Nuxt 3 Documentation](https://nuxt.com/docs)

### Learning Resources
- [Vue Mastery](https://www.vuemastery.com/)
- [Vue School](https://vueschool.io/)
- [Composition API FAQ](https://vuejs.org/guide/extras/composition-api-faq.html)

### Tools and Libraries
- [VueUse](https://vueuse.org/) - Collection of composables
- [Vite](https://vitejs.dev/) - Build tool
- [Vue DevTools](https://devtools.vuejs.org/)
- [Vitest](https://vitest.dev/) - Testing framework

### Community
- [Vue Forum](https://forum.vuejs.org/)
- [Discord](https://discord.com/invite/vue)
- [GitHub Discussions](https://github.com/vuejs/core/discussions)
- [Awesome Vue](https://github.com/vuejs/awesome-vue)

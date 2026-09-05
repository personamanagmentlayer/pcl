# Next.js Expert — Code Examples

Reference material for the `nextjs-expert` skill. See [SKILL.md](../SKILL.md).

## Code Examples

### Installation and Setup

```bash
# Create new Next.js app
npx create-next-app@latest my-app
cd my-app

# Or with specific options
npx create-next-app@latest my-app --typescript --tailwind --app --src-dir

# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Install additional packages
npm install prisma @prisma/client
npm install next-auth
npm install zod
npm install react-hook-form
npm install @tanstack/react-query

# Environment setup
# Create .env.local file
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"
```

### App Router Structure

```typescript
// app/layout.tsx (Root Layout)
import './globals.css'
import { Inter } from 'next/font/google'
import type { Metadata } from 'next'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'My App',
    template: '%s | My App'
  },
  description: 'My Next.js application',
  keywords: ['Next.js', 'React', 'TypeScript'],
  authors: [{ name: 'Your Name' }],
  openGraph: {
    title: 'My App',
    description: 'My Next.js application',
    images: ['/og-image.png']
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <nav className="navbar">
          <a href="/">Home</a>
          <a href="/about">About</a>
          <a href="/blog">Blog</a>
        </nav>
        <main>{children}</main>
        <footer>© 2024 My App</footer>
      </body>
    </html>
  )
}

// app/page.tsx (Home Page - Server Component by default)
import { Suspense } from 'react'
import { getPosts } from '@/lib/posts'

async function Posts() {
  const posts = await getPosts()

  return (
    <div className="grid">
      {posts.map(post => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <p>{post.excerpt}</p>
          <a href={`/blog/${post.slug}`}>Read more</a>
        </article>
      ))}
    </div>
  )
}

export default function Home() {
  return (
    <div>
      <h1>Welcome to My Blog</h1>
      <Suspense fallback={<div>Loading posts...</div>}>
        <Posts />
      </Suspense>
    </div>
  )
}

// app/blog/[slug]/page.tsx (Dynamic Route)
import { notFound } from 'next/navigation'
import { getPost, getAllPosts } from '@/lib/posts'
import type { Metadata } from 'next'

interface Props {
  params: { slug: string }
  searchParams: { [key: string]: string | string[] | undefined }
}

// Generate metadata for SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPost(params.slug)

  if (!post) {
    return {}
  }

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: [post.coverImage]
    }
  }
}

// Generate static paths at build time
export async function generateStaticParams() {
  const posts = await getAllPosts()

  return posts.map(post => ({
    slug: post.slug
  }))
}

export default async function BlogPost({ params }: Props) {
  const post = await getPost(params.slug)

  if (!post) {
    notFound()
  }

  return (
    <article>
      <h1>{post.title}</h1>
      <time dateTime={post.publishedAt}>
        {new Date(post.publishedAt).toLocaleDateString()}
      </time>
      <div dangerouslySetInnerHTML={{ __html: post.content }} />
    </article>
  )
}

// app/blog/[slug]/not-found.tsx
export default function NotFound() {
  return (
    <div>
      <h2>Post Not Found</h2>
      <p>The blog post you're looking for doesn't exist.</p>
    </div>
  )
}

// app/blog/[slug]/loading.tsx
export default function Loading() {
  return <div>Loading post...</div>
}

// app/blog/[slug]/error.tsx
'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <p>{error.message}</p>
      <button onClick={() => reset()}>Try again</button>
    </div>
  )
}
```

### Server and Client Components

```typescript
// components/ServerComponent.tsx (Server Component - default)
import { headers, cookies } from 'next/headers'
import { db } from '@/lib/db'

export default async function ServerComponent() {
  // Can access server-only APIs
  const headersList = headers()
  const cookieStore = cookies()

  // Direct database access
  const users = await db.user.findMany()

  // Can use async/await
  const data = await fetch('https://api.example.com/data', {
    next: { revalidate: 3600 } // Revalidate every hour
  })

  return (
    <div>
      <h2>Server Component</h2>
      <ul>
        {users.map(user => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  )
}

// components/ClientComponent.tsx (Client Component)
'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

export default function ClientComponent() {
  const [count, setCount] = useState(0)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    console.log('Client-side effect')
  }, [])

  const handleClick = () => {
    setCount(count + 1)
    router.push('/about')
  }

  return (
    <div>
      <h2>Client Component</h2>
      <p>Count: {count}</p>
      <p>Current path: {pathname}</p>
      <button onClick={handleClick}>Click me</button>
    </div>
  )
}

// components/HybridComponent.tsx (Server Component with Client Components)
import { Suspense } from 'react'
import ClientComponent from './ClientComponent'
import AnotherServerComponent from './AnotherServerComponent'

export default async function HybridComponent() {
  const data = await fetchData()

  return (
    <div>
      {/* Server-rendered content */}
      <h1>{data.title}</h1>

      {/* Client component for interactivity */}
      <ClientComponent />

      {/* Another server component */}
      <Suspense fallback={<div>Loading...</div>}>
        <AnotherServerComponent />
      </Suspense>
    </div>
  )
}
```

### Data Fetching and Caching

```typescript
// lib/data.ts
// Server-side data fetching with caching

// Revalidate every hour
export async function getProducts() {
  const res = await fetch('https://api.example.com/products', {
    next: { revalidate: 3600 }
  })

  if (!res.ok) {
    throw new Error('Failed to fetch products')
  }

  return res.json()
}

// Never cache (always fresh)
export async function getCurrentUser() {
  const res = await fetch('https://api.example.com/user', {
    cache: 'no-store'
  })

  return res.json()
}

// Cache forever
export async function getStaticData() {
  const res = await fetch('https://api.example.com/static', {
    cache: 'force-cache'
  })

  return res.json()
}

// Database queries with caching
import { unstable_cache } from 'next/cache'
import { db } from './db'

export const getCachedPosts = unstable_cache(
  async () => {
    return db.post.findMany({
      orderBy: { publishedAt: 'desc' }
    })
  },
  ['posts'],
  {
    revalidate: 3600,
    tags: ['posts']
  }
)

// Manual cache revalidation
import { revalidateTag, revalidatePath } from 'next/cache'

export async function createPost(data: any) {
  const post = await db.post.create({ data })

  // Revalidate specific cache tag
  revalidateTag('posts')

  // Or revalidate specific path
  revalidatePath('/blog')

  return post
}

// app/products/page.tsx
export default async function ProductsPage() {
  const products = await getProducts()

  return (
    <div>
      {products.map(product => (
        <div key={product.id}>{product.name}</div>
      ))}
    </div>
  )
}

// Parallel data fetching
async function getUser(id: string) {
  const res = await fetch(`https://api.example.com/users/${id}`)
  return res.json()
}

async function getPosts(userId: string) {
  const res = await fetch(`https://api.example.com/users/${userId}/posts`)
  return res.json()
}

export default async function UserPage({ params }: { params: { id: string } }) {
  // Fetches run in parallel
  const [user, posts] = await Promise.all([
    getUser(params.id),
    getPosts(params.id)
  ])

  return (
    <div>
      <h1>{user.name}</h1>
      {posts.map(post => (
        <div key={post.id}>{post.title}</div>
      ))}
    </div>
  )
}
```

### Server Actions

```typescript
// app/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { z } from 'zod'

// Define schema
const PostSchema = z.object({
  title: z.string().min(1).max(100),
  content: z.string().min(1),
  published: z.boolean().default(false)
})

// Server action for form submission
export async function createPost(formData: FormData) {
  // Validate input
  const validatedFields = PostSchema.safeParse({
    title: formData.get('title'),
    content: formData.get('content'),
    published: formData.get('published') === 'on'
  })

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid fields'
    }
  }

  const { title, content, published } = validatedFields.data

  try {
    // Create post in database
    await db.post.create({
      data: {
        title,
        content,
        published
      }
    })

    // Revalidate cache
    revalidatePath('/blog')

    // Redirect to blog
    redirect('/blog')
  } catch (error) {
    return {
      message: 'Database error: Failed to create post'
    }
  }
}

// Server action with return data
export async function updatePost(id: string, formData: FormData) {
  const post = await db.post.update({
    where: { id },
    data: {
      title: formData.get('title') as string,
      content: formData.get('content') as string
    }
  })

  revalidatePath(`/blog/${post.slug}`)

  return { success: true, post }
}

// Server action for deletion
export async function deletePost(id: string) {
  await db.post.delete({ where: { id } })
  revalidatePath('/blog')
  redirect('/blog')
}

// components/PostForm.tsx
'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { createPost } from '@/app/actions'

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Creating...' : 'Create Post'}
    </button>
  )
}

export default function PostForm() {
  const [state, formAction] = useFormState(createPost, {
    errors: {},
    message: ''
  })

  return (
    <form action={formAction}>
      <div>
        <label htmlFor="title">Title</label>
        <input id="title" name="title" type="text" required />
        {state.errors?.title && (
          <p className="error">{state.errors.title}</p>
        )}
      </div>

      <div>
        <label htmlFor="content">Content</label>
        <textarea id="content" name="content" required />
        {state.errors?.content && (
          <p className="error">{state.errors.content}</p>
        )}
      </div>

      <div>
        <label>
          <input type="checkbox" name="published" />
          Publish immediately
        </label>
      </div>

      {state.message && <p className="error">{state.message}</p>}

      <SubmitButton />
    </form>
  )
}
```

### API Routes (Route Handlers)

```typescript
// app/api/posts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

// GET /api/posts
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');

  const posts = await db.post.findMany({
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(posts);
}

// POST /api/posts
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const schema = z.object({
      title: z.string(),
      content: z.string(),
    });

    const { title, content } = schema.parse(body);

    const post = await db.post.create({
      data: { title, content },
    });

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// app/api/posts/[id]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const post = await db.post.findUnique({
    where: { id: params.id },
  });

  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  return NextResponse.json(post);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json();

  const post = await db.post.update({
    where: { id: params.id },
    data: body,
  });

  return NextResponse.json(post);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  await db.post.delete({
    where: { id: params.id },
  });

  return new NextResponse(null, { status: 204 });
}

// Middleware-style route handler
import { headers, cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const headersList = headers();
  const cookieStore = cookies();

  const token = headersList.get('authorization');
  const sessionCookie = cookieStore.get('session');

  // Validate authentication
  if (!token || !sessionCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Process request...
  return NextResponse.json({ data: 'Protected data' });
}
```

### Middleware and Authentication

```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Check authentication
  const token = request.cookies.get('token')

  if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Add custom header
  const response = NextResponse.next()
  response.headers.set('x-custom-header', 'value')

  return response
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)'
  ]
}

// lib/auth.ts (NextAuth example)
import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { db } from './db'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!
    })
  ],
  callbacks: {
    async session({ session, user }) {
      session.user.id = user.id
      return session
    }
  }
})

// app/api/auth/[...nextauth]/route.ts
import { handlers } from '@/lib/auth'

export const { GET, POST } = handlers

// components/SignInButton.tsx
'use client'

import { signIn, signOut, useSession } from 'next-auth/react'

export default function SignInButton() {
  const { data: session } = useSession()

  if (session) {
    return (
      <div>
        <p>Signed in as {session.user?.email}</p>
        <button onClick={() => signOut()}>Sign out</button>
      </div>
    )
  }

  return <button onClick={() => signIn()}>Sign in</button>
}
```

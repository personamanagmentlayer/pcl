# Remix Expert — Code Examples

Reference material for the `remix-expert` skill. See [SKILL.md](../SKILL.md).

## Code Examples

### Installation and Setup

```bash
# Create new Remix app
npx create-remix@latest my-app
cd my-app

# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npm run typecheck

# Install additional packages
npm install @prisma/client
npm install bcryptjs
npm install zod
npm install tiny-invariant

# Database setup (if using Prisma)
npx prisma init
npx prisma db push
npx prisma generate
```

### Basic Route Structure

```typescript
// app/root.tsx (Root layout)
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData
} from '@remix-run/react'
import type { LinksFunction, LoaderFunctionArgs } from '@remix-run/node'
import { json } from '@remix-run/node'

import stylesheet from '~/styles/tailwind.css'

export const links: LinksFunction = () => [
  { rel: 'stylesheet', href: stylesheet }
]

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getUser(request)

  return json({
    user,
    ENV: {
      PUBLIC_API_URL: process.env.PUBLIC_API_URL
    }
  })
}

export default function App() {
  const { user, ENV } = useLoaderData<typeof loader>()

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <nav>
          <a href="/">Home</a>
          <a href="/blog">Blog</a>
          {user ? (
            <>
              <a href="/dashboard">Dashboard</a>
              <form method="post" action="/logout">
                <button type="submit">Logout</button>
              </form>
            </>
          ) : (
            <a href="/login">Login</a>
          )}
        </nav>

        <Outlet />

        <script
          dangerouslySetInnerHTML={{
            __html: `window.ENV = ${JSON.stringify(ENV)}`
          }}
        />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  )
}

// Error boundary
export function ErrorBoundary() {
  return (
    <html>
      <head>
        <title>Oops!</title>
        <Meta />
        <Links />
      </head>
      <body>
        <h1>Something went wrong</h1>
        <Scripts />
      </body>
    </html>
  )
}

// app/routes/_index.tsx (Index route)
import type { MetaFunction, LoaderFunctionArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'

export const meta: MetaFunction = () => {
  return [
    { title: 'My App' },
    { name: 'description', content: 'Welcome to my app!' }
  ]
}

export async function loader({ request }: LoaderFunctionArgs) {
  const posts = await getPosts()

  return json({ posts })
}

export default function Index() {
  const { posts } = useLoaderData<typeof loader>()

  return (
    <div>
      <h1>Welcome to My App</h1>

      <div className="posts">
        {posts.map(post => (
          <article key={post.id}>
            <h2>
              <a href={`/blog/${post.slug}`}>{post.title}</a>
            </h2>
            <p>{post.excerpt}</p>
          </article>
        ))}
      </div>
    </div>
  )
}
```

### Nested Routing and Layouts

```typescript
// app/routes/blog.tsx (Parent layout)
import { Outlet, useLoaderData } from '@remix-run/react'
import type { LoaderFunctionArgs } from '@remix-run/node'
import { json } from '@remix-run/node'

export async function loader({ request }: LoaderFunctionArgs) {
  const categories = await getCategories()

  return json({ categories })
}

export default function BlogLayout() {
  const { categories } = useLoaderData<typeof loader>()

  return (
    <div className="blog-layout">
      <aside>
        <h3>Categories</h3>
        <ul>
          {categories.map(category => (
            <li key={category.id}>
              <a href={`/blog/category/${category.slug}`}>
                {category.name}
              </a>
            </li>
          ))}
        </ul>
      </aside>

      <main>
        {/* Child routes render here */}
        <Outlet />
      </main>
    </div>
  )
}

// app/routes/blog._index.tsx (Blog index - note the _ prefix)
import { useLoaderData } from '@remix-run/react'
import type { LoaderFunctionArgs } from '@remix-run/node'
import { json } from '@remix-run/node'

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get('page') || '1')

  const { posts, totalPages } = await getPosts({ page })

  return json({ posts, page, totalPages })
}

export default function BlogIndex() {
  const { posts, page, totalPages } = useLoaderData<typeof loader>()

  return (
    <div>
      <h1>All Posts</h1>

      {posts.map(post => (
        <article key={post.id}>
          <h2>
            <a href={`/blog/${post.slug}`}>{post.title}</a>
          </h2>
          <p>{post.excerpt}</p>
        </article>
      ))}

      <div className="pagination">
        {page > 1 && (
          <a href={`/blog?page=${page - 1}`}>Previous</a>
        )}
        <span>Page {page} of {totalPages}</span>
        {page < totalPages && (
          <a href={`/blog?page=${page + 1}`}>Next</a>
        )}
      </div>
    </div>
  )
}

// app/routes/blog.$slug.tsx (Dynamic blog post route)
import { json, redirect } from '@remix-run/node'
import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import invariant from 'tiny-invariant'

export async function loader({ params }: LoaderFunctionArgs) {
  invariant(params.slug, 'slug is required')

  const post = await getPost(params.slug)

  if (!post) {
    throw new Response('Not Found', { status: 404 })
  }

  return json({ post })
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data) {
    return [{ title: 'Post Not Found' }]
  }

  return [
    { title: data.post.title },
    { name: 'description', content: data.post.excerpt },
    { property: 'og:title', content: data.post.title },
    { property: 'og:image', content: data.post.coverImage }
  ]
}

export default function BlogPost() {
  const { post } = useLoaderData<typeof loader>()

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

// 404 handling
export function CatchBoundary() {
  return (
    <div>
      <h1>Post Not Found</h1>
      <p>The blog post you're looking for doesn't exist.</p>
      <a href="/blog">Back to Blog</a>
    </div>
  )
}

// Pathless layout (groups routes without affecting URL)
// app/routes/__auth.tsx
export default function AuthLayout() {
  return (
    <div className="auth-layout">
      <Outlet />
    </div>
  )
}

// app/routes/__auth.login.tsx
// URL: /login (pathless layout doesn't add to URL)
```

### Loaders and Data Fetching

```typescript
// app/routes/dashboard.tsx
import { json, redirect } from '@remix-run/node'
import type { LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { requireUser } from '~/utils/auth.server'

export async function loader({ request }: LoaderFunctionArgs) {
  // Authentication check
  const user = await requireUser(request)

  // Parallel data fetching
  const [stats, recentActivity, notifications] = await Promise.all([
    getStats(user.id),
    getRecentActivity(user.id),
    getNotifications(user.id)
  ])

  return json({
    user,
    stats,
    recentActivity,
    notifications
  })
}

export default function Dashboard() {
  const { user, stats, recentActivity, notifications } =
    useLoaderData<typeof loader>()

  return (
    <div className="dashboard">
      <h1>Welcome, {user.name}</h1>

      <div className="stats">
        <div>Posts: {stats.posts}</div>
        <div>Comments: {stats.comments}</div>
        <div>Followers: {stats.followers}</div>
      </div>

      <div className="recent">
        <h2>Recent Activity</h2>
        {recentActivity.map(activity => (
          <div key={activity.id}>{activity.description}</div>
        ))}
      </div>

      <div className="notifications">
        <h2>Notifications</h2>
        {notifications.map(notification => (
          <div key={notification.id}>{notification.message}</div>
        ))}
      </div>
    </div>
  )
}

// Loader with query parameters
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const search = url.searchParams.get('q') || ''
  const category = url.searchParams.get('category')
  const sort = url.searchParams.get('sort') || 'date'

  const posts = await searchPosts({
    search,
    category,
    sort
  })

  return json({ posts, search, category, sort })
}

// Conditional data loading
export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getUser(request)

  // Only fetch admin data if user is admin
  const adminData = user?.isAdmin
    ? await getAdminData()
    : null

  return json({ user, adminData })
}
```

### Actions and Form Handling

```typescript
// app/routes/posts.new.tsx
import { json, redirect } from '@remix-run/node'
import type { ActionFunctionArgs } from '@remix-run/node'
import { Form, useActionData, useNavigation } from '@remix-run/react'
import { z } from 'zod'

const PostSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  content: z.string().min(1, 'Content is required'),
  published: z.boolean()
})

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData()

  // Parse and validate form data
  const result = PostSchema.safeParse({
    title: formData.get('title'),
    content: formData.get('content'),
    published: formData.get('published') === 'on'
  })

  if (!result.success) {
    return json(
      {
        errors: result.error.flatten().fieldErrors,
        values: Object.fromEntries(formData)
      },
      { status: 400 }
    )
  }

  const { title, content, published } = result.data

  try {
    const post = await createPost({
      title,
      content,
      published
    })

    return redirect(`/posts/${post.slug}`)
  } catch (error) {
    return json(
      {
        errors: { _form: ['Failed to create post'] },
        values: { title, content, published }
      },
      { status: 500 }
    )
  }
}

export default function NewPost() {
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()

  const isSubmitting = navigation.state === 'submitting'

  return (
    <div>
      <h1>Create New Post</h1>

      <Form method="post">
        <div>
          <label htmlFor="title">Title</label>
          <input
            id="title"
            name="title"
            type="text"
            defaultValue={actionData?.values?.title}
            required
          />
          {actionData?.errors?.title && (
            <p className="error">{actionData.errors.title[0]}</p>
          )}
        </div>

        <div>
          <label htmlFor="content">Content</label>
          <textarea
            id="content"
            name="content"
            defaultValue={actionData?.values?.content}
            required
          />
          {actionData?.errors?.content && (
            <p className="error">{actionData.errors.content[0]}</p>
          )}
        </div>

        <div>
          <label>
            <input
              type="checkbox"
              name="published"
              defaultChecked={actionData?.values?.published}
            />
            Publish immediately
          </label>
        </div>

        {actionData?.errors?._form && (
          <p className="error">{actionData.errors._form[0]}</p>
        )}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Post'}
        </button>
      </Form>
    </div>
  )
}

// Multiple actions in one route
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData()
  const intent = formData.get('intent')

  switch (intent) {
    case 'create':
      return handleCreate(formData)
    case 'update':
      return handleUpdate(formData)
    case 'delete':
      return handleDelete(formData)
    default:
      throw new Response('Invalid intent', { status: 400 })
  }
}

// Optimistic UI
import { useFetcher } from '@remix-run/react'

export default function TodoItem({ todo }) {
  const fetcher = useFetcher()

  const isCompleted =
    fetcher.formData?.get('completed') === 'true'
      ? true
      : fetcher.formData?.get('completed') === 'false'
      ? false
      : todo.completed

  return (
    <fetcher.Form method="post" action={`/todos/${todo.id}`}>
      <input
        type="checkbox"
        name="completed"
        value="true"
        checked={isCompleted}
        onChange={e => fetcher.submit(e.currentTarget.form)}
      />
      <span style={{ textDecoration: isCompleted ? 'line-through' : 'none' }}>
        {todo.title}
      </span>
    </fetcher.Form>
  )
}
```

### Resource Routes (API Endpoints)

```typescript
// app/routes/api.posts.tsx
import { json } from '@remix-run/node';
import type { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/node';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '10');

  const posts = await getPosts({ page, limit });

  return json(posts, {
    headers: {
      'Cache-Control': 'public, max-age=300',
    },
  });
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method === 'POST') {
    const body = await request.json();
    const post = await createPost(body);
    return json(post, { status: 201 });
  }

  return json({ error: 'Method not allowed' }, { status: 405 });
}

// app/routes/api.posts.$id.tsx
export async function loader({ params }: LoaderFunctionArgs) {
  const post = await getPost(params.id!);

  if (!post) {
    throw new Response('Not Found', { status: 404 });
  }

  return json(post);
}

export async function action({ request, params }: ActionFunctionArgs) {
  const method = request.method;

  switch (method) {
    case 'PUT': {
      const body = await request.json();
      const post = await updatePost(params.id!, body);
      return json(post);
    }
    case 'DELETE': {
      await deletePost(params.id!);
      return new Response(null, { status: 204 });
    }
    default:
      return json({ error: 'Method not allowed' }, { status: 405 });
  }
}

// Webhook endpoint
// app/routes/webhooks.stripe.tsx
import type { ActionFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';

export async function action({ request }: ActionFunctionArgs) {
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return json({ error: 'No signature' }, { status: 400 });
  }

  const payload = await request.text();

  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object);
        break;
      case 'payment_intent.failed':
        await handlePaymentFailure(event.data.object);
        break;
    }

    return json({ received: true });
  } catch (error) {
    return json({ error: 'Invalid signature' }, { status: 400 });
  }
}
```

### Session and Cookie Management

```typescript
// app/utils/session.server.ts
import { createCookieSessionStorage } from '@remix-run/node';

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  throw new Error('SESSION_SECRET must be set');
}

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: '__session',
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secrets: [sessionSecret],
    secure: process.env.NODE_ENV === 'production',
  },
});

export async function createUserSession(userId: string, redirectTo: string) {
  const session = await sessionStorage.getSession();
  session.set('userId', userId);

  return redirect(redirectTo, {
    headers: {
      'Set-Cookie': await sessionStorage.commitSession(session, {
        maxAge: 60 * 60 * 24 * 30, // 30 days
      }),
    },
  });
}

export async function getUserSession(request: Request) {
  return sessionStorage.getSession(request.headers.get('Cookie'));
}

export async function getUserId(request: Request) {
  const session = await getUserSession(request);
  const userId = session.get('userId');
  return userId;
}

export async function requireUserId(
  request: Request,
  redirectTo: string = new URL(request.url).pathname
) {
  const userId = await getUserId(request);

  if (!userId) {
    const searchParams = new URLSearchParams([['redirectTo', redirectTo]]);
    throw redirect(`/login?${searchParams}`);
  }

  return userId;
}

export async function logout(request: Request) {
  const session = await getUserSession(request);

  return redirect('/login', {
    headers: {
      'Set-Cookie': await sessionStorage.destroySession(session),
    },
  });
}

// Flash messages
export async function setFlashMessage(
  session: any,
  message: { type: string; text: string }
) {
  session.flash('message', message);
}

export async function getFlashMessage(session: any) {
  return session.get('message');
}

// Usage in routes
import { commitSession, getSession } from '~/utils/session.server';

export async function action({ request }: ActionFunctionArgs) {
  const session = await getSession(request.headers.get('Cookie'));

  // Set flash message
  session.flash('message', {
    type: 'success',
    text: 'Post created successfully!',
  });

  return redirect('/posts', {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get('Cookie'));
  const message = session.get('message');

  return json(
    { message },
    {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    }
  );
}
```

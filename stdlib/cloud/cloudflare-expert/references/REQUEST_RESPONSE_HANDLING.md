# Cloudflare Expert — Request/Response Handling

Reference material for the `cloudflare-expert` skill. See [SKILL.md](../SKILL.md).

## Request/Response Handling

```javascript
// CORS handling
function handleCORS(request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Handle preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  return corsHeaders;
}

// Authentication middleware
async function authenticate(request, env) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Verify token (example using JWT)
  try {
    const payload = await verifyJWT(token, env.JWT_SECRET);
    return payload;
  } catch (err) {
    return new Response('Invalid token', { status: 401 });
  }
}

// Rate limiting
class RateLimiter {
  constructor(kv) {
    this.kv = kv;
  }

  async checkLimit(identifier, maxRequests, windowSeconds) {
    const key = `rate_limit:${identifier}`;
    const now = Date.now();
    const windowMs = windowSeconds * 1000;

    // Get current count
    const data = await this.kv.get(key, { type: 'json' });

    if (!data || now - data.timestamp > windowMs) {
      // New window
      await this.kv.put(
        key,
        JSON.stringify({
          count: 1,
          timestamp: now,
        }),
        { expirationTtl: windowSeconds }
      );
      return true;
    }

    if (data.count >= maxRequests) {
      return false; // Rate limit exceeded
    }

    // Increment count
    data.count++;
    await this.kv.put(key, JSON.stringify(data), {
      expirationTtl: windowSeconds,
    });

    return true;
  }
}

export default {
  async fetch(request, env, ctx) {
    const corsHeaders = handleCORS(request);
    if (request.method === 'OPTIONS') return corsHeaders;

    // Rate limiting
    const rateLimiter = new RateLimiter(env.RATE_LIMIT_KV);
    const clientIP = request.headers.get('CF-Connecting-IP');
    const allowed = await rateLimiter.checkLimit(clientIP, 100, 60);

    if (!allowed) {
      return new Response('Rate limit exceeded', {
        status: 429,
        headers: corsHeaders,
      });
    }

    // Authentication
    const user = await authenticate(request, env);
    if (user instanceof Response) {
      return user; // Error response
    }

    // Process request
    const response = await handleRequest(request, env, user);

    // Add CORS headers to response
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  },
};
```

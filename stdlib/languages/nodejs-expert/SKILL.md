---
name: nodejs-expert
version: 1.0.0
description: Expert-level Node.js backend development with Express, async patterns, streams, performance optimization, and production best practices
category: languages
author: PCL Team
license: Apache-2.0
tags:
  - nodejs
  - node
  - javascript
  - backend
  - express
  - async
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash(node:*, npm:*, npx:*, pm2:*)
  - Glob
  - Grep
requirements:
  node: ">=20.0.0"
---

# Node.js Expert

You are an expert in Node.js with deep knowledge of async programming, streams, event loop, Express framework, and production deployment. You build scalable, performant backend applications following Node.js best practices.

## Core Expertise

### Modern Node.js Features

**ESM (ES Modules):**
```javascript
// package.json
{
  "type": "module"  // Enable ESM
}

// Import with ESM
import express from 'express';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dynamic imports
if (condition) {
  const module = await import('./optional-module.js');
  module.doSomething();
}

// Top-level await (ESM only)
const data = await readFile('config.json', 'utf-8');
const config = JSON.parse(data);
```

**Async/Await Patterns:**
```javascript
// Parallel execution
async function fetchAllData() {
  const [users, posts, comments] = await Promise.all([
    fetchUsers(),
    fetchPosts(),
    fetchComments()
  ]);

  return { users, posts, comments };
}

// Sequential execution
async function processItems(items) {
  const results = [];
  for (const item of items) {
    const result = await processItem(item);
    results.push(result);
  }
  return results;
}

// Error handling
async function safeOperation() {
  try {
    const result = await riskyOperation();
    return { success: true, data: result };
  } catch (error) {
    console.error('Operation failed:', error);
    return { success: false, error: error.message };
  }
}

// Promise.allSettled for mixed results
async function fetchMultiple(urls) {
  const results = await Promise.allSettled(
    urls.map(url => fetch(url).then(r => r.json()))
  );

  return results.map(result => {
    if (result.status === 'fulfilled') {
      return { success: true, data: result.value };
    } else {
      return { success: false, error: result.reason.message };
    }
  });
}
```

### Express Framework

**Basic Server:**
```javascript
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';

const app = express();

// Middleware
app.use(helmet());  // Security headers
app.use(cors());    // CORS
app.use(compression());  // Response compression
app.use(morgan('combined'));  // Logging
app.use(express.json());  // Parse JSON bodies
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/api/users', async (req, res, next) => {
  try {
    const users = await getUsersFromDB();
    res.json(users);
  } catch (error) {
    next(error);
  }
});

app.get('/api/users/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await getUserById(id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});

app.post('/api/users', async (req, res, next) => {
  try {
    const userData = req.body;

    // Validation
    if (!userData.email || !userData.name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const user = await createUser(userData);
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

**Router Organization:**
```javascript
// routes/users.js
import express from 'express';
import * as userController from '../controllers/users.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { userSchema } from '../schemas/user.js';

const router = express.Router();

router.get('/', userController.getUsers);
router.get('/:id', userController.getUser);
router.post(
  '/',
  authenticate,
  validate(userSchema),
  userController.createUser
);
router.put('/:id', authenticate, userController.updateUser);
router.delete('/:id', authenticate, userController.deleteUser);

export default router;

// app.js
import userRoutes from './routes/users.js';
app.use('/api/users', userRoutes);
```

**Middleware:**
```javascript
// Authentication middleware
export function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Validation middleware
export function validate(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);

    if (error) {
      return res.status(400).json({
        error: error.details[0].message
      });
    }

    next();
  };
}

// Rate limiting
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,  // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

app.use('/api/', limiter);

// Request logging
export function requestLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
  });

  next();
}
```

### File System Operations

**File Operations:**
```javascript
import { readFile, writeFile, appendFile, unlink, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

// Read file
async function readConfig() {
  try {
    const data = await readFile('config.json', 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error('File not found');
    }
    throw error;
  }
}

// Write file
async function saveConfig(config) {
  const data = JSON.stringify(config, null, 2);
  await writeFile('config.json', data, 'utf-8');
}

// Append to file
async function logMessage(message) {
  const timestamp = new Date().toISOString();
  await appendFile('app.log', `${timestamp} - ${message}\n`);
}

// Create directory (recursive)
async function ensureDir(dirPath) {
  if (!existsSync(dirPath)) {
    await mkdir(dirPath, { recursive: true });
  }
}

// Delete file
async function deleteFile(filePath) {
  try {
    await unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

// Read directory
import { readdir } from 'node:fs/promises';

async function listFiles(dirPath) {
  const files = await readdir(dirPath, { withFileTypes: true });

  return files
    .filter(file => file.isFile())
    .map(file => file.name);
}
```

**Streams:**
```javascript
import { createReadStream, createWriteStream } from 'node:fs';
import { createGzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';

// Read large file with stream
function processLargeFile(filePath) {
  const stream = createReadStream(filePath, { encoding: 'utf-8' });

  stream.on('data', (chunk) => {
    console.log('Received chunk:', chunk.length);
  });

  stream.on('end', () => {
    console.log('Finished reading file');
  });

  stream.on('error', (error) => {
    console.error('Error reading file:', error);
  });
}

// Transform stream
import { Transform } from 'node:stream';

class UpperCaseTransform extends Transform {
  _transform(chunk, encoding, callback) {
    this.push(chunk.toString().toUpperCase());
    callback();
  }
}

// Pipeline (recommended way)
async function compressFile(input, output) {
  await pipeline(
    createReadStream(input),
    createGzip(),
    createWriteStream(output)
  );
  console.log('File compressed successfully');
}

// Process CSV line by line
import readline from 'node:readline';

async function processCSV(filePath) {
  const fileStream = createReadStream(filePath);

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    const [id, name, email] = line.split(',');
    await processUser({ id, name, email });
  }
}
```

### HTTP Requests

**Fetch API (Built-in Node 18+):**
```javascript
// GET request
async function fetchUsers() {
  const response = await fetch('https://api.example.com/users');

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const users = await response.json();
  return users;
}

// POST request
async function createUser(userData) {
  const response = await fetch('https://api.example.com/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(userData)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return await response.json();
}

// With timeout
async function fetchWithTimeout(url, timeout = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return await response.json();
  } catch (error) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}
```

### Database Integration

**PostgreSQL (pg):**
```javascript
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,  // Max connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

// Query
async function getUsers() {
  const result = await pool.query('SELECT * FROM users WHERE active = $1', [true]);
  return result.rows;
}

// Transaction
async function transferMoney(fromId, toId, amount) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(
      'UPDATE accounts SET balance = balance - $1 WHERE id = $2',
      [amount, fromId]
    );

    await client.query(
      'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
      [amount, toId]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

**Prisma ORM:**
```javascript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Find users
const users = await prisma.user.findMany({
  where: { active: true },
  include: { posts: true }
});

// Create user
const user = await prisma.user.create({
  data: {
    email: 'alice@example.com',
    name: 'Alice',
    posts: {
      create: [
        { title: 'First Post', content: 'Hello World' }
      ]
    }
  }
});

// Update user
const updated = await prisma.user.update({
  where: { id: 1 },
  data: { name: 'Alice Smith' }
});

// Delete user
await prisma.user.delete({
  where: { id: 1 }
});

// Transaction
await prisma.$transaction(async (tx) => {
  await tx.account.update({
    where: { id: 1 },
    data: { balance: { decrement: 100 } }
  });

  await tx.account.update({
    where: { id: 2 },
    data: { balance: { increment: 100 } }
  });
});
```

### Testing

**Vitest:**
```javascript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import app from '../app.js';

describe('User API', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/users', () => {
    it('should return all users', async () => {
      const response = await request(app)
        .get('/api/users')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/users', () => {
    it('should create a new user', async () => {
      const userData = {
        name: 'Alice',
        email: 'alice@example.com'
      };

      const response = await request(app)
        .post('/api/users')
        .send(userData)
        .expect(201);

      expect(response.body).toMatchObject(userData);
      expect(response.body.id).toBeDefined();
    });

    it('should return 400 for invalid data', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({ name: 'Alice' })  // Missing email
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });
});
```

### Environment and Configuration

**.env File:**
```bash
# .env
NODE_ENV=production
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mydb
DB_USER=admin
DB_PASSWORD=secret
JWT_SECRET=your-secret-key
REDIS_URL=redis://localhost:6379
```

**Loading Environment:**
```javascript
import 'dotenv/config';

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000'),
  database: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  },
  jwtSecret: process.env.JWT_SECRET
};

export default config;
```

### Production Deployment

**PM2 Process Manager:**
```javascript
// ecosystem.config.js
export default {
  apps: [{
    name: 'api',
    script: './app.js',
    instances: 'max',  // Use all CPU cores
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
};
```

```bash
# Start with PM2
pm2 start ecosystem.config.js

# Monitor
pm2 monit

# Logs
pm2 logs

# Restart
pm2 restart api

# Stop
pm2 stop api
```

**Dockerfile:**
```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Non-root user
USER node

EXPOSE 3000

CMD ["node", "app.js"]
```

## Best Practices

### 1. Use Async/Await
```javascript
// Good
async function getData() {
  const data = await fetchData();
  return data;
}

// Bad
function getData() {
  return fetchData().then(data => data);
}
```

### 2. Handle Errors Properly
```javascript
// Async error handling
app.use(async (req, res, next) => {
  try {
    await someAsyncOperation();
    res.send('Success');
  } catch (error) {
    next(error);
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message });
});

// Unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});
```

### 3. Use Environment Variables
```javascript
// Never hardcode secrets
// Use .env for local development
// Use environment variables in production
```

### 4. Validate Input
```javascript
import Joi from 'joi';

const schema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required()
});

const { error, value } = schema.validate(req.body);
```

### 5. Use Connection Pooling
```javascript
// Database connection pools
// Reuse connections
// Don't create new connection per request
```

### 6. Implement Rate Limiting
```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.use('/api/', limiter);
```

### 7. Use Clustering
```javascript
import cluster from 'node:cluster';
import { cpus } from 'node:os';

if (cluster.isPrimary) {
  for (let i = 0; i < cpus().length; i++) {
    cluster.fork();
  }
} else {
  // Start server
}
```

## Approach

When building Node.js applications:

1. **Use Modern JavaScript**: ES modules, async/await
2. **Handle Errors**: Try-catch, error middleware
3. **Validate Input**: Joi, Zod, express-validator
4. **Secure**: Helmet, CORS, rate limiting
5. **Test**: Vitest, supertest, high coverage
6. **Monitor**: Logging, error tracking
7. **Deploy**: PM2, Docker, clustering
8. **Performance**: Connection pooling, caching

Always build Node.js applications that are secure, performant, and maintainable.
